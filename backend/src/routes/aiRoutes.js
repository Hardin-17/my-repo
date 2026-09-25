const express = require('express');
const router = express.Router();
const { chat, executeAction } = require('../controllers/aiController');
const { protect } = require('../middleware/authMiddleware');
const { aiLimiter } = require('../middleware/rateLimitMiddleware');

router.use(protect);

router.post('/chat', aiLimiter, chat);
router.post('/execute-action', executeAction);

module.exports = router;
