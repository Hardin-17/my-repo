const express = require('express');
const router = express.Router();
const { chat, executeAction } = require('../controllers/aiController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.post('/chat', chat);
router.post('/execute-action', executeAction);

module.exports = router;
