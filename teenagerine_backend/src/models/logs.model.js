const mongoose = require("mongoose");
const Schema = mongoose.Schema;

/**
 * Logs Model
 * Stores all error records and activity logs from backend and frontend
 * Tracks when, where, and why errors occur
 */
const logsSchema = new Schema(
  {
    // Type of log entry
    logType: {
      type: String,
      enum: [
        "error",
        "warning",
        "info",
        "debug",
        "activity",
        "security",
        "performance",
      ],
      required: [true, "Log type is required"],
      index: true,
    },

    // Source of the log (backend or frontend)
    source: {
      type: String,
      enum: ["backend", "frontend"],
      required: [true, "Source is required"],
      index: true,
    },

    // Severity level
    severity: {
      type: String,
      enum: ["critical", "high", "medium", "low", "info"],
      default: "medium",
      index: true,
    },

    // Error/Activity message
    message: {
      type: String,
      required: [true, "Message is required"],
    },

    // Error code (if applicable)
    errorCode: {
      type: String,
      index: true,
    },

    // Stack trace for errors
    stackTrace: {
      type: String,
    },

    // Where the error/activity occurred
    location: {
      // File path or component name
      file: {
        type: String,
      },
      // Function or method name
      function: {
        type: String,
      },
      // Line number
      line: {
        type: Number,
      },
      // API endpoint or route
      endpoint: {
        type: String,
        index: true,
      },
      // HTTP method (GET, POST, etc.)
      method: {
        type: String,
      },
    },

    // When the error/activity occurred
    occurredAt: {
      type: Date,
      default: Date.now,
      index: true,
    },

    // User associated with the log (if applicable)
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },

    // Session/Request information
    request: {
      // IP address
      ip: {
        type: String,
      },
      // User agent
      userAgent: {
        type: String,
      },
      // Request headers (sanitized)
      headers: {
        type: mongoose.Schema.Types.Mixed,
      },
      // Request body (sanitized, no passwords)
      body: {
        type: mongoose.Schema.Types.Mixed,
      },
      // Query parameters
      query: {
        type: mongoose.Schema.Types.Mixed,
      },
      // Request ID for tracing
      requestId: {
        type: String,
        index: true,
      },
    },

    // Response information (for errors)
    response: {
      // HTTP status code
      statusCode: {
        type: Number,
      },
      // Response body (if error)
      body: {
        type: mongoose.Schema.Types.Mixed,
      },
      // Response time in milliseconds
      responseTime: {
        type: Number,
      },
    },

    // Frontend specific data
    frontend: {
      // Browser name and version
      browser: {
        type: String,
      },
      // Operating system
      os: {
        type: String,
      },
      // Device type (mobile, desktop, tablet)
      device: {
        type: String,
      },
      // Screen resolution
      screenSize: {
        type: String,
      },
      // Page URL where error occurred
      pageUrl: {
        type: String,
      },
      // Component name (React/Vue component)
      component: {
        type: String,
      },
    },

    // Additional context/metadata
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    // Environment (development, staging, production)
    environment: {
      type: String,
      enum: ["development", "staging", "production"],
      default: "production",
      index: true,
    },

    // Whether this log has been reviewed/resolved
    isResolved: {
      type: Boolean,
      default: false,
      index: true,
    },

    // Who resolved it
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    // When it was resolved
    resolvedAt: {
      type: Date,
    },

    // Resolution notes
    resolutionNotes: {
      type: String,
    },

    // Tags for categorization
    tags: [
      {
        type: String,
        index: true,
      },
    ],

    // Number of times this same error has occurred
    occurrenceCount: {
      type: Number,
      default: 1,
    },

    // Auto-delete after certain days (default 180 days)
    expiresAt: {
      type: Date,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for efficient querying
logsSchema.index({ logType: 1, source: 1, occurredAt: -1 });
logsSchema.index({ severity: 1, isResolved: 1, occurredAt: -1 });
logsSchema.index({ "location.endpoint": 1, occurredAt: -1 });
logsSchema.index({ userId: 1, occurredAt: -1 });
logsSchema.index({ environment: 1, logType: 1, occurredAt: -1 });

// TTL index to auto-delete expired logs (after 180 days by default)
logsSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Pre-save hook to set expiration date
logsSchema.pre("save", function (next) {
  if (this.isNew && !this.expiresAt) {
    const expirationDays = 180; // Can be configured
    this.expiresAt = new Date(Date.now() + expirationDays * 24 * 60 * 60 * 1000);
  }
  next();
});

// Instance method to mark as resolved
logsSchema.methods.markAsResolved = async function (userId, notes = "") {
  this.isResolved = true;
  this.resolvedAt = new Date();
  this.resolvedBy = userId;
  this.resolutionNotes = notes;
  return await this.save();
};

// Static method to create error log
logsSchema.statics.logError = async function (errorData) {
  const {
    message,
    error,
    req = {},
    source = "backend",
    severity = "high",
    metadata = {},
  } = errorData;

  const logEntry = new this({
    logType: "error",
    source,
    severity,
    message,
    errorCode: error?.code || error?.name,
    stackTrace: error?.stack,
    location: {
      file: errorData.file,
      function: errorData.function,
      line: errorData.line,
      endpoint: req.originalUrl || req.url,
      method: req.method,
    },
    userId: req.user?._id || req.user?.id,
    request: {
      ip: req.ip || req.connection?.remoteAddress,
      userAgent: req.get("user-agent"),
      headers: sanitizeHeaders(req.headers),
      body: sanitizeBody(req.body),
      query: req.query,
      requestId: req.id,
    },
    response: {
      statusCode: errorData.statusCode,
      responseTime: errorData.responseTime,
    },
    metadata,
    environment: process.env.NODE_ENV || "production",
  });

  return await logEntry.save();
};

// Static method to create activity log
logsSchema.statics.logActivity = async function (activityData) {
  const {
    message,
    req = {},
    userId,
    endpoint,
    severity = "info",
    metadata = {},
  } = activityData;

  const logEntry = new this({
    logType: "activity",
    source: "backend",
    severity,
    message,
    location: {
      endpoint: endpoint || req.originalUrl || req.url,
      method: req.method,
    },
    userId: userId || req.user?._id || req.user?.id,
    request: {
      ip: req.ip || req.connection?.remoteAddress,
      userAgent: req.get?.("user-agent"),
      requestId: req.id,
    },
    metadata,
    environment: process.env.NODE_ENV || "production",
  });

  return await logEntry.save();
};

// Static method to create frontend log
logsSchema.statics.logFrontendError = async function (frontendData) {
  const {
    message,
    errorCode,
    stackTrace,
    severity = "medium",
    userId,
    pageUrl,
    component,
    browser,
    os,
    device,
    screenSize,
    metadata = {},
  } = frontendData;

  const logEntry = new this({
    logType: "error",
    source: "frontend",
    severity,
    message,
    errorCode,
    stackTrace,
    userId,
    frontend: {
      browser,
      os,
      device,
      screenSize,
      pageUrl,
      component,
    },
    metadata,
    environment: process.env.NODE_ENV || "production",
  });

  return await logEntry.save();
};

// Static method to get error statistics
logsSchema.statics.getErrorStats = async function (filters = {}) {
  const {
    startDate,
    endDate,
    source,
    severity,
    environment = process.env.NODE_ENV,
  } = filters;

  const matchQuery = {
    logType: "error",
    environment,
  };

  if (startDate && endDate) {
    matchQuery.occurredAt = { $gte: new Date(startDate), $lte: new Date(endDate) };
  }
  if (source) matchQuery.source = source;
  if (severity) matchQuery.severity = severity;

  return await this.aggregate([
    { $match: matchQuery },
    {
      $group: {
        _id: {
          date: { $dateToString: { format: "%Y-%m-%d", date: "$occurredAt" } },
          severity: "$severity",
        },
        count: { $sum: 1 },
      },
    },
    { $sort: { "_id.date": -1 } },
  ]);
};

// Helper functions to sanitize sensitive data
function sanitizeHeaders(headers) {
  if (!headers) return {};
  const sanitized = { ...headers };
  delete sanitized.authorization;
  delete sanitized.cookie;
  return sanitized;
}

function sanitizeBody(body) {
  if (!body) return {};
  const sanitized = { ...body };
  delete sanitized.password;
  delete sanitized.confirmPassword;
  delete sanitized.token;
  delete sanitized.apiKey;
  return sanitized;
}

module.exports = mongoose.model("Logs", logsSchema);
