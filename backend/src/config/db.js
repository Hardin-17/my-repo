const mongoose = require('mongoose');
const config = require('./env');

let isConnected = false;
let memoryServer = null;

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(config.mongoUri, {
      serverSelectionTimeoutMS: 2000,
    });
    isConnected = true;
    console.log(`[Database] MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.warn(`[Database] MongoDB connection to ${config.mongoUri} unavailable: ${error.message}`);
    
    // In development/test mode, fall back to embedded in-memory MongoDB
    if (config.nodeEnv !== 'production') {
      try {
        console.log('[Database] Initializing embedded MongoDB memory engine for local development...');
        const { MongoMemoryServer } = require('mongodb-memory-server');
        memoryServer = await MongoMemoryServer.create();
        const memoryUri = memoryServer.getUri();
        const conn = await mongoose.connect(memoryUri);
        isConnected = true;
        console.log(`[Database] Embedded MongoDB Engine Connected: ${memoryUri}`);
        return conn;
      } catch (memErr) {
        console.error('[Database] Failed to initialize embedded MongoDB engine:', memErr.message);
      }
    }
    
    isConnected = false;
    console.warn(`[Database] Running in disconnected state. Database features will return 503.`);
  }
};

const getDbStatus = () => {
  return {
    isConnected,
    readyState: mongoose.connection.readyState,
  };
};

module.exports = {
  connectDB,
  getDbStatus,
};
