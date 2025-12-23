const express = require("express");
const router = express.Router();
const {
  getAllLogs,
  getLogById,
  createLog,
  resolveLog,
  deleteLog,
  cleanupOldLogs,
  getErrorStats,
  getDashboardStats,
  getRecentActivity,
} = require("../controllers/logs.controller");
const { protect, restrictTo } = require("../middlewares/auth.middleware");

// Public route for frontend error logging (no auth required)
router.post("/", createLog);

// Protect all other routes - require authentication
router.use(protect);

// Dashboard statistics
router.get("/stats/dashboard", restrictTo("admin"), getDashboardStats);

// Error statistics
router.get("/stats/errors", restrictTo("admin"), getErrorStats);

// Recent activity logs
router.get("/activity/recent", restrictTo("admin"), getRecentActivity);

// Cleanup old logs
router.delete("/cleanup", restrictTo("admin"), cleanupOldLogs);

// Get all logs with filtering
router.get("/", restrictTo("admin"), getAllLogs);

// Get single log by ID
router.get("/:id", restrictTo("admin"), getLogById);

// Mark log as resolved
router.patch("/:id/resolve", restrictTo("admin"), resolveLog);

// Delete log
router.delete("/:id", restrictTo("admin"), deleteLog);

module.exports = router;
