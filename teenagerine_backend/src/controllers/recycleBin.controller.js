const RecycleBin = require("../models/recycleBin.model");
const Logs = require("../models/logs.model");
const mongoose = require("mongoose");

/**
 * @desc    Get all deleted items from recycle bin
 * @route   GET /api/recycle-bin
 * @access  Private/Admin
 */
exports.getAllDeletedItems = async (req, res) => {
  try {
    const {
      modelName,
      includeRestored = "false",
      page = 1,
      limit = 50,
      sortBy = "deletedAt",
      order = "desc",
    } = req.query;

    const query = {};
    if (modelName) {
      query.modelName = modelName;
    }
    if (includeRestored === "false") {
      query.isRestored = false;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortOrder = order === "asc" ? 1 : -1;

    const items = await RecycleBin.find(query)
      .populate("deletedBy", "name email role")
      .populate("restoredBy", "name email role")
      .sort({ [sortBy]: sortOrder })
      .limit(parseInt(limit))
      .skip(skip);

    const total = await RecycleBin.countDocuments(query);

    // Log activity
    await Logs.logActivity({
      message: `Retrieved ${items.length} items from recycle bin`,
      req,
      severity: "info",
      metadata: { modelName, total, page, limit },
    });

    res.status(200).json({
      success: true,
      count: items.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      data: items,
    });
  } catch (error) {
    console.error("Error fetching deleted items:", error);
    await Logs.logError({
      message: "Failed to fetch deleted items from recycle bin",
      error,
      req,
      severity: "medium",
    });

    res.status(500).json({
      success: false,
      message: "Error fetching deleted items",
      error: error.message,
    });
  }
};

/**
 * @desc    Get deleted items by model name
 * @route   GET /api/recycle-bin/model/:modelName
 * @access  Private/Admin
 */
exports.getDeletedItemsByModel = async (req, res) => {
  try {
    const { modelName } = req.params;
    const { page = 1, limit = 50, includeRestored = "false" } = req.query;

    const items = await RecycleBin.getDeletedByModel(modelName, {
      includeRestored: includeRestored === "true",
      limit: parseInt(limit),
      skip: (parseInt(page) - 1) * parseInt(limit),
    });

    const total = await RecycleBin.countDocuments({
      modelName,
      isRestored: includeRestored === "true" ? undefined : false,
    });

    res.status(200).json({
      success: true,
      modelName,
      count: items.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      data: items,
    });
  } catch (error) {
    console.error("Error fetching items by model:", error);
    await Logs.logError({
      message: `Failed to fetch deleted items for model: ${req.params.modelName}`,
      error,
      req,
      severity: "medium",
    });

    res.status(500).json({
      success: false,
      message: "Error fetching deleted items by model",
      error: error.message,
    });
  }
};

/**
 * @desc    Get single deleted item by ID
 * @route   GET /api/recycle-bin/:id
 * @access  Private/Admin
 */
exports.getDeletedItemById = async (req, res) => {
  try {
    const { id } = req.params;

    const item = await RecycleBin.findById(id)
      .populate("deletedBy", "name email role")
      .populate("restoredBy", "name email role");

    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Deleted item not found",
      });
    }

    res.status(200).json({
      success: true,
      data: item,
    });
  } catch (error) {
    console.error("Error fetching deleted item:", error);
    await Logs.logError({
      message: `Failed to fetch deleted item: ${req.params.id}`,
      error,
      req,
      severity: "low",
    });

    res.status(500).json({
      success: false,
      message: "Error fetching deleted item",
      error: error.message,
    });
  }
};

/**
 * @desc    Restore a deleted item
 * @route   POST /api/recycle-bin/:id/restore
 * @access  Private/Admin
 */
exports.restoreDeletedItem = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const item = await RecycleBin.findById(id);

    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Deleted item not found",
      });
    }

    if (item.isRestored) {
      return res.status(400).json({
        success: false,
        message: "This item has already been restored",
      });
    }

    // Get the model dynamically
    const Model = mongoose.model(item.modelName);

    // Check if item with original ID already exists
    const existingItem = await Model.findById(item.originalId);
    if (existingItem) {
      return res.status(409).json({
        success: false,
        message: "An item with this ID already exists in the collection",
      });
    }

    // Restore the data to original collection
    const restoredData = new Model({
      ...item.deletedData,
      _id: item.originalId,
    });

    await restoredData.save({ validateBeforeSave: true });

    // Mark as restored in recycle bin
    await item.restore(userId);

    // Log activity
    await Logs.logActivity({
      message: `Restored ${item.modelName} (ID: ${item.originalId}) from recycle bin`,
      req,
      userId,
      severity: "info",
      metadata: {
        modelName: item.modelName,
        originalId: item.originalId,
        recycleBinId: item._id,
      },
    });

    res.status(200).json({
      success: true,
      message: `${item.modelName} restored successfully`,
      data: restoredData,
    });
  } catch (error) {
    console.error("Error restoring item:", error);
    await Logs.logError({
      message: `Failed to restore item: ${req.params.id}`,
      error,
      req,
      severity: "high",
    });

    res.status(500).json({
      success: false,
      message: "Error restoring item",
      error: error.message,
    });
  }
};

/**
 * @desc    Permanently delete an item from recycle bin
 * @route   DELETE /api/recycle-bin/:id
 * @access  Private/Admin
 */
exports.permanentlyDeleteItem = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const item = await RecycleBin.findById(id);

    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Deleted item not found",
      });
    }

    const itemInfo = {
      modelName: item.modelName,
      originalId: item.originalId,
    };

    await RecycleBin.findByIdAndDelete(id);

    // Log activity
    await Logs.logActivity({
      message: `Permanently deleted ${itemInfo.modelName} (ID: ${itemInfo.originalId}) from recycle bin`,
      req,
      userId,
      severity: "high",
      metadata: itemInfo,
    });

    res.status(200).json({
      success: true,
      message: "Item permanently deleted from recycle bin",
    });
  } catch (error) {
    console.error("Error permanently deleting item:", error);
    await Logs.logError({
      message: `Failed to permanently delete item: ${req.params.id}`,
      error,
      req,
      severity: "high",
    });

    res.status(500).json({
      success: false,
      message: "Error permanently deleting item",
      error: error.message,
    });
  }
};

/**
 * @desc    Empty recycle bin (delete all items older than specified days)
 * @route   DELETE /api/recycle-bin/empty
 * @access  Private/Admin
 */
exports.emptyRecycleBin = async (req, res) => {
  try {
    const { daysOld = 90, modelName } = req.query;
    const userId = req.user._id;

    const cutoffDate = new Date(
      Date.now() - parseInt(daysOld) * 24 * 60 * 60 * 1000
    );

    const query = { deletedAt: { $lt: cutoffDate } };
    if (modelName) {
      query.modelName = modelName;
    }

    const result = await RecycleBin.deleteMany(query);

    // Log activity
    await Logs.logActivity({
      message: `Emptied recycle bin: ${result.deletedCount} items removed`,
      req,
      userId,
      severity: "high",
      metadata: {
        daysOld: parseInt(daysOld),
        modelName: modelName || "all",
        deletedCount: result.deletedCount,
      },
    });

    res.status(200).json({
      success: true,
      message: `Recycle bin emptied successfully`,
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    console.error("Error emptying recycle bin:", error);
    await Logs.logError({
      message: "Failed to empty recycle bin",
      error,
      req,
      severity: "high",
    });

    res.status(500).json({
      success: false,
      message: "Error emptying recycle bin",
      error: error.message,
    });
  }
};

/**
 * @desc    Get recycle bin statistics
 * @route   GET /api/recycle-bin/stats
 * @access  Private/Admin
 */
exports.getRecycleBinStats = async (req, res) => {
  try {
    const stats = await RecycleBin.aggregate([
      {
        $group: {
          _id: "$modelName",
          total: { $sum: 1 },
          restored: {
            $sum: { $cond: [{ $eq: ["$isRestored", true] }, 1, 0] },
          },
          pending: {
            $sum: { $cond: [{ $eq: ["$isRestored", false] }, 1, 0] },
          },
        },
      },
      {
        $sort: { total: -1 },
      },
    ]);

    const totalItems = await RecycleBin.countDocuments();
    const totalRestored = await RecycleBin.countDocuments({ isRestored: true });
    const totalPending = await RecycleBin.countDocuments({ isRestored: false });

    res.status(200).json({
      success: true,
      data: {
        overall: {
          total: totalItems,
          restored: totalRestored,
          pending: totalPending,
        },
        byModel: stats,
      },
    });
  } catch (error) {
    console.error("Error fetching recycle bin stats:", error);
    await Logs.logError({
      message: "Failed to fetch recycle bin statistics",
      error,
      req,
      severity: "low",
    });

    res.status(500).json({
      success: false,
      message: "Error fetching recycle bin statistics",
      error: error.message,
    });
  }
};
