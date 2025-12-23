const RecycleBin = require("../models/recycleBin.model");
const Logs = require("../models/logs.model");

/**
 * Helper function to move deleted data to recycle bin
 * @param {String} modelName - Name of the model (e.g., 'Product', 'Brand')
 * @param {Object} data - The data that is being deleted
 * @param {Object} req - Express request object
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} Recycle bin entry
 */
exports.moveToRecycleBin = async (modelName, data, req, options = {}) => {
  try {
    const { reason = "", metadata = {} } = options;

    const recycleBinEntry = await RecycleBin.moveToRecycleBin(
      modelName,
      data._id,
      data.toObject ? data.toObject() : data,
      req.user._id,
      {
        reason,
        ipAddress: req.ip || req.connection?.remoteAddress,
        userAgent: req.get("user-agent"),
        metadata,
      }
    );

    // Log the deletion activity
    await Logs.logActivity({
      message: `${modelName} deleted and moved to recycle bin`,
      req,
      userId: req.user._id,
      severity: "info",
      metadata: {
        modelName,
        originalId: data._id,
        recycleBinId: recycleBinEntry._id,
        reason,
      },
    });

    return recycleBinEntry;
  } catch (error) {
    console.error("Error moving to recycle bin:", error);

    // Log the error
    await Logs.logError({
      message: `Failed to move ${modelName} to recycle bin`,
      error,
      req,
      severity: "high",
      metadata: {
        modelName,
        dataId: data._id,
      },
    });

    throw error;
  }
};

/**
 * Wrapper function to delete with recycle bin support
 * @param {Object} Model - Mongoose model
 * @param {String} id - ID of document to delete
 * @param {Object} req - Express request object
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} Result object
 */
exports.deleteWithRecycleBin = async (Model, id, req, options = {}) => {
  try {
    // Find the document first
    const document = await Model.findById(id);

    if (!document) {
      throw new Error("Document not found");
    }

    // Move to recycle bin
    const recycleBinEntry = await this.moveToRecycleBin(
      Model.modelName,
      document,
      req,
      options
    );

    // Delete the document from original collection
    await Model.findByIdAndDelete(id);

    return {
      success: true,
      message: `${Model.modelName} deleted and moved to recycle bin`,
      recycleBinId: recycleBinEntry._id,
    };
  } catch (error) {
    console.error("Error in deleteWithRecycleBin:", error);
    throw error;
  }
};

/**
 * Batch delete with recycle bin support
 * @param {Object} Model - Mongoose model
 * @param {Array} ids - Array of IDs to delete
 * @param {Object} req - Express request object
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} Result object
 */
exports.batchDeleteWithRecycleBin = async (Model, ids, req, options = {}) => {
  try {
    const results = [];
    const errors = [];

    for (const id of ids) {
      try {
        const result = await this.deleteWithRecycleBin(Model, id, req, options);
        results.push({ id, ...result });
      } catch (error) {
        errors.push({ id, error: error.message });
      }
    }

    return {
      success: errors.length === 0,
      deletedCount: results.length,
      results,
      errors,
    };
  } catch (error) {
    console.error("Error in batchDeleteWithRecycleBin:", error);
    throw error;
  }
};

/**
 * Soft delete with isActive flag (alternative approach)
 * @param {Object} Model - Mongoose model
 * @param {String} id - ID of document
 * @param {Object} req - Express request object
 * @returns {Promise<Object>} Updated document
 */
exports.softDelete = async (Model, id, req) => {
  try {
    const document = await Model.findByIdAndUpdate(
      id,
      {
        isActive: false,
        deletedAt: new Date(),
        deletedBy: req.user._id,
      },
      { new: true }
    );

    if (!document) {
      throw new Error("Document not found");
    }

    // Log the soft deletion
    await Logs.logActivity({
      message: `${Model.modelName} soft deleted (isActive set to false)`,
      req,
      userId: req.user._id,
      severity: "info",
      metadata: {
        modelName: Model.modelName,
        documentId: id,
      },
    });

    return document;
  } catch (error) {
    console.error("Error in softDelete:", error);
    throw error;
  }
};

/**
 * Restore from recycle bin
 * @param {String} recycleBinId - ID of recycle bin entry
 * @param {Object} req - Express request object
 * @returns {Promise<Object>} Restored document
 */
exports.restoreFromRecycleBin = async (recycleBinId, req) => {
  try {
    const recycleBinItem = await RecycleBin.findById(recycleBinId);

    if (!recycleBinItem) {
      throw new Error("Recycle bin item not found");
    }

    if (recycleBinItem.isRestored) {
      throw new Error("This item has already been restored");
    }

    // Get the model dynamically
    const mongoose = require("mongoose");
    const Model = mongoose.model(recycleBinItem.modelName);

    // Check if item already exists
    const existingItem = await Model.findById(recycleBinItem.originalId);
    if (existingItem) {
      throw new Error("An item with this ID already exists");
    }

    // Restore the data
    const restoredData = new Model({
      ...recycleBinItem.deletedData,
      _id: recycleBinItem.originalId,
    });

    await restoredData.save({ validateBeforeSave: true });

    // Mark as restored
    await recycleBinItem.restore(req.user._id);

    // Log the restoration
    await Logs.logActivity({
      message: `${recycleBinItem.modelName} restored from recycle bin`,
      req,
      userId: req.user._id,
      severity: "info",
      metadata: {
        modelName: recycleBinItem.modelName,
        originalId: recycleBinItem.originalId,
        recycleBinId,
      },
    });

    return restoredData;
  } catch (error) {
    console.error("Error restoring from recycle bin:", error);

    await Logs.logError({
      message: "Failed to restore from recycle bin",
      error,
      req,
      severity: "high",
      metadata: { recycleBinId },
    });

    throw error;
  }
};
