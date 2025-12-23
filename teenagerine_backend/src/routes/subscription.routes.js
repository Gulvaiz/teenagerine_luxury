const express = require("express");
const router = express.Router();
const subscriptionController = require("../controllers/subscription.controller");
const { protect, restrictTo } = require("../middlewares/auth.middleware");

// Public routes
router.post("/", subscriptionController.subscribe);

// Admin routes
router.get("/", protect, restrictTo('admin'), subscriptionController.getAllSubscriptions);
router.delete("/:id", protect, restrictTo('admin'), subscriptionController.deleteSubscription);

// Email campaign routes
router.post("/send-email", protect, restrictTo('admin'), subscriptionController.sendEmail);
router.post("/send-promotional", protect, restrictTo('admin'), subscriptionController.sendPromotionalEmail);
router.post("/send-announcement", protect, restrictTo('admin'), subscriptionController.sendAnnouncement);
router.post("/preview-template", protect, restrictTo('admin'), subscriptionController.previewEmailTemplate);

// Utility routes
router.post("/import-users", protect, restrictTo('admin'), subscriptionController.importFromUsers);

module.exports = router;