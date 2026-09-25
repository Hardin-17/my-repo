const chaosService = require('../services/chaosService');
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

module.exports = {
  nodeFailure,
  nodeRecover,
  corruptReplica,
};
