const express = require("express");
const router = express.Router();
const contactSubmissionController = require("../controllers/contactSubmission.controller");
const { restrictTo, protect } = require("../middlewares/auth.middleware");

// Public route - no authentication required
router.post("/", contactSubmissionController.createSubmission);

// Admin-only routes - require authentication
router.get("/", protect, restrictTo("admin"), contactSubmissionController.getAllSubmissions);
router.patch("/:id/status", protect, restrictTo("admin"), contactSubmissionController.updateSubmissionStatus);

module.exports = router;