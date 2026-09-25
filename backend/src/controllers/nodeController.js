const nodeService = require('../services/nodeService');
const { successResponse, errorResponse } = require('../utils/response');

const listNodes = async (req, res, next) => {
  try {
    const nodes = await nodeService.getAllNodes();
    return successResponse(res, nodes, 'Nodes retrieved successfully');
  } catch (error) {
    if (error.statusCode) {
      return errorResponse(res, error.message, error.statusCode);
    }
    next(error);
  }
};

const getNode = async (req, res, next) => {
  try {
    const { id } = req.params;
    const node = await nodeService.getNodeById(id);
    return successResponse(res, node, 'Node details retrieved successfully');
  } catch (error) {
    if (error.statusCode) {
      return errorResponse(res, error.message, error.statusCode);
    }
    next(error);
  }
};

const register = async (req, res, next) => {
  try {
    const { nodeId, name, capacity, zone, address } = req.body;
    if (!nodeId) {
      return errorResponse(res, 'nodeId is required', 400);
    }
    const node = await nodeService.registerNode({ nodeId, name, capacity, zone, address });
    return successResponse(res, node, 'Node registered successfully', 201);
  } catch (error) {
    if (error.statusCode) {
      return errorResponse(res, error.message, error.statusCode);
    }
    next(error);
  }
};

const heartbeat = async (req, res, next) => {
  try {
    const { id } = req.params;
    const node = await nodeService.recordHeartbeat(id);
    return successResponse(res, node, 'Heartbeat recorded successfully');
  } catch (error) {
    if (error.statusCode) {
      return errorResponse(res, error.message, error.statusCode);
    }
    next(error);
  }
};

module.exports = {
  listNodes,
  getNode,
  register,
  heartbeat,
};
