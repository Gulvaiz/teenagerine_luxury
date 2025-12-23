/**
 * @swagger
 * /api/orders:
 * post:
 * summary: Create a new order
 * description: Place a new order for the current user
 * tags: [Order]
 * /api/orders/my:
 * get:
 * summary: Get my orders       
 * description: Retrieve all orders placed by the current user
 * tags: [Order]
 */

const express = require("express");
const router = express.Router();
const {
  createOrder,
  getMyOrders,
  getAllOrders,
  getOrder,
  getOrderByUserId,
  updateOrderStatus,
  generateInvoice,
  getInvoiceDownloadUrl,
  addTrackingToOrder,
  trackOrderById,
  trackByTrackingNumber,
  getAvailableCouriers,
  checkCourierServiceability,
  calculateShippingRates,
  getCourierRecommendations,
  checkCourierHealth,
  getSmartCourierSelection,
  getCourierConfig,
  updateCourierConfig,
  bulkCreateShipments,
  registerBlueDartPickup,
  cancelBlueDartPickup,
  getBlueDartPickupStatus,
  generateBlueDartWaybill
} = require("../controllers/order.controller");
const { protect, restrictTo } = require("../middlewares/auth.middleware");

// Debug logging middleware
router.use((req, res, next) => {
  console.log(`📧 Order Route: ${req.method} ${req.path} - ${new Date().toISOString()}`);
  next();
});

// Courier service routes (public - before auth middleware)
router.get("/courier/available", getAvailableCouriers);
router.get("/courier/serviceability", checkCourierServiceability);
router.post("/courier/rates", calculateShippingRates);
router.get("/courier/recommendations", getCourierRecommendations);
router.get("/courier/smart-selection", getSmartCourierSelection);

// Tracking routes (public endpoint for tracking by tracking number)
router.get("/track/:trackingNumber", trackByTrackingNumber);

router.use(protect);

// Admin routes - must be defined before routes with path parameters
router.get("/admin/all", restrictTo("admin"), getAllOrders);
router.get("/admin/courier-health", restrictTo("admin"), checkCourierHealth);
router.get("/admin/courier-config", restrictTo("admin"), getCourierConfig);
router.put("/admin/courier-config", restrictTo("admin"), updateCourierConfig);
router.post("/admin/bulk-create-shipments", restrictTo("admin"), bulkCreateShipments);

// BlueDart admin routes
router.post("/:orderId/bluedart/pickup", restrictTo("admin"), registerBlueDartPickup);
router.delete("/:orderId/bluedart/pickup", restrictTo("admin"), cancelBlueDartPickup);
router.post("/:orderId/bluedart/waybill", restrictTo("admin"), generateBlueDartWaybill);

// User routes
router.get("/my", getMyOrders);
router.get("/user", getOrderByUserId);
router.post("/", createOrder);

// Invoice routes
router.post("/:id/invoice", generateInvoice);
router.get("/:id/invoice/download", getInvoiceDownloadUrl);

// Order specific routes
router.get("/:orderId", getOrder);
router.get("/:orderId/track", trackOrderById);
router.get("/:orderId/bluedart/pickup", getBlueDartPickupStatus);
router.patch("/:orderId/status", restrictTo("admin"), updateOrderStatus);
router.post("/:orderId/tracking", restrictTo("admin"), addTrackingToOrder);

module.exports = router;
