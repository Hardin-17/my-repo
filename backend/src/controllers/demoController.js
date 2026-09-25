const fs = require('fs');
const path = require('path');
const Node = require('../models/Node');
const VaultObject = require('../models/VaultObject');
const RepairJob = require('../models/RepairJob');
const NetworkPartition = require('../models/NetworkPartition');
const Activity = require('../models/Activity');
const nodeService = require('../services/nodeService');
const networkService = require('../services/networkService');
const config = require('../config/env');
const { successResponse, errorResponse } = require('../utils/response');

/**
 * Development & Demo-only Cluster Reset
 * POST /api/demo/reset
 */
const resetDemoCluster = async (req, res, next) => {
  try {
    // Strict production guard
    if (config.nodeEnv === 'production' && !config.demoMode) {
      return errorResponse(
        res,
        'Demo reset operation is strictly disabled in production environments',
        403,
        null,
        'FORBIDDEN'
      );
    }

    // 1. Clear network partitions
    await networkService.recoverAllPartitions(req.user?._id);
    await NetworkPartition.deleteMany({});

    // 2. Clear objects and repair jobs
    await VaultObject.deleteMany({});
    await RepairJob.deleteMany({});

    // 3. Clear physical disk files in storage node directories
    const basePath = path.resolve(config.storagePath);
    if (fs.existsSync(basePath)) {
      const nodeDirs = fs.readdirSync(basePath);
      for (const dir of nodeDirs) {
        if (dir.startsWith('node-')) {
          const fullNodeDir = path.join(basePath, dir);
          if (fs.existsSync(fullNodeDir)) {
            const files = fs.readdirSync(fullNodeDir);
            for (const f of files) {
              const fPath = path.join(fullNodeDir, f);
              try {
                fs.rmSync(fPath, { recursive: true, force: true });
              } catch (rmErr) {
                // Ignore
              }
            }
          }
        }
      }
    }

    // 4. Reset nodes in database to fresh ONLINE state
    await Node.deleteMany({});
    await nodeService.initializeDefaultNodes();

    // 5. Log audit activity
    await Activity.create({
      eventType: 'SYSTEM_MAINTENANCE',
      message: 'Demo cluster state reset to factory baseline',
      userId: req.user?._id,
      severity: 'WARNING',
    });

    return successResponse(
      res,
      {
        reset: true,
        environment: config.nodeEnv,
        demoMode: config.demoMode,
        nodesInitialized: 5,
        timestamp: new Date().toISOString(),
      },
      'Demo cluster reset to clean baseline successfully'
    );
  } catch (error) {
    next(error);
  }
};

module.exports = {
  resetDemoCluster,
};
