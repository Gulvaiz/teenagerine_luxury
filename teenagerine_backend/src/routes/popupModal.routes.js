const express = require('express');
const router = express.Router();
const { 
  getPopupModal, 
  updatePopupModal, 
  togglePopupModal,
  uploadImages,
  seedPopupModal
} = require('../controllers/popupModal.controller');
const { protect, restrictTo } = require('../middlewares/auth.middleware');

// Public routes
router.get('/', getPopupModal);

// Admin routes
router.post('/seed', protect, restrictTo('admin'), seedPopupModal);
router.patch('/', protect, restrictTo('admin'), uploadImages, updatePopupModal);
router.patch('/toggle', protect, restrictTo('admin'), togglePopupModal);

module.exports = router;