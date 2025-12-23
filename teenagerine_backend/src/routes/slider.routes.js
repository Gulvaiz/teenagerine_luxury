const express = require('express');
const router = express.Router();
const { 
  getAllSliders, 
  getSliderById, 
  createSlider, 
  updateSlider, 
  deleteSlider, 
  updateSliderOrder, 
  toggleSliderActive,
  uploadImage
} = require('../controllers/slider.controller');
const { protect, restrictTo } = require('../middlewares/auth.middleware');

// Public routes
router.get('/', getAllSliders);
router.get('/:id', getSliderById);

// Admin routes
router.post('/', protect, restrictTo('admin'), uploadImage, createSlider);
router.patch('/:id', protect, restrictTo('admin'), uploadImage, updateSlider);
router.delete('/:id', protect, restrictTo('admin'), deleteSlider);
router.patch('/order', protect, restrictTo('admin'), updateSliderOrder);
router.patch('/:id/toggle', protect, restrictTo('admin'), toggleSliderActive);

module.exports = router;