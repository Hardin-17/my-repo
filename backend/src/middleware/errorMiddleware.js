const config = require('../config/env');
const { errorResponse } = require('../utils/response');

const notFound = (req, res, next) => {
  return errorResponse(res, `Route not found: ${req.originalUrl}`, 404, null, 'ROUTE_NOT_FOUND');
};

const errorHandler = (err, req, res, next) => {
  // Server-side logging with request ID
  const reqId = req.id ? `[${req.id}] ` : '';
  console.error(`${reqId}[Error] ${err.stack || err.message}`);

  const statusCode = err.statusCode || (res.statusCode === 200 ? 500 : res.statusCode);
  
  // Safe user-facing message in production (mask raw internal crash details if 500)
  const isProd = config.nodeEnv === 'production';
  const message =
    isProd && statusCode === 500
      ? 'An unexpected internal server error occurred'
      : err.message || 'Internal Server Error';

  const errors = !isProd && err.stack ? { stack: err.stack } : undefined;

  return errorResponse(res, message, statusCode, errors);
};

module.exports = {
  notFound,
  errorHandler,
};
