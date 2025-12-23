const express = require('express');
const router = express.Router();
const mediaController = require('../controllers/media.controller');
const { protect, restrictTo } = require('../middlewares/auth.middleware');
const upload = require('../utils/multer');

// Get media gallery (with filters)
router.get('/gallery', protect, restrictTo('admin'), mediaController.getMediaGallery);

// Get files by folder
router.get('/folder/:folder', protect, restrictTo('admin'), mediaController.getFilesByFolder);

// Upload with gallery response
router.post('/upload', protect, restrictTo('admin'), upload.single('file'), mediaController.uploadWithGallery);

// Delete media file
router.delete('/delete', protect, restrictTo('admin'), mediaController.deleteMediaFile);

// Get file info
router.get('/info', protect, restrictTo('admin'), mediaController.getFileInfo);

module.exports = router;