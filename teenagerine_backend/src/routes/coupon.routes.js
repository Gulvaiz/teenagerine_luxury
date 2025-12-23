const express = require("express");
const router = express.Router();
const couponController = require("../controllers/coupon.controller");
const {protect,restrictTo} = require("../middlewares/auth.middleware");

// Admin routes (protected)
router
  .route("/")
  .post(protect, restrictTo("admin"), couponController.createCoupon)
  .get(protect, restrictTo("admin"), couponController.getAllCoupons);

// Categories for coupon creation (MUST be before /:id route)
router.get("/categories", protect, restrictTo("admin"), couponController.getCategoriesForCoupon);

// Products for coupon creation (MUST be before /:id route)
router.get("/products", protect, restrictTo("admin"), couponController.getProductsForCoupon);

// User routes
router.post("/validate", protect, couponController.validateCoupon);
router.post("/apply", protect, couponController.applyCoupon);

// Parameterized routes (MUST be after specific routes)
router
  .route("/:id")
  .get(protect, restrictTo("admin"), couponController.getCouponById)
  .patch(protect, restrictTo("admin"), couponController.updateCoupon)
  .delete(protect, restrictTo("admin"), couponController.deleteCoupon);

module.exports = router;