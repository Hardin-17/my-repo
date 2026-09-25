const express = require('express');
const multer = require('multer');
const router = express.Router();
const { upload, listObjects, getObject, getReplicas, download } = require('../controllers/objectController');
const { protect } = require('../middleware/authMiddleware');
const config = require('../config/env');

// Configure multer memory storage with upload size limit
const storage = multer.memoryStorage();
const uploadMiddleware = multer({
  storage,
  limits: {
    fileSize: config.maxUploadSizeMb * 1024 * 1024,
  },
});

// All object routes require JWT authentication
router.use(protect);

router.post('/', uploadMiddleware.single('file'), upload);
router.get('/', listObjects);
router.get('/:id', getObject);
router.get('/:id/replicas', getReplicas);
router.get('/:id/download', download);

module.exports = router;
