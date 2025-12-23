const express = require('express');
const router = express.Router();
const { 
  getSection, 
  updateSection, 
  addFeature, 
  updateFeature, 
  deleteFeature, 
  updateFeatureOrder, 
  toggleFeatureActive,
  addTestimonial,
  updateTestimonial,
  deleteTestimonial,
  updateTestimonialOrder,
  toggleTestimonialActive,
  uploadImage,
  seedSection
} = require('../controllers/aboutSection.controller');
const { protect, restrictTo } = require('../middlewares/auth.middleware');

// Public routes
router.get('/', getSection);

// Admin routes
router.post('/seed', protect, restrictTo('admin'), seedSection);
router.patch('/', protect, restrictTo('admin'), uploadImage, updateSection);

// Feature routes
router.post('/features', protect, restrictTo('admin'), addFeature);
router.patch('/features/:featureId', protect, restrictTo('admin'), updateFeature);
router.delete('/features/:featureId', protect, restrictTo('admin'), deleteFeature);
router.patch('/features-order', protect, restrictTo('admin'), updateFeatureOrder);
router.patch('/features/:featureId/toggle', protect, restrictTo('admin'), toggleFeatureActive);

// Testimonial routes
router.post('/testimonials', protect, restrictTo('admin'), addTestimonial);
router.patch('/testimonials/:testimonialId', protect, restrictTo('admin'), updateTestimonial);
router.delete('/testimonials/:testimonialId', protect, restrictTo('admin'), deleteTestimonial);
router.patch('/testimonials-order', protect, restrictTo('admin'), updateTestimonialOrder);
router.patch('/testimonials/:testimonialId/toggle', protect, restrictTo('admin'), toggleTestimonialActive);

module.exports = router;