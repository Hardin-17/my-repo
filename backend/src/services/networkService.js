const crypto = require('crypto');
const NetworkPartition = require('../models/NetworkPartition');
const Node = require('../models/Node');
const { logActivity } = require('./activityService');

class NetworkService {
  constructor() {
    this.activePartitions = [];
    this.initialized = false;
  }

  async ensureInitialized() {
    if (!this.initialized) {
      try {
        this.activePartitions = await NetworkPartition.find({ status: 'ACTIVE' }).lean();
        this.initialized = true;
      } catch (err) {
        // Fallback for early testing before DB connect
        this.activePartitions = [];
      }
    }
  }

  /**
   * Computes all blocked pairs given an array of partition groups
   * e.g. groups = [['node-01', 'node-02'], ['node-03', 'node-04']]
   */
  computeBlockedPairs(groups) {
    const blockedPairs = [];
    for (let i = 0; i < groups.length; i++) {
      for (let j = i + 1; j < groups.length; j++) {
        const groupA = groups[i];
        const groupB = groups[j];
        for (const nodeA of groupA) {
          for (const nodeB of groupB) {
            blockedPairs.push({ from: nodeA, to: nodeB });
            blockedPairs.push({ from: nodeB, to: nodeA });
          }
        }
      }
    }
    return blockedPairs;
  }

  /**
   * Create and activate a network partition
   */
  async createPartition({ groups, isolatedNodes, reason = 'Operator-injected chaos partition', userId = null }) {
    await this.ensureInitialized();

    let partitionGroups = groups;
    if (!partitionGroups && isolatedNodes && Array.isArray(isolatedNodes)) {
      const allNodes = await Node.find().lean();
      const allNodeIds = allNodes.map((n) => n.nodeId);
      const remaining = allNodeIds.filter((id) => !isolatedNodes.includes(id));
      partitionGroups = [isolatedNodes, remaining];
    }

    if (!Array.isArray(partitionGroups) || partitionGroups.length < 2) {
      const error = new Error('A network partition requires at least 2 distinct node groups');
      error.statusCode = 400;
      throw error;
    }

    // Verify all groups have node IDs
    for (const grp of partitionGroups) {
      if (!Array.isArray(grp) || grp.length === 0) {
        const error = new Error('Each partition group must contain at least one node ID');
        error.statusCode = 400;
        throw error;
      }
    }

    const blockedPairs = this.computeBlockedPairs(partitionGroups);
    const partitionId = `part_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;

    const partition = await NetworkPartition.create({
      partitionId,
      groups: partitionGroups,
      blockedPairs,
      status: 'ACTIVE',
      reason,
      createdBy: userId,
    });

    this.activePartitions.push(partition.toObject ? partition.toObject() : partition);

    await logActivity({
      eventType: 'CHAOS_INJECTED',
      message: `Network partition ${partitionId} created between groups: ${partitionGroups.map((g) => `[${g.join(',')}]`).join(' <-> ')}`,
      userId,
      severity: 'WARNING',
    });

    return partition;
  }

  /**
   * Check if two storage nodes can communicate across the mesh
   */
  canCommunicate(fromNodeId, toNodeId) {
    if (!fromNodeId || !toNodeId || fromNodeId === toNodeId) {
      return true;
    }

    for (const part of this.activePartitions) {
      if (part.status !== 'ACTIVE') continue;
      const isBlocked = (part.blockedPairs || []).some(
        (pair) =>
          (pair.from === fromNodeId && pair.to === toNodeId) ||
          (pair.from === toNodeId && pair.to === fromNodeId)
      );
      if (isBlocked) {
        return false;
      }
    }
    return true;
  }

  /**
   * Recover an active partition by ID
   */
  async recoverPartition(partitionId, userId = null) {
    await this.ensureInitialized();

    const partition = await NetworkPartition.findOne({ partitionId });
    if (!partition) {
      const error = new Error(`Partition ${partitionId} not found`);
      error.statusCode = 404;
      throw error;
    }

    partition.status = 'RESOLVED';
    partition.resolvedAt = new Date();
    await partition.save();

    this.activePartitions = this.activePartitions.filter((p) => p.partitionId !== partitionId);

    await logActivity({
      eventType: 'CHAOS_RESOLVED',
      message: `Network partition ${partitionId} resolved. Inter-node mesh connectivity restored.`,
      userId,
      severity: 'INFO',
    });

    return partition;
  }

  /**
   * Recover all active partitions
   */
  async recoverAllPartitions(userId = null) {
    await this.ensureInitialized();

    const active = await NetworkPartition.find({ status: 'ACTIVE' });
    const count = active.length;

    await NetworkPartition.updateMany(
      { status: 'ACTIVE' },
      { $set: { status: 'RESOLVED', resolvedAt: new Date() } }
    );

    this.activePartitions = [];

    if (count > 0) {
      await logActivity({
        eventType: 'CHAOS_RESOLVED',
        message: `All ${count} active network partitions have been resolved.`,
        userId,
        severity: 'INFO',
      });
    }

    return { recoveredCount: count };
  }

  /**
   * List active network partitions
   */
  async getActivePartitions() {
    await this.ensureInitialized();
    return await NetworkPartition.find({ status: 'ACTIVE' }).sort({ createdAt: -1 }).lean();
  }

  /**
   * List all network partitions
   */
  async getAllPartitions(limit = 20) {
    return await NetworkPartition.find().sort({ createdAt: -1 }).limit(limit).lean();
  }
}

module.exports = new NetworkService();
