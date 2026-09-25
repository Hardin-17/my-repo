const objectService = require('../services/objectService');
const { successResponse, errorResponse } = require('../utils/response');

const upload = async (req, res, next) => {
  try {
    const file = req.file;
    const replicationFactor = req.body.replicationFactor || 3;

    const object = await objectService.uploadObject({
      file,
      ownerId: req.user._id,
      replicationFactor,
    });

    return successResponse(res, object, 'Object uploaded and replicated successfully', 201);
  } catch (error) {
    if (error.statusCode) {
      return errorResponse(res, error.message, error.statusCode);
    }
    next(error);
  }
};

const listObjects = async (req, res, next) => {
  try {
    const objects = await objectService.listUserObjects(req.user._id);
    return successResponse(res, objects, 'Objects retrieved successfully');
  } catch (error) {
    if (error.statusCode) {
      return errorResponse(res, error.message, error.statusCode);
    }
    next(error);
  }
};

const getObject = async (req, res, next) => {
  try {
    const { id } = req.params;
    const object = await objectService.getObjectById(id, req.user._id);
    return successResponse(res, object, 'Object details retrieved successfully');
  } catch (error) {
    if (error.statusCode) {
      return errorResponse(res, error.message, error.statusCode);
    }
    next(error);
  }
};

const getReplicas = async (req, res, next) => {
  try {
    const { id } = req.params;
    const replicas = await objectService.getObjectReplicas(id, req.user._id);
    return successResponse(res, replicas, 'Replicas retrieved successfully');
  } catch (error) {
    if (error.statusCode) {
      return errorResponse(res, error.message, error.statusCode);
    }
    next(error);
  }
};

const download = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { stream, originalName, mimeType, size, checksum } =
      await objectService.downloadObject(id, req.user._id);

    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Length', size);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(originalName)}"`
    );
    res.setHeader('ETag', `"${checksum}"`);

    stream.pipe(res);
  } catch (error) {
    if (error.statusCode) {
      return errorResponse(res, error.message, error.statusCode);
    }
    next(error);
  }
};

module.exports = {
  upload,
  listObjects,
  getObject,
  getReplicas,
  download,
};
