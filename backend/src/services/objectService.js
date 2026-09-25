const crypto = require('crypto');
const path = require('path');
const VaultObject = require('../models/VaultObject');
const Node = require('../models/Node');
const storageNodeService = require('./storageNodeService');
const nodeService = require('./nodeService');
const { logActivity } = require('./activityService');
const config = require('../config/env');

/**
 * Sanitizes original filename to prevent malicious paths or characters
 */
const sanitizeFilename = (filename) => {
  const base = path.basename(filename || 'unnamed-file');
  return base.replace(/[^a-zA-Z0-9._-]/g, '_');
};

const uploadObject = async ({ file, ownerId, replicationFactor = 3 }) => {
  if (!file || !file.buffer) {
    const error = new Error('No file provided for upload');
    error.statusCode = 400;
    throw error;
  }

  // Validate file size limit
  const maxBytes = config.maxUploadSizeMb * 1024 * 1024;
  if (file.buffer.length > maxBytes) {
    const error = new Error(
      `File exceeds maximum permitted upload limit of ${config.maxUploadSizeMb} MB`
    );
    error.statusCode = 413;
    throw error;
  }

  // Validate replication factor
  const parsedRf = parseInt(replicationFactor, 10);
  if (isNaN(parsedRf) || parsedRf < 1 || parsedRf > 5) {
    const error = new Error('Replication factor must be an integer between 1 and 5');
    error.statusCode = 400;
    throw error;
  }

  // Calculate cryptographic SHA-256 checksum
  const checksum = crypto.createHash('sha256').update(file.buffer).digest('hex');

  // Generate unique object ID and storage key
  const objectId = `obj_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  const safeFilename = sanitizeFilename(file.originalname);
  const storageKey = `${objectId}/${safeFilename}`;

  // Select suitable distinct storage nodes
  const selectedNodes = await nodeService.selectNodesForPlacement(parsedRf, file.buffer.length);

  const replicas = [];

  // Write replica to each selected node directory
  for (const node of selectedNodes) {
    await storageNodeService.writeReplica(node.nodeId, storageKey, file.buffer);

    replicas.push({
      nodeId: node.nodeId,
      version: 1,
      checksum,
      size: file.buffer.length,
      status: 'HEALTHY',
      createdAt: new Date(),
    });

    // Update node capacity tracking
    await nodeService.updateNodeMetrics(node.nodeId, {
      sizeDelta: file.buffer.length,
      objectCountDelta: 1,
      replicaCountDelta: 1,
    });

    await logActivity({
      eventType: 'REPLICA_CREATED',
      message: `Replica of ${safeFilename} created on node ${node.nodeId}`,
      objectId,
      nodeId: node.nodeId,
      severity: 'INFO',
    });
  }

  // Save metadata in MongoDB
  const vaultObject = await VaultObject.create({
    objectId,
    ownerId,
    originalName: safeFilename,
    storageKey,
    mimeType: file.mimetype || 'application/octet-stream',
    size: file.buffer.length,
    checksum,
    version: 1,
    replicationFactor: parsedRf,
    replicas,
    status: 'HEALTHY',
  });

  await logActivity({
    eventType: 'OBJECT_UPLOADED',
    message: `Object "${safeFilename}" (${(file.buffer.length / 1024).toFixed(1)} KB) uploaded with ${parsedRf}x replication`,
    userId: ownerId,
    objectId,
    severity: 'INFO',
  });

  return vaultObject;
};

const listUserObjects = async (ownerId) => {
  return await VaultObject.find({ ownerId }).sort({ createdAt: -1 }).lean();
};

const getObjectById = async (objectId, ownerId) => {
  const obj = await VaultObject.findOne({ objectId }).lean();
  if (!obj) {
    const error = new Error(`Object with ID "${objectId}" was not found`);
    error.statusCode = 404;
    throw error;
  }

  // Verify ownership
  if (obj.ownerId.toString() !== ownerId.toString()) {
    const error = new Error('Access denied: You do not own this object');
    error.statusCode = 403;
    throw error;
  }

  return obj;
};

const getObjectReplicas = async (objectId, ownerId) => {
  const obj = await getObjectById(objectId, ownerId);
  const nodes = await Node.find().lean();
  const nodeMap = new Map(nodes.map((n) => [n.nodeId, n]));

  // Augment replicas with live node latency and health
  const enrichedReplicas = obj.replicas.map((rep) => {
    const node = nodeMap.get(rep.nodeId);
    return {
      ...rep,
      nodeName: node?.name || rep.nodeId,
      nodeStatus: node?.status || 'UNKNOWN',
      nodeLatency: node?.latency || 0,
      zone: node?.zone || 'unknown',
    };
  });

  return {
    objectId: obj.objectId,
    originalName: obj.originalName,
    checksum: obj.checksum,
    size: obj.size,
    replicationFactor: obj.replicationFactor,
    replicas: enrichedReplicas,
  };
};

const downloadObject = async (objectId, ownerId) => {
  const obj = await getObjectById(objectId, ownerId);

  // Find a healthy replica whose node is currently ONLINE
  const healthyReplica = obj.replicas.find((r) => r.status === 'HEALTHY');
  if (!healthyReplica) {
    const error = new Error('No healthy replica available for download');
    error.statusCode = 503;
    throw error;
  }

  // Check if replica file actually exists on logical disk
  const exists = await storageNodeService.replicaExists(healthyReplica.nodeId, obj.storageKey);
  if (!exists) {
    const error = new Error(`Replica file missing on node ${healthyReplica.nodeId}`);
    error.statusCode = 500;
    throw error;
  }

  const stream = storageNodeService.createReadStream(healthyReplica.nodeId, obj.storageKey);

  await logActivity({
    eventType: 'OBJECT_DOWNLOADED',
    message: `Object "${obj.originalName}" downloaded from replica on node ${healthyReplica.nodeId}`,
    userId: ownerId,
    objectId: obj.objectId,
    nodeId: healthyReplica.nodeId,
    severity: 'INFO',
  });

  return {
    stream,
    originalName: obj.originalName,
    mimeType: obj.mimeType,
    size: obj.size,
    checksum: obj.checksum,
  };
};

module.exports = {
  uploadObject,
  listUserObjects,
  getObjectById,
  getObjectReplicas,
  downloadObject,
};
