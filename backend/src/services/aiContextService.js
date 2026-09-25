const Node = require('../models/Node');
const VaultObject = require('../models/VaultObject');
const RepairJob = require('../models/RepairJob');
const NetworkPartition = require('../models/NetworkPartition');
const { getRecentActivities } = require('./activityService');
const rebalanceService = require('./rebalanceService');

/**
 * Gathers sanitized real-time cluster telemetry for the AI assistant context
 */
const getClusterContext = async (userId = null) => {
  const nodes = await Node.find().lean();
  const totalCapacity = nodes.reduce((acc, n) => acc + (n.capacity || 0), 0);
  const totalUsed = nodes.reduce((acc, n) => acc + (n.usedStorage || 0), 0);

  const objects = await VaultObject.find().lean();
  const healthyObjects = objects.filter((o) => o.status === 'HEALTHY').length;
  const degradedObjects = objects.filter((o) => o.status === 'DEGRADED').length;
  const corruptedObjects = objects.filter((o) => o.status === 'CORRUPTED').length;

  const activeRepairs = await RepairJob.find({
    status: { $in: ['QUEUED', 'RUNNING', 'VERIFYING'] },
  }).lean();

  const activePartitions = await NetworkPartition.find({ status: 'ACTIVE' }).lean();
  const skewAnalysis = await rebalanceService.analyzeSkew();
  const recentActivities = await getRecentActivities(10);

  // Sanitize and structure context
  return {
    clusterStatus:
      nodes.some((n) => n.status === 'OFFLINE') || corruptedObjects > 0
        ? 'DEGRADED'
        : activeRepairs.length > 0
        ? 'REPAIRING'
        : 'HEALTHY',
    nodes: nodes.map((n) => ({
      nodeId: n.nodeId,
      name: n.name,
      status: n.status,
      latencyMs: n.latency,
      usedMb: ((n.usedStorage || 0) / (1024 * 1024)).toFixed(1),
      capacityMb: ((n.capacity || 0) / (1024 * 1024)).toFixed(1),
      utilizationPercent: n.capacity > 0 ? (((n.usedStorage || 0) / n.capacity) * 100).toFixed(1) : 0,
    })),
    objects: {
      total: objects.length,
      healthy: healthyObjects,
      degraded: degradedObjects,
      corrupted: corruptedObjects,
    },
    activeRepairs: activeRepairs.map((r) => ({
      jobId: r.jobId,
      objectId: r.objectId,
      status: r.status,
      reason: r.reason,
    })),
    activePartitions: activePartitions.map((p) => ({
      partitionId: p.partitionId,
      groups: p.groups,
      blockedPairsCount: p.blockedPairs?.length || 0,
    })),
    storage: {
      totalCapacityMb: (totalCapacity / (1024 * 1024)).toFixed(1),
      totalUsedMb: (totalUsed / (1024 * 1024)).toFixed(1),
      skewSpreadPercent: skewAnalysis.spreadPercent,
      needsRebalance: skewAnalysis.needsRebalance,
    },
    recentEvents: recentActivities.slice(0, 5).map((a) => `[${a.severity}] ${a.message}`),
  };
};

module.exports = {
  getClusterContext,
};
