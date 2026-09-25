const express = require('express');
const router = express.Router();
const {
  nodeFailure,
  nodeRecover,
  corruptReplica,
  createNetworkPartition,
  recoverNetworkPartition,
  listNetworkPartitions,
} = require('../controllers/chaosController');
const { protect } = require('../middleware/authMiddleware');
const { chaosLimiter } = require('../middleware/rateLimitMiddleware');

// All chaos operations require JWT authentication and rate limiting
router.use(protect);
router.use(chaosLimiter);

router.post('/node-failure', nodeFailure);
router.post('/node-recover', nodeRecover);
router.post('/corrupt-replica', corruptReplica);
router.post('/network-partition', createNetworkPartition);
router.post('/network-partition/recover', recoverNetworkPartition);
router.get('/network-partitions', listNetworkPartitions);

module.exports = router;
