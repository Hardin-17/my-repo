const objectService = require('../services/objectService');
const { successResponse, errorResponse } = require('../utils/response');

const upload = async (req, res, next) => {
  try {
    const file = req.file;
    const replicationFactor = req.body.replicationFactor || 3;
    const durabilityPolicy = req.body.durabilityPolicy;
    const readPolicy = req.body.readPolicy;

    const object = await objectService.uploadObject({
      file,
      ownerId: req.user._id,
      replicationFactor,
      durabilityPolicy,
      readPolicy,
    });

    return successResponse(res, object, 'Object uploaded and replicated successfully', 201);
  } catch (error) {
    if (error.statusCode) {
      return errorResponse(res, error.message, error.statusCode);
    }
    next(error);
  }
};

const update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const file = req.file;
    const durabilityPolicy = req.body.durabilityPolicy;
    const readPolicy = req.body.readPolicy;

    const object = await objectService.updateObject({
      objectId: id,
      file,
      ownerId: req.user._id,
      durabilityPolicy,
      readPolicy,
    });

    return successResponse(res, object, `Object ${id} updated to version ${object.version} successfully`);
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
    const readPolicyOverride = req.query.readPolicy || req.headers['x-read-policy'] || null;

    const { stream, originalName, mimeType, size, checksum, version, selectedNodeId, readPolicy } =
      await objectService.downloadObject(id, req.user._id, readPolicyOverride);

    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Length', size);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(originalName)}"`
    );
    res.setHeader('ETag', `"${checksum}"`);
    res.setHeader('X-Object-Version', version);
    res.setHeader('X-Served-By-Node', selectedNodeId);
    res.setHeader('X-Read-Policy', readPolicy);

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
  update,
  listObjects,
  getObject,
  getReplicas,
  download,
};
