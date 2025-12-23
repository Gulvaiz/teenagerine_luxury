const express = require('express');
const router = express.Router();
const {
  getAllSaleProducts,
  getSaleItemsSelection,
  updateSaleItemsSelection,
  toggleSaleItemsSelection,
  getSelectedProductsForSaleItems
} = require('../controllers/saleItemsSelection.controller');
const { protect, restrictTo } = require('../middlewares/auth.middleware');

// Public route - for sale items page display
router.get('/selected', getSelectedProductsForSaleItems);

// Admin routes
router.get('/sale-products', protect, restrictTo('admin'), getAllSaleProducts);
router.get('/selection', protect, restrictTo('admin'), getSaleItemsSelection);
router.put('/selection', protect, restrictTo('admin'), updateSaleItemsSelection);
router.patch('/toggle', protect, restrictTo('admin'), toggleSaleItemsSelection);

module.exports = router;