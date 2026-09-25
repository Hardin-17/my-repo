const Node = require('../models/Node');
const storageNodeService = require('./storageNodeService');
const { logActivity } = require('./activityService');
const { getDbStatus } = require('../config/db');

// Default initial nodes for hackathon cluster simulation
const INITIAL_NODES = [
  {
    nodeId: 'node-01',
    name: 'Storage Node 01 (US-East)',
    status: 'ONLINE',
    capacity: 100 * 1024 * 1024 * 1024, // 100 GB
    latency: 18,
    zone: 'us-east-1a',
    address: '10.240.0.11:8081',
  },
  {
    nodeId: 'node-02',
    name: 'Storage Node 02 (US-East)',
    status: 'ONLINE',
    capacity: 100 * 1024 * 1024 * 1024,
    latency: 22,
    zone: 'us-east-1b',
    address: '10.240.0.12:8081',
  },
  {
    nodeId: 'node-03',
    name: 'Storage Node 03 (US-West)',
    status: 'ONLINE',
    capacity: 100 * 1024 * 1024 * 1024,
    latency: 48,
    zone: 'us-west-2a',
    address: '10.240.1.21:8081',
  },
  {
    nodeId: 'node-04',
    name: 'Storage Node 04 (EU-West)',
    status: 'ONLINE',
    capacity: 100 * 1024 * 1024 * 1024,
    latency: 85,
    zone: 'eu-west-1a',
    address: '10.240.2.31:8081',
  },
  {
    nodeId: 'node-05',
    name: 'Storage Node 05 (AP-South)',
    status: 'ONLINE',
    capacity: 100 * 1024 * 1024 * 1024,
    latency: 120,
    zone: 'ap-south-1a',
    address: '10.240.3.41:8081',
  },
];

/**
 * Initializes default simulated nodes if they don't already exist.
 */
const initializeDefaultNodes = async () => {
  const dbStatus = getDbStatus();
  if (dbStatus.readyState !== 1) return;

  try {
    for (const nodeData of INITIAL_NODES) {
      // Ensure physical/logical directory exists on disk
      storageNodeService.getNodeDirectory(nodeData.nodeId);

      const exists = await Node.findOne({ nodeId: nodeData.nodeId });
      if (!exists) {
        await Node.create({
          ...nodeData,
          usedStorage: 0,
          availableStorage: nodeData.capacity,
          objectCount: 0,
          replicaCount: 0,
          lastHeartbeat: new Date(),
        });
        await logActivity({
          eventType: 'NODE_REGISTERED',
          message: `Storage node ${nodeData.nodeId} (${nodeData.name}) registered in zone ${nodeData.zone}`,
          nodeId: nodeData.nodeId,
          severity: 'INFO',
        });
        console.log(`[StorageNode] Initialized node: ${nodeData.nodeId}`);
      }
    }
  } catch (err) {
    console.error('[StorageNode] Error initializing default nodes:', err.message);
  }
};

const getAllNodes = async () => {
  return await Node.find().sort({ nodeId: 1 }).lean();
};

const getNodeById = async (nodeId) => {
  const node = await Node.findOne({ nodeId }).lean();
  if (!node) {
    const error = new Error(`Node ${nodeId} not found`);
    error.statusCode = 404;
    throw error;
  }
  return node;
};

const registerNode = async ({ nodeId, name, capacity, zone, address }) => {
  const existing = await Node.findOne({ nodeId });
  if (existing) {
    const error = new Error(`Node with ID ${nodeId} is already registered`);
    error.statusCode = 409;
    throw error;
  }

  // Ensure storage folder
  storageNodeService.getNodeDirectory(nodeId);

  const parsedCapacity = Number(capacity) || 100 * 1024 * 1024 * 1024;
  const node = await Node.create({
    nodeId,
    name: name || `Storage Node ${nodeId}`,
    capacity: parsedCapacity,
    availableStorage: parsedCapacity,
    usedStorage: 0,
    zone: zone || 'default-zone',
    address: address || '127.0.0.1',
    status: 'ONLINE',
    lastHeartbeat: new Date(),
  });

  await logActivity({
    eventType: 'NODE_REGISTERED',
    message: `Dynamic node ${nodeId} registered with ${Math.round(parsedCapacity / 1024 / 1024 / 1024)}GB capacity`,
    nodeId,
    severity: 'INFO',
  });

  return node;
};

const recordHeartbeat = async (nodeId) => {
  const node = await Node.findOne({ nodeId });
  if (!node) {
    const error = new Error(`Node ${nodeId} not found`);
    error.statusCode = 404;
    throw error;
  }

  node.lastHeartbeat = new Date();
  if (node.status === 'OFFLINE') {
    node.status = 'ONLINE';
  }
  await node.save();

  await logActivity({
    eventType: 'NODE_HEARTBEAT',
    message: `Heartbeat acknowledged from node ${nodeId} (status: ${node.status})`,
    nodeId,
    severity: 'INFO',
  });

  return node;
};

/**
 * Isolated Replica Placement Strategy:
 * 1. Filter nodes that are strictly 'ONLINE'
 * 2. Filter nodes with sufficient availableStorage for the object
 * 3. Sort nodes by availableStorage descending (capacity-aware distribution)
 * 4. Distinctly pick top N nodes corresponding to replicationFactor
 */
const selectNodesForPlacement = async (replicationFactor, objectSizeBytes) => {
  const onlineNodes = await Node.find({
    status: 'ONLINE',
    availableStorage: { $gte: objectSizeBytes },
  }).sort({ availableStorage: -1 });

  if (onlineNodes.length < replicationFactor) {
    const totalOnline = await Node.countDocuments({ status: 'ONLINE' });
    const error = new Error(
      `Insufficient healthy nodes for replication factor ${replicationFactor}. Available healthy nodes: ${totalOnline}`
    );
    error.statusCode = 400;
    throw error;
  }

  return onlineNodes.slice(0, replicationFactor);
};

const updateNodeMetrics = async (nodeId, { sizeDelta = 0, objectCountDelta = 0, replicaCountDelta = 0 }) => {
  const node = await Node.findOne({ nodeId });
  if (!node) return;

  node.usedStorage = Math.max(0, node.usedStorage + sizeDelta);
  node.availableStorage = Math.max(0, node.capacity - node.usedStorage);
  node.objectCount = Math.max(0, node.objectCount + objectCountDelta);
  node.replicaCount = Math.max(0, node.replicaCount + replicaCountDelta);

  await node.save();
};

/**
 * Background Heartbeat Simulation
 * Every 8 seconds, simulates minor latency variations and refreshes heartbeat for active nodes.
 */
let heartbeatInterval = null;

const startHeartbeatSimulation = () => {
  if (heartbeatInterval) return;

  heartbeatInterval = setInterval(async () => {
    try {
      const dbStatus = getDbStatus();
      if (dbStatus.readyState !== 1) return;

      const nodes = await Node.find({ status: { $ne: 'OFFLINE' } });
      const now = new Date();

      for (const node of nodes) {
        // Minor simulated jitter in latency (10ms - 50ms)
        const jitter = Math.floor(Math.random() * 8) - 4;
        node.latency = Math.max(5, node.latency + jitter);
        node.lastHeartbeat = now;
        await node.save();
      }
    } catch {
      // Background tick silent catch
    }
  }, 8000);
};

module.exports = {
  initializeDefaultNodes,
  getAllNodes,
  getNodeById,
  registerNode,
  recordHeartbeat,
  selectNodesForPlacement,
  updateNodeMetrics,
  startHeartbeatSimulation,
};
