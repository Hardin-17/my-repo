const Node = require('../models/Node');
const VaultObject = require('../models/VaultObject');
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

    const totalObjects = await VaultObject.countDocuments({ ownerId: req.user._id });
    const userObjects = await VaultObject.find({ ownerId: req.user._id }).lean();

    const healthyObjects = userObjects.filter((o) => o.status === 'HEALTHY').length;
    const degradedObjects = userObjects.filter((o) => o.status === 'DEGRADED').length;
    const corruptedObjects = userObjects.filter((o) => o.status === 'CORRUPTED').length;

    const totalReplicas = userObjects.reduce((acc, o) => acc + (o.replicas ? o.replicas.length : 0), 0);

    // Dynamic SLA calculation based on healthy vs total nodes
    const sla = totalNodes > 0 ? ((healthyNodes / totalNodes) * 100).toFixed(2) : '100.00';

    const recentActivities = await getRecentActivities(15);

    const metrics = {
      clusterHealth:
        offlineNodes > 0 || corruptedObjects > 0
          ? 'Warning'
          : repairingNodes > 0
          ? 'Repairing'
          : 'Healthy',
      sla: `${sla}%`,
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
      },
      objects: {
        total: totalObjects,
        healthy: healthyObjects,
        degraded: degradedObjects,
        corrupted: corruptedObjects,
        totalReplicas,
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
