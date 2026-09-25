const repairService = require('../services/repairService');
const VaultObject = require('../models/VaultObject');
const { successResponse, errorResponse } = require('../utils/response');

const getJobs = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 50;
    const jobs = await repairService.getAllJobs(limit);
    return successResponse(res, jobs, 'Repair jobs retrieved successfully');
  } catch (error) {
    next(error);
  }
};

const getJob = async (req, res, next) => {
  try {
    const { jobId } = req.params;
    const job = await repairService.getJobById(jobId);
    if (!job) {
      return errorResponse(res, `Repair job ${jobId} not found`, 404);
    }
    return successResponse(res, job, 'Repair job details retrieved successfully');
  } catch (error) {
    next(error);
  }
};

const getMetrics = async (req, res, next) => {
  try {
    const metrics = await repairService.getRecoveryMetrics();
    return successResponse(res, metrics, 'Recovery metrics calculated successfully');
  } catch (error) {
    next(error);
  }
};

const repairObject = async (req, res, next) => {
  try {
    const { objectId } = req.params;

    const obj = await VaultObject.findOne({ objectId });
    if (!obj) {
      return errorResponse(res, `Object ${objectId} not found`, 404);
    }

    if (obj.ownerId.toString() !== req.user._id.toString()) {
      return errorResponse(res, 'Access denied: You do not own this object', 403);
    }

    const healthyReplicas = obj.replicas.filter((r) => r.status === 'HEALTHY').length;
    if (healthyReplicas >= obj.replicationFactor) {
      return successResponse(
        res,
        { objectId, status: 'HEALTHY', message: 'Object already meets target replication factor' },
        'Object already fully replicated'
      );
    }

    const job = await repairService.createRepairJob({
      objectId,
      reason: 'MANUAL_REPAIR',
    });

    return successResponse(res, job, 'Self-healing repair job scheduled successfully', 201);
  } catch (error) {
    if (error.statusCode) {
      return errorResponse(res, error.message, error.statusCode);
    }
    next(error);
  }
};

module.exports = {
  getJobs,
  getJob,
  getMetrics,
  repairObject,
};
