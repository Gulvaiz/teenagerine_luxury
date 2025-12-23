const Logs = require("../models/logs.model");

/**
 * Logger utility for consistent error and activity logging
 */
class Logger {
  /**
   * Log an error
   * @param {Object} options - Error logging options
   */
  static async error(options) {
    const {
      message,
      error,
      req = {},
      severity = "high",
      file = "",
      function: functionName = "",
      line = null,
      metadata = {},
    } = options;

    try {
      await Logs.logError({
        message,
        error,
        req,
        severity,
        file,
        function: functionName,
        line,
        metadata,
      });

      // Also log to console for development
      if (process.env.NODE_ENV === "development") {
        console.error(`[ERROR] ${message}`, error);
      }
    } catch (loggingError) {
      console.error("Failed to log error:", loggingError);
    }
  }

  /**
   * Log an activity
   * @param {Object} options - Activity logging options
   */
  static async activity(options) {
    const {
      message,
      req = {},
      userId = null,
      endpoint = "",
      severity = "info",
      metadata = {},
    } = options;

    try {
      await Logs.logActivity({
        message,
        req,
        userId,
        endpoint,
        severity,
        metadata,
      });

      // Also log to console for development
      if (process.env.NODE_ENV === "development") {
        console.log(`[ACTIVITY] ${message}`);
      }
    } catch (loggingError) {
      console.error("Failed to log activity:", loggingError);
    }
  }

  /**
   * Log a warning
   * @param {Object} options - Warning logging options
   */
  static async warning(options) {
    const { message, req = {}, metadata = {} } = options;

    try {
      const logEntry = new Logs({
        logType: "warning",
        source: "backend",
        severity: "medium",
        message,
        userId: req.user?._id,
        request: {
          ip: req.ip || req.connection?.remoteAddress,
          userAgent: req.get?.("user-agent"),
          endpoint: req.originalUrl || req.url,
          method: req.method,
        },
        metadata,
        environment: process.env.NODE_ENV || "production",
      });

      await logEntry.save();

      // Also log to console for development
      if (process.env.NODE_ENV === "development") {
        console.warn(`[WARNING] ${message}`);
      }
    } catch (loggingError) {
      console.error("Failed to log warning:", loggingError);
    }
  }

  /**
   * Log frontend error
   * @param {Object} options - Frontend error options
   */
  static async frontendError(options) {
    const {
      message,
      errorCode = "",
      stackTrace = "",
      severity = "medium",
      userId = null,
      pageUrl = "",
      component = "",
      browser = "",
      os = "",
      device = "",
      screenSize = "",
      metadata = {},
    } = options;

    try {
      await Logs.logFrontendError({
        message,
        errorCode,
        stackTrace,
        severity,
        userId,
        pageUrl,
        component,
        browser,
        os,
        device,
        screenSize,
        metadata,
      });
    } catch (loggingError) {
      console.error("Failed to log frontend error:", loggingError);
    }
  }

  /**
   * Log security event
   * @param {Object} options - Security event options
   */
  static async security(options) {
    const { message, req = {}, severity = "high", metadata = {} } = options;

    try {
      const logEntry = new Logs({
        logType: "security",
        source: "backend",
        severity,
        message,
        userId: req.user?._id,
        request: {
          ip: req.ip || req.connection?.remoteAddress,
          userAgent: req.get?.("user-agent"),
          endpoint: req.originalUrl || req.url,
          method: req.method,
          headers: sanitizeHeaders(req.headers),
          query: req.query,
        },
        metadata,
        environment: process.env.NODE_ENV || "production",
        tags: ["security"],
      });

      await logEntry.save();

      // Always log security events to console
      console.warn(`[SECURITY] ${message}`);
    } catch (loggingError) {
      console.error("Failed to log security event:", loggingError);
    }
  }

  /**
   * Log performance metric
   * @param {Object} options - Performance logging options
   */
  static async performance(options) {
    const { message, req = {}, responseTime, metadata = {} } = options;

    try {
      const logEntry = new Logs({
        logType: "performance",
        source: "backend",
        severity: responseTime > 3000 ? "high" : responseTime > 1000 ? "medium" : "low",
        message,
        location: {
          endpoint: req.originalUrl || req.url,
          method: req.method,
        },
        userId: req.user?._id,
        response: {
          responseTime,
        },
        metadata,
        environment: process.env.NODE_ENV || "production",
        tags: ["performance"],
      });

      await logEntry.save();
    } catch (loggingError) {
      console.error("Failed to log performance:", loggingError);
    }
  }

  /**
   * Log info message
   * @param {Object} options - Info logging options
   */
  static async info(options) {
    const { message, req = {}, metadata = {} } = options;

    try {
      const logEntry = new Logs({
        logType: "info",
        source: "backend",
        severity: "info",
        message,
        userId: req.user?._id,
        location: {
          endpoint: req.originalUrl || req.url,
          method: req.method,
        },
        metadata,
        environment: process.env.NODE_ENV || "production",
      });

      await logEntry.save();

      if (process.env.NODE_ENV === "development") {
        console.log(`[INFO] ${message}`);
      }
    } catch (loggingError) {
      console.error("Failed to log info:", loggingError);
    }
  }

  /**
   * Log debug message (only in development)
   * @param {Object} options - Debug logging options
   */
  static async debug(options) {
    if (process.env.NODE_ENV !== "development") {
      return;
    }

    const { message, req = {}, metadata = {} } = options;

    try {
      const logEntry = new Logs({
        logType: "debug",
        source: "backend",
        severity: "info",
        message,
        userId: req.user?._id,
        metadata,
        environment: "development",
      });

      await logEntry.save();
      console.debug(`[DEBUG] ${message}`);
    } catch (loggingError) {
      console.error("Failed to log debug:", loggingError);
    }
  }
}

/**
 * Helper function to sanitize headers (remove sensitive data)
 */
function sanitizeHeaders(headers) {
  if (!headers) return {};
  const sanitized = { ...headers };
  delete sanitized.authorization;
  delete sanitized.cookie;
  return sanitized;
}

module.exports = Logger;
