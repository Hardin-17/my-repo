const crypto = require('crypto');
const path = require('path');
const VaultObject = require('../models/VaultObject');
const Node = require('../models/Node');
const storageNodeService = require('./storageNodeService');
const nodeService = require('./nodeService');
const networkService = require('./networkService');
const { logActivity } = require('./activityService');
const config = require('../config/env');

/**
 * Sanitizes original filename to prevent malicious paths or characters
 */
const sanitizeFilename = (filename) => {
  const base = path.basename(filename || 'unnamed-file');
  return base.replace(/[^a-zA-Z0-9._-]/g, '_');
};

/**
 * Calculates required acknowledgements based on durability policy
 */
const calculateRequiredAcks = (replicationFactor, policy) => {
  const rf = parseInt(replicationFactor, 10);
  switch (policy) {
    case 'ONE':
      return 1;
    case 'ALL':
      return rf;
    case 'QUORUM':
    default:
      return Math.floor(rf / 2) + 1;
  }
};

const uploadObject = async ({
  file,
  ownerId,
  replicationFactor = 3,
  durabilityPolicy = config.defaultDurabilityPolicy,
  readPolicy = config.defaultReadPolicy,
}) => {
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

  const validDurabilityPolicies = ['ONE', 'QUORUM', 'ALL'];
  const effectiveDurability = validDurabilityPolicies.includes(durabilityPolicy)
    ? durabilityPolicy
    : 'QUORUM';

  const validReadPolicies = ['ANY_HEALTHY', 'LOWEST_LATENCY', 'QUORUM'];
  const effectiveReadPolicy = validReadPolicies.includes(readPolicy)
    ? readPolicy
    : 'ANY_HEALTHY';

  const requiredAcks = calculateRequiredAcks(parsedRf, effectiveDurability);

  // Calculate cryptographic SHA-256 checksum
  const checksum = crypto.createHash('sha256').update(file.buffer).digest('hex');

  // Generate unique object ID and storage key
  const objectId = `obj_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  const safeFilename = sanitizeFilename(file.originalname);
  const storageKey = `${objectId}/${safeFilename}`;

  // Select suitable distinct storage nodes
  const selectedNodes = await nodeService.selectNodesForPlacement(parsedRf, file.buffer.length);
  const primaryNode = selectedNodes[0];

  const replicas = [];
  const writtenNodes = [];
  let successfulAcks = 0;

  // Attempt write to each selected node respecting network connectivity
  for (const node of selectedNodes) {
    // Check network partition connectivity between primary gateway and target node
    const isReachable =
      node.nodeId === primaryNode.nodeId ||
      networkService.canCommunicate(primaryNode.nodeId, node.nodeId);

    if (!isReachable || node.status !== 'ONLINE') {
      // Node is unreachable due to partition or offline
      replicas.push({
        nodeId: node.nodeId,
        version: 1,
        checksum,
        size: file.buffer.length,
        status: 'MISSING',
        createdAt: new Date(),
      });
      continue;
    }

    try {
      await storageNodeService.writeReplica(node.nodeId, storageKey, file.buffer);
      writtenNodes.push(node.nodeId);
      successfulAcks++;

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
        message: `Replica of ${safeFilename} created on node ${node.nodeId} (v1)`,
        objectId,
        nodeId: node.nodeId,
        severity: 'INFO',
      });
    } catch (err) {
      replicas.push({
        nodeId: node.nodeId,
        version: 1,
        checksum,
        size: file.buffer.length,
        status: 'MISSING',
        createdAt: new Date(),
      });
    }
  }

  // Check durability quorum / acknowledgement satisfaction
  if (successfulAcks < requiredAcks) {
    // Roll back already written replicas
    for (const nodeId of writtenNodes) {
      try {
        await storageNodeService.deleteReplica(nodeId, storageKey);
        await nodeService.updateNodeMetrics(nodeId, {
          sizeDelta: -file.buffer.length,
          objectCountDelta: -1,
          replicaCountDelta: -1,
        });
      } catch (cleanupErr) {
        // Continue cleanup
      }
    }

    const error = new Error(
      `Write durability policy "${effectiveDurability}" failed: received ${successfulAcks}/${requiredAcks} acknowledgements (RF=${parsedRf})`
    );
    error.statusCode = 503;
    throw error;
  }

  // Save metadata in MongoDB
  const vaultObject = new VaultObject({
    objectId,
    ownerId,
    originalName: safeFilename,
    storageKey,
    mimeType: file.mimetype || 'application/octet-stream',
    size: file.buffer.length,
    checksum,
    version: 1,
    replicationFactor: parsedRf,
    durabilityPolicy: effectiveDurability,
    readPolicy: effectiveReadPolicy,
    replicas,
    status: 'HEALTHY',
  });

  vaultObject.recalculateStatus();
  await vaultObject.save();

  await logActivity({
    eventType: 'OBJECT_UPLOADED',
    message: `Object "${safeFilename}" uploaded with ${effectiveDurability} durability (${successfulAcks}/${parsedRf} acks)`,
    userId: ownerId,
    objectId,
    severity: 'INFO',
  });

  return vaultObject;
};

/**
 * Concurrent-safe versioned object update
 */
const updateObject = async ({
  objectId,
  file,
  ownerId,
  durabilityPolicy,
  readPolicy,
}) => {
  if (!file || !file.buffer) {
    const error = new Error('No file provided for update');
    error.statusCode = 400;
    throw error;
  }

  const currentObj = await VaultObject.findOne({ objectId });
  if (!currentObj) {
    const error = new Error(`Object with ID "${objectId}" was not found`);
    error.statusCode = 404;
    throw error;
  }

  if (currentObj.ownerId.toString() !== ownerId.toString()) {
    const error = new Error('Access denied: You do not own this object');
    error.statusCode = 403;
    throw error;
  }

  const currentVersion = currentObj.version || 1;
  const newVersion = currentVersion + 1;
  const newChecksum = crypto.createHash('sha256').update(file.buffer).digest('hex');

  const effectiveDurability = durabilityPolicy || currentObj.durabilityPolicy || 'QUORUM';
  const effectiveReadPolicy = readPolicy || currentObj.readPolicy || 'ANY_HEALTHY';
  const parsedRf = currentObj.replicationFactor || 3;
  const requiredAcks = calculateRequiredAcks(parsedRf, effectiveDurability);

  // Existing nodes or select suitable placement
  const existingNodeIds = currentObj.replicas.map((r) => r.nodeId);
  const primaryNodeId = existingNodeIds[0] || 'node-01';

  const newReplicas = [];
  const writtenNodes = [];
  let successfulAcks = 0;

  for (const nodeId of existingNodeIds) {
    const isReachable =
      nodeId === primaryNodeId || networkService.canCommunicate(primaryNodeId, nodeId);

    if (!isReachable) {
      newReplicas.push({
        nodeId,
        version: currentVersion, // Remains on old version until repaired
        checksum: currentObj.checksum,
        size: currentObj.size,
        status: 'INCONSISTENT',
        createdAt: new Date(),
      });
      continue;
    }

    try {
      await storageNodeService.writeReplica(nodeId, currentObj.storageKey, file.buffer);
      writtenNodes.push(nodeId);
      successfulAcks++;

      newReplicas.push({
        nodeId,
        version: newVersion,
        checksum: newChecksum,
        size: file.buffer.length,
        status: 'HEALTHY',
        createdAt: new Date(),
      });

      // Update storage size delta
      const sizeDelta = file.buffer.length - currentObj.size;
      await nodeService.updateNodeMetrics(nodeId, { sizeDelta });
    } catch (writeErr) {
      newReplicas.push({
        nodeId,
        version: currentVersion,
        checksum: currentObj.checksum,
        size: currentObj.size,
        status: 'INCONSISTENT',
        createdAt: new Date(),
      });
    }
  }

  if (successfulAcks < requiredAcks) {
    const error = new Error(
      `Update durability policy "${effectiveDurability}" failed: received ${successfulAcks}/${requiredAcks} acks`
    );
    error.statusCode = 503;
    throw error;
  }

  // Atomic update with optimistic concurrency control on version
  const updatedObject = await VaultObject.findOneAndUpdate(
    { objectId, version: currentVersion },
    {
      $set: {
        version: newVersion,
        checksum: newChecksum,
        size: file.buffer.length,
        replicas: newReplicas,
        durabilityPolicy: effectiveDurability,
        readPolicy: effectiveReadPolicy,
      },
    },
    { new: true }
  );

  if (!updatedObject) {
    const error = new Error(`Concurrent modification detected on object "${objectId}"`);
    error.statusCode = 409;
    throw error;
  }

  updatedObject.recalculateStatus();
  await updatedObject.save();

  await logActivity({
    eventType: 'OBJECT_UPDATED',
    message: `Object "${updatedObject.originalName}" updated to version ${newVersion} (${successfulAcks}/${parsedRf} acks)`,
    userId: ownerId,
    objectId,
    severity: 'INFO',
  });

  return updatedObject;
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

  // Augment replicas with live node latency, health, and partition status
  const enrichedReplicas = obj.replicas.map((rep) => {
    const node = nodeMap.get(rep.nodeId);
    const reachable = networkService.canCommunicate('node-01', rep.nodeId);
    return {
      ...rep,
      nodeName: node?.name || rep.nodeId,
      nodeStatus: node?.status || 'UNKNOWN',
      nodeLatency: node?.latency || 0,
      zone: node?.zone || 'unknown',
      reachable,
    };
  });

  return {
    objectId: obj.objectId,
    originalName: obj.originalName,
    checksum: obj.checksum,
    size: obj.size,
    version: obj.version || 1,
    replicationFactor: obj.replicationFactor,
    durabilityPolicy: obj.durabilityPolicy || 'QUORUM',
    readPolicy: obj.readPolicy || 'ANY_HEALTHY',
    replicas: enrichedReplicas,
  };
};

const downloadObject = async (objectId, ownerId, readPolicyOverride = null) => {
  const obj = await getObjectById(objectId, ownerId);
  const effectivePolicy = readPolicyOverride || obj.readPolicy || 'ANY_HEALTHY';

  const nodes = await Node.find().lean();
  const nodeMap = new Map(nodes.map((n) => [n.nodeId, n]));

  // Find candidate replicas: must be HEALTHY, node ONLINE, and reachable across mesh
  const candidates = obj.replicas.filter((r) => {
    const node = nodeMap.get(r.nodeId);
    const isOnline = node && node.status === 'ONLINE';
    const isReachable = networkService.canCommunicate('node-01', r.nodeId);
    return r.status === 'HEALTHY' && isOnline && isReachable;
  });

  if (candidates.length === 0) {
    const error = new Error('No healthy reachable replica available for download');
    error.statusCode = 503;
    throw error;
  }

  let selectedReplica = null;

  if (effectivePolicy === 'QUORUM') {
    const quorumCount = Math.floor(obj.replicationFactor / 2) + 1;
    if (candidates.length < quorumCount) {
      const error = new Error(
        `Read quorum policy failed: only ${candidates.length}/${quorumCount} reachable healthy replicas available`
      );
      error.statusCode = 503;
      throw error;
    }

    // Check version and checksum consensus among candidates
    const versionGroups = new Map();
    for (const c of candidates) {
      const key = `${c.version || 1}_${c.checksum}`;
      if (!versionGroups.has(key)) {
        versionGroups.set(key, []);
      }
      versionGroups.get(key).push(c);
    }

    let consensusGroup = null;
    for (const [key, reps] of versionGroups.entries()) {
      if (reps.length >= quorumCount) {
        consensusGroup = reps;
        break;
      }
    }

    if (!consensusGroup) {
      const error = new Error('Read quorum failed: unable to achieve consensus on object checksum/version');
      error.statusCode = 503;
      throw error;
    }

    // Pick replica with lowest latency from the consensus group
    selectedReplica = consensusGroup.sort((a, b) => {
      const latA = nodeMap.get(a.nodeId)?.latency || 999;
      const latB = nodeMap.get(b.nodeId)?.latency || 999;
      return latA - latB;
    })[0];
  } else if (effectivePolicy === 'LOWEST_LATENCY') {
    // Sort by node latency ascending
    const sorted = [...candidates].sort((a, b) => {
      const latA = nodeMap.get(a.nodeId)?.latency || 999;
      const latB = nodeMap.get(b.nodeId)?.latency || 999;
      return latA - latB;
    });
    selectedReplica = sorted[0];
  } else {
    // ANY_HEALTHY: pick first candidate
    selectedReplica = candidates[0];
  }

  // Check if replica file actually exists on logical disk
  const exists = await storageNodeService.replicaExists(selectedReplica.nodeId, obj.storageKey);
  if (!exists) {
    const error = new Error(`Replica file missing on node ${selectedReplica.nodeId}`);
    error.statusCode = 500;
    throw error;
  }

  const stream = storageNodeService.createReadStream(selectedReplica.nodeId, obj.storageKey);

  await logActivity({
    eventType: 'OBJECT_DOWNLOADED',
    message: `Object "${obj.originalName}" downloaded from replica on node ${selectedReplica.nodeId} (${effectivePolicy} policy)`,
    userId: ownerId,
    objectId: obj.objectId,
    nodeId: selectedReplica.nodeId,
    severity: 'INFO',
  });

  return {
    stream,
    originalName: obj.originalName,
    mimeType: obj.mimeType,
    size: obj.size,
    checksum: obj.checksum,
    version: obj.version || 1,
    selectedNodeId: selectedReplica.nodeId,
    readPolicy: effectivePolicy,
  };
};

module.exports = {
  uploadObject,
  updateObject,
  listUserObjects,
  getObjectById,
  getObjectReplicas,
  downloadObject,
  calculateRequiredAcks,
};
