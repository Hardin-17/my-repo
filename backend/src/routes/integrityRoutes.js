const express = require('express');
const router = express.Router();
const { verifyObject } = require('../controllers/integrityController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.post('/verify/:objectId', verifyObject);

module.exports = router;
