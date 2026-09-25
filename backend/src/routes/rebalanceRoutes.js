const express = require('express');
const router = express.Router();
const { triggerRebalance, getStatus } = require('../controllers/rebalanceController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.post('/trigger', triggerRebalance);
router.get('/status', getStatus);

module.exports = router;
