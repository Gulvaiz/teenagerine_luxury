const Logs = require("../models/logs.model");

/**
 * @desc    Get all logs with filtering
 * @route   GET /api/logs
 * @access  Private/Admin
 */
exports.getAllLogs = async (req, res) => {
  try {
    const {
      logType,
      source,
      severity,
      environment,
      isResolved,
      startDate,
      endDate,
      userId,
      endpoint,
      page = 1,
      limit = 50,
      sortBy = "occurredAt",
      order = "desc",
    } = req.query;

    const query = {};

    // Apply filters
    if (logType) query.logType = logType;
    if (source) query.source = source;
    if (severity) query.severity = severity;
    if (environment) query.environment = environment;
    if (isResolved !== undefined) query.isResolved = isResolved === "true";
    if (userId) query.userId = userId;
    if (endpoint) query["location.endpoint"] = new RegExp(endpoint, "i");

    // Date range filter
    if (startDate || endDate) {
      query.occurredAt = {};
      if (startDate) query.occurredAt.$gte = new Date(startDate);
      if (endDate) query.occurredAt.$lte = new Date(endDate);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sortOrder = order === "asc" ? 1 : -1;

    const logs = await Logs.find(query)
      .populate("userId", "name email role")
      .populate("resolvedBy", "name email role")
      .sort({ [sortBy]: sortOrder })
      .limit(parseInt(limit))
      .skip(skip);

    const total = await Logs.countDocuments(query);

    res.status(200).json({
      success: true,
      count: logs.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      data: logs,
    });
  } catch (error) {
    console.error("Error fetching logs:", error);

    res.status(500).json({
      success: false,
      message: "Error fetching logs",
      error: error.message,
    });
  }
};

/**
 * @desc    Get single log by ID
 * @route   GET /api/logs/:id
 * @access  Private/Admin
 */
exports.getLogById = async (req, res) => {
  try {
    const { id } = req.params;

    const log = await Logs.findById(id)
      .populate("userId", "name email role")
      .populate("resolvedBy", "name email role");

    if (!log) {
      return res.status(404).json({
        success: false,
        message: "Log not found",
      });
    }

    res.status(200).json({
      success: true,
      data: log,
    });
  } catch (error) {
    console.error("Error fetching log:", error);

    res.status(500).json({
      success: false,
      message: "Error fetching log",
      error: error.message,
    });
  }
};

/**
 * @desc    Create a new log entry (for frontend errors)
 * @route   POST /api/logs
 * @access  Public (for frontend error logging)
 */
exports.createLog = async (req, res) => {
  try {
    const {
      logType = "error",
      source = "frontend",
      severity = "medium",
      message,
      errorCode,
      stackTrace,
      pageUrl,
      component,
      browser,
      os,
      device,
      screenSize,
      metadata,
    } = req.body;

    if (!message) {
      return res.status(400).json({
        success: false,
        message: "Message is required",
      });
    }

    let log;

    // Frontend error logging
    if (source === "frontend") {
      log = await Logs.logFrontendError({
        message,
        errorCode,
        stackTrace,
        severity,
        userId: req.user?._id,
        pageUrl,
        component,
        browser,
        os,
        device,
        screenSize,
        metadata,
      });
    } else {
      // Backend error logging
      log = await Logs.logError({
        message,
        error: { code: errorCode, stack: stackTrace },
        req,
        source,
        severity,
        metadata,
      });
    }

    res.status(201).json({
      success: true,
      message: "Log created successfully",
      data: log,
    });
  } catch (error) {
    console.error("Error creating log:", error);

    res.status(500).json({
      success: false,
      message: "Error creating log",
      error: error.message,
    });
  }
};

/**
 * @desc    Mark log as resolved
 * @route   PATCH /api/logs/:id/resolve
 * @access  Private/Admin
 */
exports.resolveLog = async (req, res) => {
  try {
    const { id } = req.params;
    const { resolutionNotes } = req.body;
    const userId = req.user._id;

    const log = await Logs.findById(id);

    if (!log) {
      return res.status(404).json({
        success: false,
        message: "Log not found",
      });
    }

    if (log.isResolved) {
      return res.status(400).json({
        success: false,
        message: "This log has already been resolved",
      });
    }

    await log.markAsResolved(userId, resolutionNotes);

    res.status(200).json({
      success: true,
      message: "Log marked as resolved",
      data: log,
    });
  } catch (error) {
    console.error("Error resolving log:", error);

    res.status(500).json({
      success: false,
      message: "Error resolving log",
      error: error.message,
    });
  }
};

/**
 * @desc    Delete log(s)
 * @route   DELETE /api/logs/:id
 * @access  Private/Admin
 */
exports.deleteLog = async (req, res) => {
  try {
    const { id } = req.params;

    const log = await Logs.findByIdAndDelete(id);

    if (!log) {
      return res.status(404).json({
        success: false,
        message: "Log not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Log deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting log:", error);

    res.status(500).json({
      success: false,
      message: "Error deleting log",
      error: error.message,
    });
  }
};

/**
 * @desc    Delete old logs (cleanup)
 * @route   DELETE /api/logs/cleanup
 * @access  Private/Admin
 */
exports.cleanupOldLogs = async (req, res) => {
  try {
    const { daysOld = 180, logType, severity } = req.query;

    const cutoffDate = new Date(
      Date.now() - parseInt(daysOld) * 24 * 60 * 60 * 1000
    );

    const query = { occurredAt: { $lt: cutoffDate } };
    if (logType) query.logType = logType;
    if (severity) query.severity = severity;

    const result = await Logs.deleteMany(query);

    // Log this cleanup activity
    await Logs.logActivity({
      message: `Cleaned up ${result.deletedCount} old logs`,
      req,
      userId: req.user._id,
      severity: "info",
      metadata: {
        daysOld: parseInt(daysOld),
        deletedCount: result.deletedCount,
        logType,
        severity,
      },
    });

    res.status(200).json({
      success: true,
      message: "Old logs cleaned up successfully",
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    console.error("Error cleaning up logs:", error);

    res.status(500).json({
      success: false,
      message: "Error cleaning up logs",
      error: error.message,
    });
  }
};

/**
 * @desc    Get error statistics
 * @route   GET /api/logs/stats/errors
 * @access  Private/Admin
 */
exports.getErrorStats = async (req, res) => {
  try {
    const { startDate, endDate, source, severity, environment } = req.query;

    const stats = await Logs.getErrorStats({
      startDate,
      endDate,
      source,
      severity,
      environment,
    });

    res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error("Error fetching error stats:", error);

    res.status(500).json({
      success: false,
      message: "Error fetching error statistics",
      error: error.message,
    });
  }
};

/**
 * @desc    Get logs dashboard statistics
 * @route   GET /api/logs/stats/dashboard
 * @access  Private/Admin
 */
exports.getDashboardStats = async (req, res) => {
  try {
    const { days = 7 } = req.query;
    const startDate = new Date(Date.now() - parseInt(days) * 24 * 60 * 60 * 1000);

    // Get total counts
    const totalErrors = await Logs.countDocuments({
      logType: "error",
      occurredAt: { $gte: startDate },
    });

    const unresolvedErrors = await Logs.countDocuments({
      logType: "error",
      isResolved: false,
      occurredAt: { $gte: startDate },
    });

    const criticalErrors = await Logs.countDocuments({
      logType: "error",
      severity: "critical",
      occurredAt: { $gte: startDate },
    });

    // Get errors by source
    const errorsBySource = await Logs.aggregate([
      {
        $match: {
          logType: "error",
          occurredAt: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: "$source",
          count: { $sum: 1 },
        },
      },
    ]);

    // Get errors by severity
    const errorsBySeverity = await Logs.aggregate([
      {
        $match: {
          logType: "error",
          occurredAt: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: "$severity",
          count: { $sum: 1 },
        },
      },
    ]);

    // Get top error endpoints
    const topErrorEndpoints = await Logs.aggregate([
      {
        $match: {
          logType: "error",
          source: "backend",
          occurredAt: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: "$location.endpoint",
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]);

    // Get error trend (daily)
    const errorTrend = await Logs.aggregate([
      {
        $match: {
          logType: "error",
          occurredAt: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$occurredAt" },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    res.status(200).json({
      success: true,
      data: {
        summary: {
          totalErrors,
          unresolvedErrors,
          criticalErrors,
          resolvedErrors: totalErrors - unresolvedErrors,
        },
        errorsBySource,
        errorsBySeverity,
        topErrorEndpoints,
        errorTrend,
      },
    });
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);

    res.status(500).json({
      success: false,
      message: "Error fetching dashboard statistics",
      error: error.message,
    });
  }
};

/**
 * @desc    Get recent activity logs
 * @route   GET /api/logs/activity/recent
 * @access  Private/Admin
 */
exports.getRecentActivity = async (req, res) => {
  try {
    const { limit = 50, userId } = req.query;

    const query = { logType: "activity" };
    if (userId) query.userId = userId;

    const activities = await Logs.find(query)
      .populate("userId", "name email role")
      .sort({ occurredAt: -1 })
      .limit(parseInt(limit));

    res.status(200).json({
      success: true,
      count: activities.length,
      data: activities,
    });
  } catch (error) {
    console.error("Error fetching recent activity:", error);

    res.status(500).json({
      success: false,
      message: "Error fetching recent activity",
      error: error.message,
    });
  }
};
