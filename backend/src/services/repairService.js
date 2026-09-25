const crypto = require('crypto');
const RepairJob = require('../models/RepairJob');
const VaultObject = require('../models/VaultObject');
const Node = require('../models/Node');
const storageNodeService = require('./storageNodeService');
const { logActivity } = require('./activityService');
const config = require('../config/env');
const { getDbStatus } = require('../config/db');

class RepairService {
  constructor() {
    this.isWorkerRunning = false;
    this.workerInterval = null;
  }

  /**
   * Create a repair job idempotently (avoids duplicate active jobs for the same object)
   */
  async createRepairJob({ objectId, reason, sourceNodeId = null, targetNodeId = null }) {
    const dbStatus = getDbStatus();
    if (dbStatus.readyState !== 1) return null;

    // Check for existing pending or active repair job for this object
    const existingJob = await RepairJob.findOne({
      objectId,
      status: { $in: ['QUEUED', 'RUNNING', 'VERIFYING'] },
    });

    if (existingJob) {
      return existingJob;
    }

    const obj = await VaultObject.findOne({ objectId });
    if (!obj) {
      throw new Error(`Object ${objectId} not found`);
    }

    const jobId = `repair_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    const job = await RepairJob.create({
      jobId,
      objectId,
      sourceNodeId,
      targetNodeId,
      reason,
      status: 'QUEUED',
      progress: 0,
      totalBytes: obj.size,
    });

    await logActivity({
      eventType: 'REPAIR_JOB_CREATED',
      message: `Repair job created for object ${obj.originalName} (Reason: ${reason})`,
      objectId,
      severity: 'INFO',
    });

    return job;
  }

  /**
   * Select a strictly healthy source replica from an ONLINE node
   */
  async selectSourceReplica(vaultObject) {
    const onlineNodes = await Node.find({ status: 'ONLINE' }).lean();
    const onlineNodeIds = new Set(onlineNodes.map((n) => n.nodeId));

    // Filter replicas that are explicitly HEALTHY, located on ONLINE nodes, and confirmed on disk
    for (const replica of vaultObject.replicas) {
      if (replica.status === 'HEALTHY' && onlineNodeIds.has(replica.nodeId)) {
        const exists = await storageNodeService.replicaExists(
          replica.nodeId,
          vaultObject.storageKey
        );
        if (exists) {
          // Double verify checksum if needed
          return replica;
        }
      }
    }
    return null;
  }

  /**
   * Select an optimal ONLINE target node with capacity and without existing replica
   */
  async selectTargetNode(vaultObject) {
    // Collect all nodeIds that already hold any replica of this object
    const existingNodeIds = new Set(
      vaultObject.replicas
        .filter((r) => r.status === 'HEALTHY' || r.status === 'REPAIRING')
        .map((r) => r.nodeId)
    );

    // Online nodes with sufficient available capacity, sorted by available storage descending
    const eligibleNodes = await Node.find({
      status: 'ONLINE',
      nodeId: { $nin: Array.from(existingNodeIds) },
      availableStorage: { $gte: vaultObject.size },
    }).sort({ availableStorage: -1 });

    if (eligibleNodes.length === 0) {
      return null;
    }

    return eligibleNodes[0];
  }

  /**
   * Process an individual repair job
   */
  async processJob(job) {
    const startTime = Date.now();
    try {
      const obj = await VaultObject.findOne({ objectId: job.objectId });
      if (!obj) {
        job.status = 'FAILED';
        job.error = 'Object metadata not found';
        job.completedAt = new Date();
        await job.save();
        return;
      }

      // Step 1: Find healthy source replica
      const sourceReplica = await this.selectSourceReplica(obj);
      if (!sourceReplica) {
        job.status = 'FAILED';
        job.error = 'No healthy source replica available on online nodes';
        job.completedAt = new Date();
        await job.save();

        await logActivity({
          eventType: 'REPAIR_FAILED',
          message: `Repair failed for object ${obj.originalName}: No healthy source replica found`,
          objectId: obj.objectId,
          severity: 'ERROR',
        });
        return;
      }

      job.sourceNodeId = sourceReplica.nodeId;

      // Step 2: Find target node
      const targetNode = await this.selectTargetNode(obj);
      if (!targetNode) {
        job.status = 'FAILED';
        job.error = 'Insufficient storage capacity or no eligible online target nodes';
        job.completedAt = new Date();
        await job.save();

        await logActivity({
          eventType: 'REPAIR_FAILED',
          message: `Repair failed for object ${obj.originalName}: No eligible target node`,
          objectId: obj.objectId,
          severity: 'ERROR',
        });
        return;
      }

      job.targetNodeId = targetNode.nodeId;
      job.progress = 25;
      await job.save();

      await logActivity({
        eventType: 'REPAIR_STARTED',
        message: `Self-healing replica transfer of ${obj.originalName} started from ${sourceReplica.nodeId} to ${targetNode.nodeId}`,
        objectId: obj.objectId,
        nodeId: targetNode.nodeId,
        severity: 'INFO',
      });

      // Step 3: Physically copy binary file between node directories
      const copyResult = await storageNodeService.copyReplica(
        sourceReplica.nodeId,
        targetNode.nodeId,
        obj.storageKey
      );

      job.status = 'VERIFYING';
      job.progress = 75;
      job.bytesTransferred = copyResult.bytesTransferred;
      await job.save();

      // Step 4: Verify checksum of newly copied replica against expected object checksum
      if (copyResult.checksum !== obj.checksum) {
        // Rollback corrupted copy
        await storageNodeService.deleteReplica(targetNode.nodeId, obj.storageKey);
        job.status = 'FAILED';
        job.error = `Checksum mismatch on copied replica. Expected: ${obj.checksum}, Got: ${copyResult.checksum}`;
        job.completedAt = new Date();
        await job.save();
        return;
      }

      // Step 5: Update replica metadata in VaultObject
      // Remove any missing or corrupted replica on target node if existed
      obj.replicas = obj.replicas.filter((r) => r.nodeId !== targetNode.nodeId);
      obj.replicas.push({
        nodeId: targetNode.nodeId,
        version: obj.version,
        checksum: obj.checksum,
        size: obj.size,
        status: 'HEALTHY',
        createdAt: new Date(),
      });

      // Recalculate overall object health
      obj.recalculateStatus();
      await obj.save();

      // Step 6: Update target node capacity tracking
      targetNode.usedStorage = Math.max(0, targetNode.usedStorage + obj.size);
      targetNode.availableStorage = Math.max(0, targetNode.capacity - targetNode.usedStorage);
      targetNode.replicaCount = targetNode.replicaCount + 1;
      targetNode.objectCount = targetNode.objectCount + 1;
      await targetNode.save();

      // Step 7: Mark repair job completed
      job.status = 'COMPLETED';
      job.progress = 100;
      job.completedAt = new Date();
      await job.save();

      const elapsedSec = ((Date.now() - startTime) / 1000).toFixed(2);
      await logActivity({
        eventType: 'REPAIR_COMPLETED',
        message: `Replica self-healing completed for ${obj.originalName} on ${targetNode.nodeId} in ${elapsedSec}s (SHA-256 confirmed)`,
        objectId: obj.objectId,
        nodeId: targetNode.nodeId,
        severity: 'INFO',
      });
    } catch (err) {
      job.status = 'FAILED';
      job.error = err.message;
      job.completedAt = new Date();
      await job.save();

      await logActivity({
        eventType: 'REPAIR_FAILED',
        message: `Exception during repair of object ${job.objectId}: ${err.message}`,
        objectId: job.objectId,
        severity: 'ERROR',
      });
    }
  }

  /**
   * Concurrency-controlled Background Worker
   */
  startWorker() {
    if (this.workerInterval) return;

    this.workerInterval = setInterval(async () => {
      const dbStatus = getDbStatus();
      if (dbStatus.readyState !== 1) return;

      try {
        // Count running jobs
        const runningCount = await RepairJob.countDocuments({
          status: { $in: ['RUNNING', 'VERIFYING'] },
        });

        if (runningCount >= config.maxConcurrentRepairs) {
          return;
        }

        // Atomically claim next QUEUED job
        const job = await RepairJob.findOneAndUpdate(
          { status: 'QUEUED' },
          { status: 'RUNNING', startedAt: new Date() },
          { sort: { createdAt: 1 }, new: true }
        );

        if (job) {
          // Process job asynchronously without blocking worker loop
          this.processJob(job);
        }
      } catch (err) {
        // Silent loop catch
      }
    }, 1500);
  }

  /**
   * Scan all objects and schedule repair jobs for any that are degraded or missing replicas
   */
  async scanAndScheduleRepairs() {
    const dbStatus = getDbStatus();
    if (dbStatus.readyState !== 1) return 0;

    const objects = await VaultObject.find();
    let scheduledCount = 0;

    for (const obj of objects) {
      const healthyReplicas = obj.replicas.filter((r) => r.status === 'HEALTHY').length;
      if (healthyReplicas < obj.replicationFactor) {
        const job = await this.createRepairJob({
          objectId: obj.objectId,
          reason: healthyReplicas === 0 ? 'CORRUPTION' : 'NODE_FAILURE',
        });
        if (job) scheduledCount++;
      }
    }
    return scheduledCount;
  }

  async getRecoveryMetrics() {
    const totalJobs = await RepairJob.countDocuments();
    const completedJobs = await RepairJob.countDocuments({ status: 'COMPLETED' });
    const failedJobs = await RepairJob.countDocuments({ status: 'FAILED' });
    const activeJobs = await RepairJob.countDocuments({
      status: { $in: ['QUEUED', 'RUNNING', 'VERIFYING'] },
    });

    const completedDocs = await RepairJob.find({ status: 'COMPLETED' }).lean();
    const totalBytesRepaired = completedDocs.reduce((acc, j) => acc + (j.totalBytes || 0), 0);

    let totalDurationMs = 0;
    let lastRepairTime = null;

    completedDocs.forEach((j) => {
      if (j.startedAt && j.completedAt) {
        totalDurationMs += new Date(j.completedAt).getTime() - new Date(j.startedAt).getTime();
        if (!lastRepairTime || new Date(j.completedAt) > new Date(lastRepairTime)) {
          lastRepairTime = j.completedAt;
        }
      }
    });

    const averageRepairTimeSeconds =
      completedDocs.length > 0
        ? parseFloat((totalDurationMs / completedDocs.length / 1000).toFixed(2))
        : 0;

    const degradedObjects = await VaultObject.countDocuments({ status: 'DEGRADED' });
    const healthyObjects = await VaultObject.countDocuments({ status: 'HEALTHY' });
    const corruptedObjects = await VaultObject.countDocuments({ status: 'CORRUPTED' });

    return {
      repairJobsCreated: totalJobs,
      repairJobsCompleted: completedJobs,
      repairJobsFailed: failedJobs,
      activeRepairs: activeJobs,
      totalBytesRepaired,
      averageRepairTimeSeconds,
      lastRepairTime,
      objectsCurrentlyDegraded: degradedObjects,
      objectsCurrentlyHealthy: healthyObjects,
      objectsCurrentlyCorrupted: corruptedObjects,
      replicasRestored: completedJobs,
    };
  }

  async getAllJobs(limit = 30) {
    return await RepairJob.find().sort({ createdAt: -1 }).limit(limit).lean();
  }

  async getJobById(jobId) {
    return await RepairJob.findOne({ jobId }).lean();
  }
}

module.exports = new RepairService();
