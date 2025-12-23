const express = require('express');
const router = express.Router();
const commentController = require('../controllers/comment.controller');
const { protect, restrictTo } = require('../middlewares/auth.middleware');

// Public routes
router.get('/blog/:blogId', commentController.getCommentsByBlog);

// Protected routes (require authentication)
router.post('/blog/:blogId', protect, commentController.createComment);
router.put('/:commentId', protect, commentController.updateComment);
router.delete('/:commentId', protect, commentController.deleteComment);

// Admin routes
router.get('/admin/all', protect, restrictTo('admin'), commentController.getAllComments);
router.patch('/admin/:commentId/moderate', protect, restrictTo('admin'), commentController.moderateComment);

module.exports = router;
