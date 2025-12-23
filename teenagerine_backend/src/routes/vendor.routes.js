/**
 * @swagger
 * /api/vendors:
 *   get:
 *     summary: Get all vendors with pagination and search
 *     description: Retrieve all vendors with product statistics (admin only)
 *     tags: [Vendor Management]
 * /api/vendors/dashboard:
 *   get:
 *     summary: Get vendor dashboard statistics
 *     description: Get comprehensive statistics for admin dashboard
 *     tags: [Vendor Management]
 */

const express = require("express");
const router = express.Router();
const {
  getAllVendors,
  getVendorById,
  getAllProducts,
  getDashboardStats,
  seedsVendors,
  createVendor,
  updateVendor,
  createVendorProduct,
  getProductsWithoutVendor,
  assignExistingProducts,
  unassignProducts,
  deleteVendorProduct,
  deleteVendor
} = require("../controllers/vendor.controller");
const { protect, restrictTo } = require("../middlewares/auth.middleware");

// Debug logging middleware
router.use((req, res, next) => {
  console.log(`🏪 Vendor Route: ${req.method} ${req.path} - ${new Date().toISOString()}`);
  next();
});

// All vendor management routes require admin access
// router.use(protect);
// router.use(restrictTo("admin"));

// Dashboard routes
router.get("/dashboard", getDashboardStats);

// Vendor routes
router.post("/", createVendor);
router.get("/", getAllVendors);
router.get("/:id", getVendorById);
router.patch("/:id", updateVendor);
router.get("/add/seeds",seedsVendors);
// Product management routes (record-keeping only, no publishing)
router.post("/products", createVendorProduct);
router.get("/products/all", getAllProducts);
router.delete("/products/:productId", deleteVendorProduct);
router.get("/products/without-vendor", getProductsWithoutVendor);
router.post("/assign-existing-products", assignExistingProducts);
router.post("/unassign-products", unassignProducts);
router.delete("/:id",deleteVendor);

module.exports = router;