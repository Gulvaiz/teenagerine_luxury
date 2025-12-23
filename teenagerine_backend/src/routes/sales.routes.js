const express = require('express');
const router = express.Router();
const {
  getSaleProductsEnhanced,
  getSaleFilterOptions
} = require('../controllers/salesFilter.controller');

// Enhanced sales filter endpoint (supports both GET and POST for complex filters)
router.get('/', getSaleProductsEnhanced);
router.post('/filter', getSaleProductsEnhanced);

// Get available filter options for sale products
router.get('/filter-options', getSaleFilterOptions);

module.exports = router;
