const express = require('express');
const router = express.Router();
const blogController = require('../controllers/blog.controller');
const {restrictTo,protect} = require('../middlewares/auth.middleware');

// Public routes (for frontend)
router.get('/published', blogController.getPublishedBlogs);
router.get('/trending', blogController.getTrendingBlogs);
router.get('/featured', blogController.getFeaturedBlogs);
router.get('/categories', blogController.getBlogCategories);
router.get('/tags', blogController.getBlogTags);
router.get('/slug/:slug', blogController.getBlogBySlug);

// Admin/Protected routes
router.get('/all', protect, restrictTo("admin"), blogController.getAllBlogs);
router.get('/stats', protect, restrictTo("admin"), blogController.getBlogStats);
router.post('/create', protect, restrictTo("admin"), blogController.createBlog);
router.put('/update/:id', protect, restrictTo("admin"), blogController.updateBlog);
router.delete('/delete/:id', protect, restrictTo("admin"), blogController.deleteBlog);

// Scheduled blog publishing (for cron job or manual trigger)
router.post('/publish-scheduled', protect, restrictTo("admin"), blogController.publishScheduledBlogs);

module.exports = router;