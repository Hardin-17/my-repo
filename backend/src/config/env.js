const dotenv = require('dotenv');

dotenv.config();

const nodeEnv = process.env.NODE_ENV || 'development';

const config = {
  port: parseInt(process.env.PORT, 10) || 5000,
  nodeEnv,
  mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/vault',
  jwtSecret: process.env.JWT_SECRET || (nodeEnv === 'production' ? '' : 'fallback_dev_secret_change_in_production'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  corsOrigin: process.env.CORS_ORIGIN || process.env.CLIENT_URL || 'http://localhost:3000',
  clientUrl: process.env.CORS_ORIGIN || process.env.CLIENT_URL || 'http://localhost:3000',
  maxUploadSizeMb: parseInt(process.env.MAX_UPLOAD_SIZE_MB, 10) || 500,
  storagePath: process.env.STORAGE_PATH || require('path').resolve(__dirname, '../../storage'),
  nodeHeartbeatTimeoutMs: parseInt(process.env.NODE_HEARTBEAT_TIMEOUT_MS, 10) || 15000,
  integrityScanIntervalMs: parseInt(process.env.INTEGRITY_SCAN_INTERVAL_MS, 10) || 60000,
  integrityScanBatchSize: parseInt(process.env.INTEGRITY_SCAN_BATCH_SIZE, 10) || 10,
  maxConcurrentRepairs: parseInt(process.env.MAX_CONCURRENT_REPAIRS, 10) || 3,
  rebalanceThresholdPercent: parseInt(process.env.REBALANCE_THRESHOLD_PERCENT, 10) || 20,
  defaultDurabilityPolicy: process.env.DEFAULT_DURABILITY_POLICY || 'QUORUM',
  defaultReadPolicy: process.env.DEFAULT_READ_POLICY || 'ANY_HEALTHY',
  aiProvider: process.env.AI_PROVIDER || 'gemini',
  aiModel: process.env.AI_MODEL || 'gemini-1.5-flash',
  aiApiKey: process.env.AI_API_KEY || process.env.GEMINI_API_KEY || '',
  geminiApiKey: process.env.AI_API_KEY || process.env.GEMINI_API_KEY || '',
  demoMode: process.env.DEMO_MODE ? process.env.DEMO_MODE === 'true' : nodeEnv !== 'production',
};

// Production environment startup validation
if (config.nodeEnv === 'production') {
  if (!process.env.JWT_SECRET) {
    throw new Error('FATAL: JWT_SECRET environment variable must be set in production!');
  }
  if (!process.env.MONGODB_URI) {
    throw new Error('FATAL: MONGODB_URI environment variable must be set in production!');
  }
  if (config.corsOrigin === '*') {
    throw new Error('FATAL: CORS_ORIGIN cannot be "*" in production when credentials are enabled!');
  }
}

module.exports = config;
