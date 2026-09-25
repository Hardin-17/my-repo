/**
 * Standardized API response format
 */
const successResponse = (res, data, message = 'Success', statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
};

const errorResponse = (
  res,
  message = 'An error occurred',
  statusCode = 500,
  errors = null,
  code = null
) => {
  const defaultCode =
    statusCode === 404
      ? 'NOT_FOUND'
      : statusCode === 401
      ? 'UNAUTHORIZED'
      : statusCode === 403
      ? 'FORBIDDEN'
      : statusCode === 400
      ? 'VALIDATION_FAILED'
      : statusCode === 409
      ? 'CONFLICT'
      : statusCode === 413
      ? 'PAYLOAD_TOO_LARGE'
      : statusCode === 503
      ? 'SERVICE_UNAVAILABLE'
      : 'INTERNAL_SERVER_ERROR';

  const payload = {
    success: false,
    message,
    error: {
      code: code || defaultCode,
      message,
    },
  };

  if (errors) {
    payload.errors = errors;
  }

  return res.status(statusCode).json(payload);
};

module.exports = {
  successResponse,
  errorResponse,
};
