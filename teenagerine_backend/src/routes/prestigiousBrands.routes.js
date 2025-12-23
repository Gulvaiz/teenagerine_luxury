const express = require('express');
const router = express.Router();
const { 
  getSection, 
  updateSection, 
  addFeaturedItem, 
  updateFeaturedItem, 
  deleteFeaturedItem, 
  updateFeaturedItemOrder, 
  toggleFeaturedItemActive,
  uploadImages,
  seedSection
} = require('../controllers/prestigiousBrands.controller');
const { protect, restrictTo } = require('../middlewares/auth.middleware');

// Public routes
router.get('/', getSection);

// Admin routes
router.post('/seed', protect, restrictTo('admin'), seedSection);
router.patch('/', protect, restrictTo('admin'), uploadImages, updateSection);
router.post('/featured-items', protect, restrictTo('admin'), uploadImages, addFeaturedItem);
router.patch('/featured-items/:itemId', protect, restrictTo('admin'), uploadImages, updateFeaturedItem);
router.delete('/featured-items/:itemId', protect, restrictTo('admin'), deleteFeaturedItem);
router.patch('/featured-items-order', protect, restrictTo('admin'), updateFeaturedItemOrder);
router.patch('/featured-items/:itemId/toggle', protect, restrictTo('admin'), toggleFeaturedItemActive);

module.exports = router;