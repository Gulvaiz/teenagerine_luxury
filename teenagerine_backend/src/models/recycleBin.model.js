const mongoose = require("mongoose");
const Schema = mongoose.Schema;

/**
 * RecycleBin Model
 * Stores all deleted data with metadata for recovery
 * Tracks who deleted, when, and from which collection
 */
const recycleBinSchema = new Schema(
  {
    // Original collection name (e.g., 'Product', 'Brand', 'User')
    modelName: {
      type: String,
      required: [true, "Model name is required"],
      index: true,
    },

    // Original document ID from the deleted record
    originalId: {
      type: mongoose.Schema.Types.Mixed,
      required: [true, "Original ID is required"],
      index: true,
    },

    // Complete data of the deleted record
    deletedData: {
      type: mongoose.Schema.Types.Mixed,
      required: [true, "Deleted data is required"],
    },

    // User who deleted the record
    deletedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Deleted by user is required"],
    },

    // Timestamp when deleted
    deletedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },

    // Reason for deletion (optional)
    deletionReason: {
      type: String,
      default: "",
    },

    // IP address of the deleter
    ipAddress: {
      type: String,
    },

    // User agent (browser/device info)
    userAgent: {
      type: String,
    },

    // Whether this item has been restored
    isRestored: {
      type: Boolean,
      default: false,
      index: true,
    },

    // When it was restored (if applicable)
    restoredAt: {
      type: Date,
    },

    // User who restored it (if applicable)
    restoredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    // Auto-delete after certain days (default 90 days)
    expiresAt: {
      type: Date,
      index: true,
    },

    // Additional metadata
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient querying
recycleBinSchema.index({ modelName: 1, deletedAt: -1 });
recycleBinSchema.index({ deletedBy: 1, deletedAt: -1 });
recycleBinSchema.index({ isRestored: 1, deletedAt: -1 });

// TTL index to auto-delete expired records (after 90 days by default)
recycleBinSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Pre-save hook to set expiration date (90 days from deletion)
recycleBinSchema.pre("save", function (next) {
  if (this.isNew && !this.expiresAt) {
    const expirationDays = 90; // Can be configured
    this.expiresAt = new Date(Date.now() + expirationDays * 24 * 60 * 60 * 1000);
  }
  next();
});

// Instance method to restore the item
recycleBinSchema.methods.restore = async function (userId) {
  this.isRestored = true;
  this.restoredAt = new Date();
  this.restoredBy = userId;
  return await this.save();
};

// Static method to move item to recycle bin
recycleBinSchema.statics.moveToRecycleBin = async function (
  modelName,
  originalId,
  deletedData,
  deletedBy,
  additionalInfo = {}
) {
  const recycleBinEntry = new this({
    modelName,
    originalId,
    deletedData,
    deletedBy,
    deletionReason: additionalInfo.reason || "",
    ipAddress: additionalInfo.ipAddress || "",
    userAgent: additionalInfo.userAgent || "",
    metadata: additionalInfo.metadata || {},
  });

  return await recycleBinEntry.save();
};

// Static method to get all deleted items by model
recycleBinSchema.statics.getDeletedByModel = async function (
  modelName,
  options = {}
) {
  const { includeRestored = false, limit = 50, skip = 0 } = options;

  const query = { modelName };
  if (!includeRestored) {
    query.isRestored = false;
  }

  return await this.find(query)
    .populate("deletedBy", "name email")
    .populate("restoredBy", "name email")
    .sort({ deletedAt: -1 })
    .limit(limit)
    .skip(skip);
};

// Static method to permanently delete old items
recycleBinSchema.statics.permanentlyDeleteOld = async function (daysOld = 90) {
  const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);
  return await this.deleteMany({ deletedAt: { $lt: cutoffDate } });
};

module.exports = mongoose.model("RecycleBin", recycleBinSchema);
