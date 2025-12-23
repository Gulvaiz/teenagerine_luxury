const express = require("express");
const router = express.Router();
const {
  getActiveInformation,
  getAllInformation,
  createInformation,
  updateInformation,
  deleteInformation,
  toggleInformationStatus
} = require("../controllers/information.controller");

const { protect, restrictTo } = require("../middlewares/auth.middleware");

// Public route - Get active information for display
router.get("/active", getActiveInformation);

// Admin routes - protected
router.use(protect, restrictTo("admin"));

router.get("/", getAllInformation);
router.post("/", createInformation);
router.patch("/:id", updateInformation);
router.delete("/:id", deleteInformation);
router.patch("/:id/toggle", toggleInformationStatus);

module.exports = router;