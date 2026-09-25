const express = require('express');
const router = express.Router();
const { nodeFailure, nodeRecover, corruptReplica } = require('../controllers/chaosController');
const { protect } = require('../middleware/authMiddleware');

// All chaos operations require JWT authentication
router.use(protect);

router.post('/node-failure', nodeFailure);
router.post('/node-recover', nodeRecover);
router.post('/corrupt-replica', corruptReplica);

module.exports = router;
