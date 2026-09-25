const express = require('express');
const cors = require('cors');
const config = require('./config/env');
const { connectDB } = require('./config/db');
const routes = require('./routes');
const { notFound, errorHandler } = require('./middleware/errorMiddleware');

const app = express();

// Initialize MongoDB connection and cluster services
connectDB().then(async () => {
  const { initializeDefaultNodes, startHeartbeatSimulation } = require('./services/nodeService');
  await initializeDefaultNodes();
  startHeartbeatSimulation();
});

// Core Middleware
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, or Postman)
      if (!origin) return callback(null, true);
      // In development allow localhost origins
      if (
        config.nodeEnv === 'development' ||
        origin === config.clientUrl ||
        origin.startsWith('http://localhost:')
      ) {
        return callback(null, true);
      }
      return callback(new Error('Blocked by CORS policy'));
    },
    credentials: true,
  })
);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging in development
if (config.nodeEnv === 'development') {
  app.use((req, res, next) => {
    console.log(`[HTTP] ${req.method} ${req.url}`);
    next();
  });
}

// API Routes
app.use('/api', routes);

// Error Handling Middleware
app.use(notFound);
app.use(errorHandler);

// Start server
const PORT = config.port;
const server = app.listen(PORT, () => {
  console.log(`===============================================`);
  console.log(`  VAULT Control-Plane API Server Running`);
  console.log(`  Mode:        ${config.nodeEnv}`);
  console.log(`  Port:        ${PORT}`);
  console.log(`  Health:      http://localhost:${PORT}/api/health`);
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
