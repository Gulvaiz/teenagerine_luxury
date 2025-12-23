const express = require('express');
const router = express.Router();
const { 
  getAllInstagramPosts, 
  getInstagramPostById, 
  createInstagramPost, 
  updateInstagramPost, 
  deleteInstagramPost, 
  updateInstagramPostOrder, 
  toggleInstagramPostActive,
  uploadImage,
  seedInstagramPosts
} = require('../controllers/instagram.controller');
const { protect, restrictTo } = require('../middlewares/auth.middleware');

// Public routes
router.get('/', getAllInstagramPosts);
router.get('/:id', getInstagramPostById);

// Admin routes - specific routes first, then parameterized routes
router.patch('/order', protect, restrictTo('admin'), updateInstagramPostOrder);
router.post('/seed', protect, restrictTo('admin'), seedInstagramPosts);
router.post('/', protect, restrictTo('admin'), uploadImage, createInstagramPost);
router.patch('/:id', protect, restrictTo('admin'), uploadImage, updateInstagramPost);
router.patch('/:id/toggle', protect, restrictTo('admin'), toggleInstagramPostActive);
router.delete('/:id', protect, restrictTo('admin'), deleteInstagramPost);

module.exports = router;