const integrityService = require('../services/integrityService');
const VaultObject = require('../models/VaultObject');
const { successResponse, errorResponse } = require('../utils/response');

const verifyObject = async (req, res, next) => {
  try {
    const { objectId } = req.params;

    // Validate ownership
    const obj = await VaultObject.findOne({ objectId });
    if (!obj) {
      return errorResponse(res, `Object ${objectId} not found`, 404);
    }

    if (obj.ownerId.toString() !== req.user._id.toString()) {
      return errorResponse(res, 'Access denied: You do not own this object', 403);
    }

    const result = await integrityService.verifyObject(objectId, req.user._id);
    return successResponse(res, result, 'Cryptographic SHA-256 integrity verification complete');
  } catch (error) {
    if (error.statusCode) {
      return errorResponse(res, error.message, error.statusCode);
    }
    next(error);
  }
};

module.exports = {
  verifyObject,
};
