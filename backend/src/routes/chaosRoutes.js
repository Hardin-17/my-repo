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

// All chaos operations require JWT authentication
router.use(protect);

router.post('/node-failure', nodeFailure);
router.post('/node-recover', nodeRecover);
router.post('/corrupt-replica', corruptReplica);
router.post('/network-partition', createNetworkPartition);
router.post('/network-partition/recover', recoverNetworkPartition);
router.get('/network-partitions', listNetworkPartitions);

module.exports = router;
