const express = require("express");
const router = express.Router();
const {
  getAllDeletedItems,
  getDeletedItemsByModel,
  getDeletedItemById,
  restoreDeletedItem,
  permanentlyDeleteItem,
  emptyRecycleBin,
  getRecycleBinStats,
} = require("../controllers/recycleBin.controller");
const { protect, restrictTo } = require("../middlewares/auth.middleware");

// Protect all routes - require authentication
router.use(protect);

// Get recycle bin statistics
router.get("/stats", restrictTo("admin"), getRecycleBinStats);

// Get all deleted items
router.get("/", restrictTo("admin"), getAllDeletedItems);

// Get deleted items by model name
router.get("/model/:modelName", restrictTo("admin"), getDeletedItemsByModel);

// Empty recycle bin (delete old items)
router.delete("/empty", restrictTo("admin"), emptyRecycleBin);

// Get single deleted item
router.get("/:id", restrictTo("admin"), getDeletedItemById);

// Restore deleted item
router.post("/:id/restore", restrictTo("admin"), restoreDeletedItem);

// Permanently delete item from recycle bin
router.delete("/:id", restrictTo("admin"), permanentlyDeleteItem);

module.exports = router;
