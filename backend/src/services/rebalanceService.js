const Node = require('../models/Node');
const VaultObject = require('../models/VaultObject');
const storageNodeService = require('./storageNodeService');
const nodeService = require('./nodeService');
const networkService = require('./networkService');
const { logActivity } = require('./activityService');
const config = require('../config/env');

class RebalanceService {
  constructor() {
    this.lastRun = null;
    this.lastReport = null;
    this.history = [];
  }

  /**
   * Analyzes storage skew across all active storage nodes
   */
  async analyzeSkew() {
    const nodes = await Node.find({ status: 'ONLINE' }).lean();
    if (nodes.length === 0) {
      return {
        balanced: true,
        nodes: [],
        averageUtilization: 0,
        maxSkewPercent: 0,
        needsRebalance: false,
      };
    }

    const totalUsed = nodes.reduce((acc, n) => acc + (n.usedStorage || 0), 0);
    const totalCapacity = nodes.reduce((acc, n) => acc + (n.capacity || 0), 0);
    const avgUtilization = totalCapacity > 0 ? (totalUsed / totalCapacity) * 100 : 0;

    const nodeStats = nodes.map((node) => {
      const utilPercent = node.capacity > 0 ? (node.usedStorage / node.capacity) * 100 : 0;
      const skewFromAvg = utilPercent - avgUtilization;
      return {
        nodeId: node.nodeId,
        name: node.name,
        usedStorage: node.usedStorage || 0,
        capacity: node.capacity || 0,
        utilizationPercent: parseFloat(utilPercent.toFixed(2)),
        skewFromAvg: parseFloat(skewFromAvg.toFixed(2)),
      };
    });

    const maxUtil = Math.max(...nodeStats.map((n) => n.utilizationPercent));
    const minUtil = Math.min(...nodeStats.map((n) => n.utilizationPercent));
    const spreadPercent = parseFloat((maxUtil - minUtil).toFixed(2));

    const threshold = config.rebalanceThresholdPercent || 20;
    const needsRebalance = spreadPercent > threshold && totalUsed > 0;

    return {
      balanced: !needsRebalance,
      nodes: nodeStats,
      totalUsed,
      totalCapacity,
      averageUtilization: parseFloat(avgUtilization.toFixed(2)),
      spreadPercent,
      threshold,
      needsRebalance,
    };
  }

  /**
   * Executes safe copy-then-verify background rebalance migration
   */
  async runRebalance({ maxMoves = 5, userId = null } = {}) {
    const analysisBefore = await this.analyzeSkew();

    const nodes = await Node.find({ status: 'ONLINE' });
    if (nodes.length < 2) {
      return {
        rebalanced: false,
        message: 'Rebalance requires at least 2 online storage nodes',
        movedCount: 0,
      };
    }

    // Sort nodes by usedStorage descending (most loaded first)
    const sortedNodes = [...nodes].sort((a, b) => (b.usedStorage || 0) - (a.usedStorage || 0));
    const overloadedNode = sortedNodes[0];
    const underloadedNode = sortedNodes[sortedNodes.length - 1];

    if ((overloadedNode.usedStorage || 0) <= (underloadedNode.usedStorage || 0)) {
      return {
        rebalanced: false,
        message: 'Cluster storage utilization is already evenly balanced',
        movedCount: 0,
        analysis: analysisBefore,
      };
    }

    const movedReplicas = [];
    let totalBytesMoved = 0;

    // Find candidate objects with a replica on overloadedNode
    const candidateObjects = await VaultObject.find({
      'replicas.nodeId': overloadedNode.nodeId,
      'replicas.status': 'HEALTHY',
    });

    for (const obj of candidateObjects) {
      if (movedReplicas.length >= maxMoves) break;

      // Ensure underloadedNode does NOT already hold a replica of this object
      const hasReplicaOnTarget = obj.replicas.some((r) => r.nodeId === underloadedNode.nodeId);
      if (hasReplicaOnTarget) continue;

      // Ensure network connectivity between source and target
      if (!networkService.canCommunicate(overloadedNode.nodeId, underloadedNode.nodeId)) {
        continue;
      }

      const replicaToMove = obj.replicas.find(
        (r) => r.nodeId === overloadedNode.nodeId && r.status === 'HEALTHY'
      );
      if (!replicaToMove) continue;

      try {
        // Step 1: Copy replica from source node to target node
        const copyResult = await storageNodeService.copyReplica(
          overloadedNode.nodeId,
          underloadedNode.nodeId,
          obj.storageKey
        );

        // Step 2: Strictly verify target replica checksum against expected object checksum
        const verifyCheck = await storageNodeService.verifyReplicaChecksum(
          underloadedNode.nodeId,
          obj.storageKey,
          obj.checksum
        );

        if (!verifyCheck.match) {
          // If verification fails, delete corrupt copy on target and abort moving this replica
          await storageNodeService.deleteReplica(underloadedNode.nodeId, obj.storageKey);
          continue;
        }

        // Step 3: Atomically update VaultObject replica metadata
        replicaToMove.nodeId = underloadedNode.nodeId;
        obj.recalculateStatus();
        await obj.save();

        // Step 4: ONLY after metadata persistence succeeds, delete replica from source node
        await storageNodeService.deleteReplica(overloadedNode.nodeId, obj.storageKey);

        // Step 5: Update capacity metrics on both nodes
        const replicaSize = replicaToMove.size || obj.size || 0;
        await nodeService.updateNodeMetrics(overloadedNode.nodeId, {
          sizeDelta: -replicaSize,
          replicaCountDelta: -1,
        });
        await nodeService.updateNodeMetrics(underloadedNode.nodeId, {
          sizeDelta: replicaSize,
          replicaCountDelta: 1,
        });

        // Step 6: Log activity
        await logActivity({
          eventType: 'REBALANCE_COMPLETED',
          message: `Rebalanced replica of ${obj.originalName} from ${overloadedNode.nodeId} to ${underloadedNode.nodeId} (${(replicaSize / 1024).toFixed(1)} KB)`,
          userId,
          objectId: obj.objectId,
          severity: 'INFO',
        });

        movedReplicas.push({
          objectId: obj.objectId,
          originalName: obj.originalName,
          sourceNodeId: overloadedNode.nodeId,
          targetNodeId: underloadedNode.nodeId,
          size: replicaSize,
          checksum: obj.checksum,
        });

        totalBytesMoved += replicaSize;
      } catch (err) {
        console.error(`[RebalanceService] Error moving replica for object ${obj.objectId}:`, err);
      }
    }

    const analysisAfter = await this.analyzeSkew();

    const report = {
      rebalanced: movedReplicas.length > 0,
      movedCount: movedReplicas.length,
      bytesMoved: totalBytesMoved,
      movedReplicas,
      analysisBefore,
      analysisAfter,
      timestamp: new Date(),
    };

    this.lastRun = report.timestamp;
    this.lastReport = report;
    this.history.unshift(report);
    if (this.history.length > 20) this.history.pop();

    return report;
  }

  async getStatus() {
    const analysis = await this.analyzeSkew();
    return {
      skewAnalysis: analysis,
      lastRun: this.lastRun,
      lastReport: this.lastReport,
      historyLength: this.history.length,
    };
  }
}

module.exports = new RebalanceService();
