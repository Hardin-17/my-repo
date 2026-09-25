const config = require('../config/env');
const { getDbStatus } = require('../config/db');

/**
 * Health check endpoint controller
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
    timestamp: new Date().toISOString(),
  });
};

module.exports = {
  getHealth,
};
