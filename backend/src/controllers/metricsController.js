const Node = require('../models/Node');
const VaultObject = require('../models/VaultObject');
const RepairJob = require('../models/RepairJob');
const { getRecentActivities } = require('../services/activityService');
const { successResponse, errorResponse } = require('../utils/response');

const getMetrics = async (req, res, next) => {
  try {
    const nodes = await Node.find().lean();
    const totalNodes = nodes.length;
    const healthyNodes = nodes.filter((n) => n.status === 'ONLINE').length;
    const degradedNodes = nodes.filter((n) => n.status === 'DEGRADED').length;
    const offlineNodes = nodes.filter((n) => n.status === 'OFFLINE').length;
    const repairingNodes = nodes.filter((n) => n.status === 'REPAIRING').length;

    const totalCapacity = nodes.reduce((acc, n) => acc + (n.capacity || 0), 0);
    const totalUsedStorage = nodes.reduce((acc, n) => acc + (n.usedStorage || 0), 0);

    const userObjects = await VaultObject.find({ ownerId: req.user._id }).lean();
    const totalObjects = userObjects.length;

    const healthyObjects = userObjects.filter((o) => o.status === 'HEALTHY').length;
    const degradedObjects = userObjects.filter((o) => o.status === 'DEGRADED').length;
    const corruptedObjects = userObjects.filter((o) => o.status === 'CORRUPTED').length;

    let totalReplicas = 0;
    let corruptedReplicas = 0;
    let logicalBytes = 0;
    let physicalBytes = 0;

    userObjects.forEach((o) => {
      logicalBytes += o.size || 0;
      if (o.replicas) {
        totalReplicas += o.replicas.length;
        o.replicas.forEach((r) => {
          if (r.status === 'CORRUPTED') corruptedReplicas++;
          physicalBytes += r.size || 0;
        });
      }
    });

    const activeRepairs = await RepairJob.countDocuments({
      status: { $in: ['QUEUED', 'RUNNING', 'VERIFYING'] },
    });
    const completedRepairs = await RepairJob.countDocuments({ status: 'COMPLETED' });

    // Dynamic SLA calculation based on healthy vs total nodes
    const sla = totalNodes > 0 ? ((healthyNodes / totalNodes) * 100).toFixed(2) : '100.00';

    // Replication health percentage
    const replicationHealth =
      totalObjects > 0
        ? ((healthyObjects / totalObjects) * 100).toFixed(1)
        : '100.0';

    // Storage Overhead Calculation
    const overheadPercentage =
      logicalBytes > 0
        ? (((physicalBytes - logicalBytes) / logicalBytes) * 100).toFixed(1)
        : '0.0';

    const recentActivities = await getRecentActivities(20);

    const metrics = {
      clusterHealth:
        offlineNodes > 0 || corruptedObjects > 0
          ? 'Warning'
          : activeRepairs > 0 || repairingNodes > 0
          ? 'Repairing'
          : 'Healthy',
      sla: `${sla}%`,
      replicationHealth: `${replicationHealth}%`,
      nodes: {
        total: totalNodes,
        healthy: healthyNodes,
        degraded: degradedNodes,
        offline: offlineNodes,
        repairing: repairingNodes,
      },
      storage: {
        totalBytes: totalCapacity,
        usedBytes: totalUsedStorage,
        availableBytes: Math.max(0, totalCapacity - totalUsedStorage),
        utilizationPercentage:
          totalCapacity > 0 ? ((totalUsedStorage / totalCapacity) * 100).toFixed(2) : 0,
        overhead: {
          logicalBytes,
          physicalBytes,
          overheadPercentage: `${overheadPercentage}%`,
        },
      },
      objects: {
        total: totalObjects,
        healthy: healthyObjects,
        degraded: degradedObjects,
        corrupted: corruptedObjects,
        totalReplicas,
        corruptedReplicas,
      },
      recovery: {
        activeRepairs,
        completedRepairs,
      },
      recentActivity: recentActivities,
    };

    return successResponse(res, metrics, 'Cluster metrics calculated successfully');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getMetrics,
};
