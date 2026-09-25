const chaosService = require('../services/chaosService');
const networkService = require('../services/networkService');
const { successResponse, errorResponse } = require('../utils/response');

const nodeFailure = async (req, res, next) => {
  try {
    const { nodeId, reason } = req.body;
    if (!nodeId) {
      return errorResponse(res, 'nodeId is required', 400);
    }

    const result = await chaosService.injectNodeFailure(nodeId, req.user._id, reason);
    return successResponse(res, result, `Node ${nodeId} marked OFFLINE (Chaos Injected)`);
  } catch (error) {
    if (error.statusCode) {
      return errorResponse(res, error.message, error.statusCode);
    }
    next(error);
  }
};

const nodeRecover = async (req, res, next) => {
  try {
    const { nodeId } = req.body;
    if (!nodeId) {
      return errorResponse(res, 'nodeId is required', 400);
    }

    const result = await chaosService.recoverNode(nodeId, req.user._id);
    return successResponse(res, result, `Node ${nodeId} recovered successfully`);
  } catch (error) {
    if (error.statusCode) {
      return errorResponse(res, error.message, error.statusCode);
    }
    next(error);
  }
};

const corruptReplica = async (req, res, next) => {
  try {
    const { objectId, nodeId } = req.body;
    if (!objectId || !nodeId) {
      return errorResponse(res, 'objectId and nodeId are both required', 400);
    }

    const result = await chaosService.corruptReplica({
      objectId,
      nodeId,
      userId: req.user._id,
    });
    return successResponse(res, result, `Replica on ${nodeId} corrupted with controlled bit rot`);
  } catch (error) {
    if (error.statusCode) {
      return errorResponse(res, error.message, error.statusCode);
    }
    next(error);
  }
};

const createNetworkPartition = async (req, res, next) => {
  try {
    const { groups, isolatedNodes, reason } = req.body;
    const partition = await networkService.createPartition({
      groups,
      isolatedNodes,
      reason,
      userId: req.user._id,
    });
    return successResponse(
      res,
      partition,
      `Network partition created (${partition.blockedPairs.length / 2} blocked node links)`,
      201
    );
  } catch (error) {
    if (error.statusCode) {
      return errorResponse(res, error.message, error.statusCode);
    }
    next(error);
  }
};

const recoverNetworkPartition = async (req, res, next) => {
  try {
    const { partitionId } = req.body;
    if (partitionId) {
      const partition = await networkService.recoverPartition(partitionId, req.user._id);
      return successResponse(res, partition, `Network partition ${partitionId} resolved`);
    } else {
      const result = await networkService.recoverAllPartitions(req.user._id);
      return successResponse(res, result, 'All active network partitions recovered');
    }
  } catch (error) {
    if (error.statusCode) {
      return errorResponse(res, error.message, error.statusCode);
    }
    next(error);
  }
};

const listNetworkPartitions = async (req, res, next) => {
  try {
    const active = await networkService.getActivePartitions();
    const all = await networkService.getAllPartitions(20);
    return successResponse(res, { active, all }, 'Network partitions retrieved');
  } catch (error) {
    if (error.statusCode) {
      return errorResponse(res, error.message, error.statusCode);
    }
    next(error);
  }
};

module.exports = {
  nodeFailure,
  nodeRecover,
  corruptReplica,
  createNetworkPartition,
  recoverNetworkPartition,
  listNetworkPartitions,
};
