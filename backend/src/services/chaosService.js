const Node = require('../models/Node');
const VaultObject = require('../models/VaultObject');
const storageNodeService = require('./storageNodeService');
const repairService = require('./repairService');
const { logActivity } = require('./activityService');

class ChaosService {
  /**
   * Simulate failure of a specific storage node
   */
  async injectNodeFailure(nodeId, userId = null, reason = 'Operator-injected chaos termination') {
    const node = await Node.findOne({ nodeId });
    if (!node) {
      const error = new Error(`Node ${nodeId} not found`);
      error.statusCode = 404;
      throw error;
    }

    if (node.status === 'OFFLINE') {
      const error = new Error(`Node ${nodeId} is already OFFLINE`);
      error.statusCode = 400;
      throw error;
    }

    // Step 1: Mark node OFFLINE
    node.status = 'OFFLINE';
    node.failedAt = new Date();
    node.failureReason = reason;
    node.failureCount = (node.failureCount || 0) + 1;
    await node.save();

    await logActivity({
      eventType: 'NODE_FAILURE_DETECTED',
      message: `Storage node ${node.nodeId} (${node.name}) marked OFFLINE: ${reason}`,
      userId,
      nodeId: node.nodeId,
      severity: 'WARNING',
    });

    // Step 2: Identify affected objects holding replicas on this node
    const affectedObjects = await VaultObject.find({ 'replicas.nodeId': nodeId });

    let repairJobsCreated = 0;
    const repairJobs = [];

    for (const obj of affectedObjects) {
      let modified = false;
      obj.replicas.forEach((r) => {
        if (r.nodeId === nodeId && r.status === 'HEALTHY') {
          r.status = 'MISSING';
          modified = true;
        }
      });

      if (modified) {
        obj.recalculateStatus();
        await obj.save();

        await logActivity({
          eventType: 'REPLICA_MARKED_MISSING',
          message: `Replica on node ${nodeId} marked MISSING for object ${obj.originalName}`,
          objectId: obj.objectId,
          nodeId,
          severity: 'WARNING',
        });
      }

      // Check if degraded and schedule auto-repair
      const healthyReplicas = obj.replicas.filter((r) => r.status === 'HEALTHY').length;
      if (healthyReplicas < obj.replicationFactor) {
        const job = await repairService.createRepairJob({
          objectId: obj.objectId,
          reason: 'NODE_FAILURE',
        });
        if (job) {
          repairJobsCreated++;
          repairJobs.push(job.jobId);
        }
      }
    }

    return {
      nodeId,
      status: 'OFFLINE',
      failedAt: node.failedAt,
      affectedObjects: affectedObjects.length,
      repairJobsCreated,
      repairJobs,
    };
  }

  /**
   * Recover an offline storage node
   */
  async recoverNode(nodeId, userId = null) {
    const node = await Node.findOne({ nodeId });
    if (!node) {
      const error = new Error(`Node ${nodeId} not found`);
      error.statusCode = 404;
      throw error;
    }

    if (node.status === 'ONLINE') {
      const error = new Error(`Node ${nodeId} is already ONLINE`);
      error.statusCode = 400;
      throw error;
    }

    node.status = 'ONLINE';
    node.failedAt = null;
    node.failureReason = null;
    node.lastHeartbeat = new Date();
    await node.save();

    await logActivity({
      eventType: 'NODE_RECOVERED',
      message: `Storage node ${node.nodeId} (${node.name}) has recovered and re-joined the mesh`,
      userId,
      nodeId: node.nodeId,
      severity: 'INFO',
    });

    // Check replicas residing on this node and re-verify their status
    const objects = await VaultObject.find({ 'replicas.nodeId': nodeId });
    for (const obj of objects) {
      let modified = false;
      for (const rep of obj.replicas) {
        if (rep.nodeId === nodeId && rep.status === 'MISSING') {
          // Check physical disk existence and verify checksum
          const exists = await storageNodeService.replicaExists(nodeId, obj.storageKey);
          if (exists) {
            const check = await storageNodeService.verifyReplicaChecksum(
              nodeId,
              obj.storageKey,
              obj.checksum
            );
            rep.status = check.match ? 'HEALTHY' : 'CORRUPTED';
            modified = true;
          }
        }
      }
      if (modified) {
        obj.recalculateStatus();
        await obj.save();
      }
    }

    return {
      nodeId,
      status: 'ONLINE',
      recoveredAt: new Date(),
    };
  }

  /**
   * Corrupt a specific replica on disk to test bit-rot detection & self-healing
   */
  async corruptReplica({ objectId, nodeId, userId = null }) {
    const obj = await VaultObject.findOne({ objectId });
    if (!obj) {
      const error = new Error(`Object ${objectId} not found`);
      error.statusCode = 404;
      throw error;
    }

    const replica = obj.replicas.find((r) => r.nodeId === nodeId);
    if (!replica) {
      const error = new Error(`No replica for object ${objectId} found on node ${nodeId}`);
      error.statusCode = 404;
      throw error;
    }

    // Corrupt physical file on disk
    const corruptResult = await storageNodeService.corruptReplica(nodeId, obj.storageKey);

    // Mark replica as CORRUPTED
    replica.status = 'CORRUPTED';
    replica.checksum = corruptResult.newChecksum;
    obj.recalculateStatus();
    await obj.save();

    await logActivity({
      eventType: 'CORRUPTION_INJECTED',
      message: `Data corruption injected into replica on node ${nodeId} for object ${obj.originalName}`,
      userId,
      objectId: obj.objectId,
      nodeId,
      severity: 'WARNING',
    });

    return {
      objectId: obj.objectId,
      nodeId,
      status: 'CORRUPTED',
      newChecksum: corruptResult.newChecksum,
      expectedChecksum: obj.checksum,
      objectHealth: obj.status,
    };
  }
}

module.exports = new ChaosService();
