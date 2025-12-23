const express = require('express');
const router = express.Router();
const recommendationController = require('../controllers/recommendation.controller');

// Get product recommendations
router.get('/products/:productId', recommendationController.getProductRecommendations);

// Get complementary products (items that go well together)
router.get('/products/:productId/complementary', recommendationController.getComplementaryProducts);

// Get similar products (same category, style, brand)
router.get('/products/:productId/similar', recommendationController.getSimilarProducts);

// Get trending/popular products
router.get('/trending', recommendationController.getTrendingProducts);

// Get complete outfit suggestions
router.get('/products/:productId/outfit', recommendationController.getOutfitSuggestions);

module.exports = router;