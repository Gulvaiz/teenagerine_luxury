const express = require('express');
const router = express.Router();
const { 
  createProductRequest, 
  getAllProductRequests, 
  getUserProductRequests, 
  getProductRequest, 
  updateProductRequestStatus 
} = require('../controllers/productRequest.controller');
const { protect, restrictTo } = require('../middlewares/auth.middleware');

// Public route - no authentication required
router.post('/', createProductRequest);

// Routes that require authentication
router.use(protect);

// User routes
router.get('/my-requests', getUserProductRequests);

// Admin routes
router.get('/', restrictTo('admin'), getAllProductRequests);
router.get('/:id', getProductRequest);
router.patch('/:id', restrictTo('admin'), updateProductRequestStatus);

module.exports = router;