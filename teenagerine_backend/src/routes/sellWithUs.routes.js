const express = require("express");
const router = express.Router();
const {
  getAllSellWithUs,
  getSellWithUsById,
  updateSellWithUs,
  deleteSellWithUs,
  createSellWithUs,
  uploadImages,
  getVendorInfo,
  getAllVendors,
  addProductToVendor,
  getProductForApproval,
  approveProductForPublic,
  getPendingProducts,
  getVendorForAutoFill
} = require("../controllers/sellWithUs.controller");
const { restrictTo, protect } = require("../middlewares/auth.middleware");

// Public route - no authentication required but with image upload
router.post("/", uploadImages, createSellWithUs);

// Auto-fill route - public access for form auto-fill
router.get("/autofill", getVendorForAutoFill); // Get vendor data for auto-fill by email or phone

// Vendor routes - public access for vendor lookup
router.get("/vendor/:identifier", getVendorInfo); // Get vendor by consignment number, email, or phone
router.post("/vendor/:vendorId/products", uploadImages, addProductToVendor); // Add product to existing vendor

// Admin routes - require authentication
router.get("/", protect, restrictTo("admin"), getAllSellWithUs);
router.get("/vendors", protect, restrictTo("admin"), getAllVendors); // List all vendors
router.get("/pending-products", protect, restrictTo("admin"), getPendingProducts); // Get pending products for approval
router.get("/product/:productId/approval", protect, restrictTo("admin"), getProductForApproval); // Get product details for approval
router.post("/product/:productId/approve", protect, restrictTo("admin"), approveProductForPublic); // Approve product for public
router.get("/:id", protect, restrictTo("admin"), getSellWithUsById);
router.put("/update/:id", protect, restrictTo("admin"), updateSellWithUs);
router.delete("/delete/:id", protect, restrictTo("admin"), deleteSellWithUs);

module.exports = router;