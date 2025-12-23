const express = require('express');
const router = express.Router();
const { getContentByType, updateContent, getAllContent } = require('../controllers/content.controller');
const { protect, restrictTo } = require('../middlewares/auth.middleware');

// Public routes
router.get('/:type', getContentByType);

// Admin routes
router.use(protect);
router.use(restrictTo('admin'));
router.get('/', getAllContent);
router.put('/:type', updateContent);

module.exports = router;