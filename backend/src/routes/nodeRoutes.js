const express = require('express');
const router = express.Router();
const { listNodes, getNode, register, heartbeat } = require('../controllers/nodeController');
const { protect } = require('../middleware/authMiddleware');

// All node routes require JWT authentication
router.use(protect);

router.get('/', listNodes);
router.get('/:id', getNode);
router.post('/', register);
router.post('/:id/heartbeat', heartbeat);

module.exports = router;
