const rebalanceService = require('../services/rebalanceService');
const { successResponse, errorResponse } = require('../utils/response');

const triggerRebalance = async (req, res, next) => {
  try {
    const maxMoves = parseInt(req.body.maxMoves, 10) || 5;
    const result = await rebalanceService.runRebalance({
      maxMoves,
      userId: req.user._id,
    });
    return successResponse(res, result, 'Rebalance process executed');
  } catch (error) {
    if (error.statusCode) {
      return errorResponse(res, error.message, error.statusCode);
    }
    next(error);
  }
};

const getStatus = async (req, res, next) => {
  try {
    const status = await rebalanceService.getStatus();
    return successResponse(res, status, 'Rebalance status retrieved');
  } catch (error) {
    if (error.statusCode) {
      return errorResponse(res, error.message, error.statusCode);
    }
    next(error);
  }
};

module.exports = {
  triggerRebalance,
  getStatus,
};
