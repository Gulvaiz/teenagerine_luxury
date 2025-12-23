const express = require('express');
const router = express.Router();
const {
  getAllProducts,
  getProductById,
  getProductBySlug,
  createProduct,
  updateProduct,
  deleteProduct,
  searchProducts,
  updateProductStock,
  seedProducts,
  getProductsByCategories,
  getProductsByBrands,
  getFilterOptions,
  getRandomProducts,
  getSubCategories,
  getSaleProducts
} = require('../controllers/product.controller');
const { protect, restrictTo } = require('../middlewares/auth.middleware');
const {
  ProductFilter,
  getFilterOptions: getFilterOptionsFromFilter,
  getSearchSuggestions,
  debugFilterParams
} = require('../controllers/product.filter.controller');
const { jsonErrorHandler } = require('../utils/productFilter/requestValidator');

router.get('/filter-options', getFilterOptions);
router.get('/subcategories/:gender/:category', getSubCategories);
router.get('/category/:category{/:subCategory}', getProductsByCategories);
router.get('/brand/:brandName', getProductsByBrands);
// Public routes
router.get('/seed-product', seedProducts);
router.get('/random', getRandomProducts);
// DEDICATED SALES ROUTE - Must be before generic routes
router.get('/sales', getSaleProducts);
router.get('/', getAllProducts);
router.get('/search', searchProducts);
router.get('/:id', getProductById);
router.get('/slug/:slug', getProductBySlug);
router.get('/sold', searchProducts);

// Admin routes
router.post('/', protect, restrictTo('admin'), createProduct);
router.post('/add', protect, restrictTo('admin'), createProduct);
router.patch('/:id', protect, restrictTo('admin'), updateProduct);
router.put('/:id', protect, restrictTo('admin'), updateProduct);
router.delete('/:id', protect, restrictTo('admin'), deleteProduct);

// Stock management route
router.post('/update-stock', protect, updateProductStock);

// Product filter routes with enhanced error handling
router.post('/query', ProductFilter);
router.get('/search-suggestions', getSearchSuggestions);

// Debug endpoint for filter parameters (development only)
router.all('/debug-filters', debugFilterParams);

// JSON error handling middleware for the entire router
router.use(jsonErrorHandler);



module.exports = router;