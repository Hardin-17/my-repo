const crypto = require('crypto');

/**
 * Request ID and Production-friendly Structured Logging Middleware
 */
const requestLogger = (req, res, next) => {
  // Generate or forward request ID
  const requestId = req.headers['x-request-id'] || crypto.randomUUID();
  req.id = requestId;
  res.setHeader('X-Request-Id', requestId);

  const startTime = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const logData = {
      timestamp: new Date().toISOString(),
      level: res.statusCode >= 500 ? 'ERROR' : res.statusCode >= 400 ? 'WARN' : 'INFO',
      requestId,
      method: req.method,
      path: req.originalUrl || req.url,
      status: res.statusCode,
      durationMs: duration,
    };

    // Attach contextual metadata if set by controllers
    if (req.objectId) logData.objectId = req.objectId;
    if (req.nodeId) logData.nodeId = req.nodeId;
    if (req.repairJobId) logData.repairJobId = req.repairJobId;

    if (process.env.NODE_ENV === 'production') {
      console.log(JSON.stringify(logData));
    } else {
      console.log(
        `[${logData.timestamp}] [${logData.level}] [${requestId.substring(0, 8)}] ${logData.method} ${logData.path} -> ${logData.status} (${duration}ms)`
      );
    }
  });

  next();
};

module.exports = {
  requestLogger,
};
