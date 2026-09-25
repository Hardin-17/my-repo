const config = require('../config/env');
const { getDbStatus } = require('../config/db');

/**
 * General health check endpoint
 * GET /api/health
 */
const getHealth = (req, res) => {
  const dbStatus = getDbStatus();

  return res.status(200).json({
    status: 'ok',
    service: 'vault-backend',
    version: '1.0.0',
    environment: config.nodeEnv,
    database: {
      connected: dbStatus.readyState === 1,
      state: dbStatus.readyState === 1 ? 'connected' : 'disconnected',
    },
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  });
};

/**
 * Liveness probe: checks if the process is alive and responsive
 * GET /api/health/live
 */
const getLiveness = (req, res) => {
  return res.status(200).json({
    status: 'alive',
    service: 'vault-backend',
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  });
};

/**
 * Readiness probe: checks if required external dependencies (MongoDB) are available
 * GET /api/health/ready
 */
const getReadiness = (req, res) => {
  const dbStatus = getDbStatus();
  const isDbReady = dbStatus.readyState === 1;

  if (isDbReady) {
    return res.status(200).json({
      status: 'ready',
      database: 'connected',
      timestamp: new Date().toISOString(),
    });
  }

  return res.status(503).json({
    status: 'not_ready',
    database: 'disconnected',
    message: 'Primary database connection is not ready to serve traffic',
    timestamp: new Date().toISOString(),
  });
};

module.exports = {
  getHealth,
  getLiveness,
  getReadiness,
};
