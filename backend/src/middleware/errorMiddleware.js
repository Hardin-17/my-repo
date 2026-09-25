const config = require('../config/env');
const { errorResponse } = require('../utils/response');

const notFound = (req, res, next) => {
  return errorResponse(res, `Route not found: ${req.originalUrl}`, 404);
};

const errorHandler = (err, req, res, next) => {
  console.error(`[Error] ${err.stack || err.message}`);

  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  const message = err.message || 'Internal Server Error';

  return errorResponse(
    res,
    message,
    statusCode,
    config.nodeEnv === 'development' ? { stack: err.stack } : undefined
  );
};

module.exports = {
  notFound,
  errorHandler,
};
