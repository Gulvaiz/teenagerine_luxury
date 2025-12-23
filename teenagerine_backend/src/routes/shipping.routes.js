const express = require("express");
const router = express.Router();
const shippingController = require("../controllers/shipping.controller");
const { protect, restrictTo } = require("../middlewares/auth.middleware");

// Public routes
router.get("/config", shippingController.getShippingConfig);
router.post("/calculate", shippingController.calculateShipping);

// Admin routes (protected)
router.patch("/config", protect, restrictTo("admin"), shippingController.updateShippingConfig);

module.exports = router;