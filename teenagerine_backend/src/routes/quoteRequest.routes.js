const express = require("express");
const router = express.Router();
const quoteRequestController = require("../controllers/quoteRequest.controller");
const { protect,restrictTo } = require("../middlewares/auth.middleware");
const rateLimit = require("express-rate-limit");

// Rate limiting for quote requests - 5 requests per hour per IP
const quoteRequestLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  message: "Too many quote requests from this IP, please try again after an hour",
});

// Public route with rate limiting
router.post("/", quoteRequestLimiter, quoteRequestController.createQuoteRequest);

// Admin routes
router.get("/", protect,restrictTo("admin"), quoteRequestController.getAllQuoteRequests);
router.patch("/:id/status", protect,restrictTo("admin"), quoteRequestController.updateQuoteRequestStatus);

module.exports = router;