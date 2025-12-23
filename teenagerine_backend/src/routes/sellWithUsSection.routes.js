const express = require('express');
const router = express.Router();
const { 
  getSection, 
  updateSection, 
  updateFeature, 
  addFeature, 
  deleteFeature, 
  updateFeatureOrder, 
  toggleFeatureActive,
  uploadImage,
  seedSection
} = require('../controllers/sellWithUsSection.controller');
const { protect, restrictTo } = require('../middlewares/auth.middleware');

// Public routes
router.get('/', getSection);

// Admin routes
router.post('/seed', protect, restrictTo('admin'), seedSection);
router.patch('/', protect, restrictTo('admin'), uploadImage, updateSection);
router.post('/features', protect, restrictTo('admin'), addFeature);
router.patch('/features/:featureId', protect, restrictTo('admin'), updateFeature);
router.delete('/features/:featureId', protect, restrictTo('admin'), deleteFeature);
router.patch('/features-order', protect, restrictTo('admin'), updateFeatureOrder);
router.patch('/features/:featureId/toggle', protect, restrictTo('admin'), toggleFeatureActive);

module.exports = router;