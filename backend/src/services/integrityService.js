const VaultObject = require('../models/VaultObject');
const Node = require('../models/Node');
const storageNodeService = require('./storageNodeService');
const repairService = require('./repairService');
const { logActivity } = require('./activityService');
const config = require('../config/env');
const { getDbStatus } = require('../config/db');

class IntegrityService {
  constructor() {
    this.scanInterval = null;
  }

  /**
   * Verify an object's cryptographic integrity across all its replicas
   */
  async verifyObject(objectId, userId = null) {
    const obj = await VaultObject.findOne({ objectId });
    if (!obj) {
      throw new Error(`Object ${objectId} not found`);
    }

    await logActivity({
      eventType: 'INTEGRITY_CHECK_STARTED',
      message: `SHA-256 integrity scrub initiated for object ${obj.originalName} (${obj.replicas.length} replicas)`,
      userId,
      objectId: obj.objectId,
      severity: 'INFO',
    });

    const nodes = await Node.find().lean();
    const nodeMap = new Map(nodes.map((n) => [n.nodeId, n]));

    const verificationResults = [];
    let hasCorruptedReplica = false;
    let hasInconsistentReplica = false;

    for (const replica of obj.replicas) {
      const node = nodeMap.get(replica.nodeId);
      const isNodeOnline = node && node.status === 'ONLINE';

      if (!isNodeOnline) {
        replica.status = 'MISSING';
        verificationResults.push({
          nodeId: replica.nodeId,
          status: 'MISSING',
          reason: 'Storage node is OFFLINE or unreachable',
        });
        continue;
      }

      // Check if file exists on physical/logical disk
      const exists = await storageNodeService.replicaExists(replica.nodeId, obj.storageKey);
      if (!exists) {
        replica.status = 'MISSING';
        verificationResults.push({
          nodeId: replica.nodeId,
          status: 'MISSING',
          reason: 'Replica file missing on disk volume',
        });
        continue;
      }

      // Inconsistency check: verify metadata consistency
      if (replica.version !== obj.version || replica.size !== obj.size) {
        replica.status = 'INCONSISTENT';
        hasInconsistentReplica = true;
        verificationResults.push({
          nodeId: replica.nodeId,
          status: 'INCONSISTENT',
          expectedVersion: obj.version,
          replicaVersion: replica.version,
        });

        await logActivity({
          eventType: 'REPLICA_INCONSISTENT',
          message: `Inconsistent replica detected for ${obj.originalName} on node ${replica.nodeId}`,
          objectId: obj.objectId,
          nodeId: replica.nodeId,
          severity: 'WARNING',
        });
        continue;
      }

      // Cryptographic SHA-256 verification
      const checkResult = await storageNodeService.verifyReplicaChecksum(
        replica.nodeId,
        obj.storageKey,
        obj.checksum
      );

      if (checkResult.match) {
        replica.status = 'HEALTHY';
        replica.checksum = checkResult.computedHash;
        verificationResults.push({
          nodeId: replica.nodeId,
          status: 'HEALTHY',
          checksum: checkResult.computedHash,
        });
      } else {
        replica.status = 'CORRUPTED';
        replica.checksum = checkResult.computedHash;
        hasCorruptedReplica = true;
        verificationResults.push({
          nodeId: replica.nodeId,
          status: 'CORRUPTED',
          expectedChecksum: obj.checksum,
          computedChecksum: checkResult.computedHash,
          reason: 'SHA-256 cryptographic signature mismatch (silent bit rot detected)',
        });

        await logActivity({
          eventType: 'REPLICA_MARKED_CORRUPTED',
          message: `SHA-256 bit-rot detected on replica ${replica.nodeId} for object ${obj.originalName}`,
          objectId: obj.objectId,
          nodeId: replica.nodeId,
          severity: 'ERROR',
        });
      }
    }

    // Recalculate object status
    obj.recalculateStatus();
    await obj.save();

    await logActivity({
      eventType: 'INTEGRITY_CHECK_COMPLETED',
      message: `Integrity scrub completed for ${obj.originalName}: ${
        hasCorruptedReplica || hasInconsistentReplica ? 'ANOMALIES DETECTED' : '100% HEALTHY'
      }`,
      userId,
      objectId: obj.objectId,
      severity: hasCorruptedReplica ? 'WARNING' : 'INFO',
    });

    // If corrupted or degraded replicas detected, automatically schedule a repair job!
    const healthyReplicas = obj.replicas.filter((r) => r.status === 'HEALTHY').length;
    let repairJob = null;
    if (healthyReplicas < obj.replicationFactor) {
      repairJob = await repairService.createRepairJob({
        objectId: obj.objectId,
        reason: hasCorruptedReplica ? 'CORRUPTION' : 'NODE_FAILURE',
      });
    }

    return {
      objectId: obj.objectId,
      originalName: obj.originalName,
      status: obj.status,
      expectedChecksum: obj.checksum,
      replicationFactor: obj.replicationFactor,
      healthyReplicas,
      hasCorruptedReplica,
      hasInconsistentReplica,
      repairJobCreated: !!repairJob,
      repairJobId: repairJob?.jobId || null,
      replicas: verificationResults,
    };
  }

  /**
   * Background lightweight integrity scanner
   */
  startBackgroundScanner() {
    if (this.scanInterval) return;

    this.scanInterval = setInterval(async () => {
      const dbStatus = getDbStatus();
      if (dbStatus.readyState !== 1) return;

      try {
        // Fetch small batch of objects
        const objects = await VaultObject.find()
          .sort({ updatedAt: 1 })
          .limit(config.integrityScanBatchSize);

        for (const obj of objects) {
          await this.verifyObject(obj.objectId);
        }
      } catch (err) {
        // Silent loop catch
      }
    }, config.integrityScanIntervalMs);
  }
}

module.exports = new IntegrityService();
