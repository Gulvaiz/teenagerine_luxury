const express = require('express');
const router = express.Router();
const {
  getAllSoldProducts,
  getPopupProductSelection,
  updatePopupProductSelection,
  togglePopupProductSelection,
  getSelectedProductsForPopup
} = require('../controllers/popupProductSelection.controller');
const { protect, restrictTo } = require('../middlewares/auth.middleware');

// Public route - for popup display
router.get('/selected', getSelectedProductsForPopup);

// Admin routes
router.get('/sold-products', protect, restrictTo('admin'), getAllSoldProducts);
router.get('/selection', protect, restrictTo('admin'), getPopupProductSelection);
router.put('/selection', protect, restrictTo('admin'), updatePopupProductSelection);
router.patch('/toggle', protect, restrictTo('admin'), togglePopupProductSelection);

module.exports = router;