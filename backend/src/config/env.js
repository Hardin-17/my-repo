const dotenv = require('dotenv');

dotenv.config();

const config = {
  port: parseInt(process.env.PORT, 10) || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/vault',
  jwtSecret: process.env.JWT_SECRET || 'fallback_dev_secret_change_in_production',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:3000',
  maxUploadSizeMb: parseInt(process.env.MAX_UPLOAD_SIZE_MB, 10) || 500,
  storagePath: process.env.STORAGE_PATH || require('path').resolve(__dirname, '../../storage'),
};

if (config.nodeEnv === 'production') {
  if (!process.env.JWT_SECRET) {
    throw new Error('FATAL: JWT_SECRET environment variable must be set in production!');
  }
  if (!process.env.MONGODB_URI) {
    throw new Error('FATAL: MONGODB_URI environment variable must be set in production!');
  }
}

module.exports = config;
