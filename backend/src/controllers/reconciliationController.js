const reconciliationService = require('../services/reconciliationService');
const { successResponse, errorResponse } = require('../utils/response');

const scan = async (req, res, next) => {
  try {
    const report = await reconciliationService.scanInconsistencies();
    return successResponse(res, report, 'Consistency scan completed');
  } catch (error) {
    if (error.statusCode) {
      return errorResponse(res, error.message, error.statusCode);
    }
    next(error);
  }
};

const reconcile = async (req, res, next) => {
  try {
    const result = await reconciliationService.reconcile({ userId: req.user._id });
    return successResponse(res, result, 'Reconciliation process completed');
  } catch (error) {
    if (error.statusCode) {
      return errorResponse(res, error.message, error.statusCode);
    }
    next(error);
  }
};

module.exports = {
  scan,
  reconcile,
};
