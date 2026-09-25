const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const config = require('./config/env');
const { connectDB } = require('./config/db');
const routes = require('./routes');
const { requestLogger } = require('./middleware/loggingMiddleware');
const { notFound, errorHandler } = require('./middleware/errorMiddleware');

const app = express();

// Initialize MongoDB connection and cluster services
connectDB().then(async () => {
  const { initializeDefaultNodes, startHeartbeatSimulation, startFailureDetector } = require('./services/nodeService');
  const repairService = require('./services/repairService');
  const integrityService = require('./services/integrityService');
  const networkService = require('./services/networkService');

  // Guard demo node seeding in production unless DEMO_MODE=true
  if (config.demoMode) {
    await initializeDefaultNodes();
    startHeartbeatSimulation();
    startFailureDetector();
  }

  await networkService.ensureInitialized();
  repairService.startWorker();
  integrityService.startBackgroundScanner();
});

// Production Security Headers via Helmet
app.use(
  helmet({
    contentSecurityPolicy: false, // Ensure Next.js and dev client scripts are not blocked
    crossOriginEmbedderPolicy: false,
  })
);

// CORS Configuration with strict origin controls
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, or Postman)
      if (!origin) return callback(null, true);

      // In development allow localhost origins
      if (
        config.nodeEnv === 'development' ||
        config.nodeEnv === 'test' ||
        origin === config.corsOrigin ||
        origin === config.clientUrl ||
        origin.startsWith('http://localhost:')
      ) {
        return callback(null, true);
      }

      // In production strictly check against configured CORS_ORIGIN
      if (origin === config.corsOrigin) {
        return callback(null, true);
      }

      return callback(new Error('Blocked by CORS policy'));
    },
    credentials: true,
  })
);

// Request ID and Structured Logging Middleware
app.use(requestLogger);

// Body parsing with size guards
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// API Routes
app.use('/api', routes);

// Error Handling Middleware
app.use(notFound);
app.use(errorHandler);

// Start server on 0.0.0.0 for container / cloud deployment compatibility
const PORT = config.port;
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`===============================================`);
  console.log(`  VAULT Control-Plane API Server Running`);
  console.log(`  Mode:        ${config.nodeEnv}`);
  console.log(`  Port:        ${PORT}`);
  console.log(`  Host:        0.0.0.0`);
  console.log(`  Health:      http://localhost:${PORT}/api/health`);
  console.log(`  Demo Mode:   ${config.demoMode}`);
  console.log(`===============================================`);
});

// Graceful shutdown handling
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
  });
});

module.exports = app;
