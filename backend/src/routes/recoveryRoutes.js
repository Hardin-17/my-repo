const express = require('express');
const router = express.Router();
const { getJobs, getJob, getMetrics, repairObject } = require('../controllers/recoveryController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/jobs', getJobs);
router.get('/jobs/:jobId', getJob);
router.get('/metrics', getMetrics);
router.post('/repair/object/:objectId', repairObject);

module.exports = router;
