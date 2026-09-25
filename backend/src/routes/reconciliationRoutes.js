const express = require('express');
const router = express.Router();
const { scan, reconcile } = require('../controllers/reconciliationController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.post('/scan', scan);
router.post('/reconcile', reconcile);

module.exports = router;
