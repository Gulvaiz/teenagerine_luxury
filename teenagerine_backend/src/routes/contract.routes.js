const express = require("express");
const router = express.Router();
const {
  createContractForVendor,
  sendContractEmail,
  getContractByCode,
  respondToContract,
  getAllContracts,
  getContractsByVendorId,
  extendContract,
  checkVendorContract,
  deleteContract
} = require("../controllers/contract.controller");
const { protect, restrictTo } = require("../middlewares/auth.middleware");

// Debug logging middleware
router.use((req, res, next) => {
  console.log(`📋 Contract Route: ${req.method} ${req.path} - ${new Date().toISOString()}`);
  next();
});

// Public routes (for vendor)
router.get("/vendor/:contractCode", getContractByCode);
router.get("/:contractCode", getContractByCode); // Alias for shorter URL
router.post("/vendor/:contractCode/respond", respondToContract);
router.post("/:contractCode/respond", respondToContract); // Alias for shorter URL

// Admin routes (protected)
// router.use(protect);
// router.use(restrictTo("admin"));

router.post("/create", createContractForVendor); // Create contract for vendor
router.post("/:contractId/send-email", sendContractEmail); // Send email with product snapshots
router.post("/extend", extendContract); // Extend/renew contract
router.delete("/:contractId", deleteContract); // Delete pending contract
router.get("/", getAllContracts); // Get all contracts with filters
router.get("/vendor-contracts/:vendorId", getContractsByVendorId); // Get contracts by vendor
router.get("/check/:vendorId", checkVendorContract); // Check if vendor has active contract

module.exports = router;
