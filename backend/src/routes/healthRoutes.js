const express = require('express');
const router = express.Router();
const { getHealth, getLiveness, getReadiness } = require('../controllers/healthController');

router.get('/health', getHealth);
router.get('/health/live', getLiveness);
router.get('/health/ready', getReadiness);

module.exports = router;
