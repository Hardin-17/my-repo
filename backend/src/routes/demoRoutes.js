const express = require('express');
const router = express.Router();
const { resetDemoCluster } = require('../controllers/demoController');
const { protect } = require('../middleware/authMiddleware');

// Demo reset requires authentication
router.use(protect);

router.post('/reset', resetDemoCluster);

module.exports = router;
