const axios = require("axios");
const moment = require("moment");

class SMSService {
  constructor() {
    this.apiKey = process.env.SMSGATEWAYHUB_API_KEY;
    this.senderId = process.env.SMSGATEWAYHUB_SENDER_ID;
    this.baseUrl = "https://www.smsgatewayhub.com/api/mt/SendSMS";
    this.balanceGetBaseUrl = "https://www.smsgatewayhub.com/api/mt/GetBalance";
    this.isTestMode = process.env.NODE_ENV === "development";

    // Rate limiting settings
    this.dailyLimit = parseInt(process.env.SMS_DAILY_LIMIT) || 1000;
    this.perUserDailyLimit =
      parseInt(process.env.SMS_PER_USER_DAILY_LIMIT) || 10;
    this.minInterval = 60000; // 1 minute between SMS to same number
  }

  /**
   * Validate phone number format
   * @param {string} phoneNumber
   * @returns {string|null}
   */
  validatePhoneNumber(phoneNumber) {
    // Remove all non-digits
    const cleaned = phoneNumber.replace(/\D/g, "");

    // Check if it's a valid Indian mobile number
    if (cleaned.length === 10 && cleaned.match(/^[6-9]\d{9}$/)) {
      return `91${cleaned}`; // Add country code
    }

    // Check if already has country code
    if (
      cleaned.length === 12 &&
      cleaned.startsWith("91") &&
      cleaned.substring(2).match(/^[6-9]\d{9}$/)
    ) {
      return cleaned;
    }

    return null;
  }

  /**
   * Check rate limits for SMS sending
   * @param {string} phoneNumber
   * @returns {Promise<boolean>}
   */
  async checkRateLimits(phoneNumber) {
    try {
      const SMSLog = require("../models/smsLog.model");
      const today = moment().startOf("day");

      // Check daily total limit
      const todayTotal = await SMSLog.countDocuments({
        createdAt: { $gte: today.toDate() },
      });

      if (todayTotal >= this.dailyLimit) {
        throw new Error("Daily SMS limit reached");
      }

      // Check per-user daily limit
      const userTodayCount = await SMSLog.countDocuments({
        phoneNumber,
        createdAt: { $gte: today.toDate() },
      });

      if (userTodayCount >= this.perUserDailyLimit) {
        throw new Error("Daily SMS limit reached for this user");
      }

      // Check minimum interval between SMS
      const lastSMS = await SMSLog.findOne({
        phoneNumber,
        createdAt: { $gte: moment().subtract(1, "minute").toDate() },
      });

      if (lastSMS) {
        throw new Error("Please wait before sending another SMS");
      }

      return true;
    } catch (error) {
      // If MongoDB is not available, skip rate limiting in test mode
      if (
        this.isTestMode &&
        (error.message.includes("buffering timed out") ||
          error.message.includes("connection"))
      ) {
        console.warn(
          "MongoDB not available for rate limiting, skipping in test mode"
        );
        return true;
      }
      throw error;
    }
  }

  /**
   * Log SMS activity
   * @param {object} smsData
   */
  async logSMS(smsData) {
    try {
      const SMSLog = require("../models/smsLog.model");
      await SMSLog.create(smsData);
    } catch (error) {
      // Don't fail SMS sending if logging fails
      if (
        error.message.includes("buffering timed out") ||
        error.message.includes("connection")
      ) {
        console.warn(
          "MongoDB not available for logging SMS, skipping log entry"
        );
      } else {
        console.error("Error logging SMS:", error);
      }
    }
  }

  /**
   * Send SMS using SMS Gateway Hub API
   * @param {string|string[]} phoneNumbers
   * @param {string} message
   * @param {object} options
   * @returns {Promise<object>}
   */
  async sendSMS(phoneNumbers, message, options = {}) {
    // console.log(message);
    try {
      if (!this.apiKey) {
        throw new Error("SMS Gateway Hub API key not configured");
      }

      // Handle single number or array
      const numbers = Array.isArray(phoneNumbers)
        ? phoneNumbers
        : [phoneNumbers];

      // Validate and format phone numbers
      const validNumbers = [];
      for (const number of numbers) {
        const validNumber = this.validatePhoneNumber(number);
        if (validNumber) {
          // Check rate limits for each number
          await this.checkRateLimits(validNumber);
          validNumbers.push(validNumber);
        }
      }

      if (validNumbers.length === 0) {
        throw new Error("No valid phone numbers provided");
      }

      // Check if message exceeds character limit
      if (message.length > 918) {
        throw new Error("Message exceeds 918 character limit");
      }

      const results = [];
      const successfulNumbers = [];
      let totalCost = 0;

      // Send SMS to each number individually (SMS Gateway Hub doesn't support bulk)
      for (const number of validNumbers) {
        try {
          const params = {
            APIKey: this.apiKey,
            senderid: this.senderId,
            channel: "2",
            DCS: "0", // Default data coding scheme
            flashsms: "0",
            number: number,
            text: message,
            route: options.route || "1", // Transactional route
          };

          // Add scheduling if provided
          if (options.scheduleTime) {
            params.scheduledatetime = moment(options.scheduleTime).format(
              "YYYY-MM-DD HH:mm:ss"
            );
          }

          const response = await axios.get(this.baseUrl, {
            params,
            timeout: 30000,
          });

          // Parse response - SMS Gateway Hub typically returns status in response
          const responseText = response.data.toString();
          let messageId = null;
          let status = "failed";

          // Check for success indicators in response
          if (response.statusText === "ok") {
            status = "sent";
            const messageIdMatch = responseText.match(/(\d{10,})/);
            messageId = messageIdMatch
              ? messageIdMatch[1]
              : "sgh-" + Date.now();
            successfulNumbers.push(number);
            totalCost += 0.1; // Estimate cost
          }

          results.push({
            number,
            status,
            messageId,
            response: responseText,
          });

          // Log SMS
          await this.logSMS({
            phoneNumber: number,
            message: message,
            status: status,
            provider: "smsgatewayhub",
            batchId: messageId,
            cost: status === "sent" ? 0.1 : 0,
            type: options.type || "general",
            userId: options.userId,
            orderId: options.orderId,
            response: responseText,
          });
        } catch (smsError) {
          console.error(`SMS sending failed for ${number}:`, smsError.message);

          results.push({
            number,
            status: "failed",
            error: smsError.message,
          });

          // Log failed SMS
          await this.logSMS({
            phoneNumber: number,
            message: message,
            status: "failed",
            provider: "smsgatewayhub",
            error: smsError.message,
            type: options.type || "general",
            userId: options.userId,
            orderId: options.orderId,
          });
        }
      }

      return {
        success: true,
        batchId: "sgh-batch-" + Date.now(),
        cost: totalCost,
        balance: null, // SMS Gateway Hub doesn't provide balance info
        messagesSent: successfulNumbers.length,
        recipients: successfulNumbers,
        details: results,
      };
    } catch (error) {
      console.error("SMS Service Error:", error.message);
      throw new Error(`SMS sending failed: ${error.message}`);
    }
  }

  /**
   * Send order confirmation SMS
   * @param {object} order
   * @param {object} user
   */
  async sendOrderConfirmationSMS(order, user) {
    try {
      if (!user.phone) {
        console.log("No phone number available for order confirmation SMS");
        return;
      }

      const message = `Dear ${user.name}, Thanks for shopping with Tangerine Luxury. We have receipt your order request. Your order number is ${order.orderNumber}.`;

      return await this.sendSMS(user.phone, message, {
        type: "order_confirmation",
        userId: user._id,
        orderId: order._id,
        route: "1", // Transactional route
      });
    } catch (error) {
      console.error("Order confirmation SMS error:", error.message);
      throw error;
    }
  }

  /**
   * Send order status update SMS
   * @param {object} order
   * @param {object} user
   * @param {string} newStatus
   */
  async sendOrderStatusSMS(order, user, newStatus) {
    try {
      if (!user.phone) {
        console.log("No phone number available for order status SMS");
        return;
      }

      let message = "";
      const orderNumber = order.orderNumber;

      switch (newStatus.toLowerCase()) {
        case "processing":
          message = `Great news! Your order #${orderNumber} is now being processed. We'll update you once it's shipped. - Tangerine Luxury`;
          break;
        case "shipped":
          const trackingInfo = order.tracking?.trackingNumber
            ? ` Tracking: ${order.tracking.trackingNumber}`
            : "";
          message = `Your order #${orderNumber} has been shipped!${trackingInfo} Track at ${process.env.FRONTEND_URL}/track-order - Tangerine Luxury`;
          break;
        case "delivered":
          message = `Hooray! Your order #${orderNumber} has been delivered. Hope you love your purchase! Rate us: ${process.env.FRONTEND_URL} - Tangerine Luxury`;
          break;
        case "cancelled":
          message = `Your order #${orderNumber} has been cancelled. If you have questions, contact support at ${process.env.FRONTEND_URL}/contact - Tangerine Luxury`;
          break;
        default:
          message = `Order #${orderNumber} status updated to: ${newStatus}. Check details at ${process.env.FRONTEND_URL}/dashboard - Tangerine Luxury`;
      }

      return await this.sendSMS(user.phone, message, {
        type: "order_status",
        userId: user._id,
        orderId: order._id,
        route: "1", // Transactional route
      });
    } catch (error) {
      console.error("Order status SMS error:", error.message);
      throw error;
    }
  }

  /**
   * Send promotional SMS
   * @param {string|string[]} phoneNumbers
   * @param {string} message
   * @param {object} options
   */
  async sendPromotionalSMS(phoneNumbers, message, options = {}) {
    try {
      // Add promotional disclaimer
      const promotionalMessage = `${message}\n\nReply STOP to unsubscribe - Tangerine Luxury`;

      return await this.sendSMS(phoneNumbers, promotionalMessage, {
        type: "promotional",
        route: "2", // Promotional route
        ...options,
      });
    } catch (error) {
      console.error("Promotional SMS error:", error.message);
      throw error;
    }
  }

  /**
   * Send custom admin SMS
   * @param {string|string[]} phoneNumbers
   * @param {string} message
   * @param {object} options
   */
  async sendCustomSMS(phoneNumbers, message, options = {}) {
    try {
      return await this.sendSMS(phoneNumbers, message, {
        type: "custom",
        route: options.promotional ? "2" : "1",
        ...options,
      });
    } catch (error) {
      console.error("Custom SMS error:", error.message);
      throw error;
    }
  }

  /**
   * Get account balance (SMS Gateway Hub doesn't provide this directly)
   */
  async getBalance() {
    try {
      const params = {
        APIKey: this.apiKey,
      };
      const response = await axios.get(this.balanceGetBaseUrl, {
        params,
        timeout: 30000,
      });
      // console.log(response)
      if (response.status == 200) {
        const str=response?.data?.Balance;
        const parts = str.split("|");
        const obj = parts.reduce((acc, part) => {
          const [key, value] = part.split(":"); 
          acc[key] = parseFloat(value); 
          return acc;
        }, {});
        // console.log(obj);
        return {
          balance: obj?.Trans,
          message: "It has multiple balance status",
        };
      }
      return {
        balance: "Not available",
        message: "SMS Gateway Hub doesn't provide balance information via API",
      };
    } catch (error) {
      console.log(error);
      return {
        balance: "Not available",
        message: "SMS Gateway Hub doesn't provide balance information via API",
      };
    }
  }

  /**
   * Check if SMS service is healthy
   */
  async checkHealth() {
    try {
      if (!this.apiKey) {
        return {
          healthy: false,
          error: "SMS Gateway Hub API key not configured",
          service: "smsgatewayhub",
        };
      }

      // Try a simple test to verify API connectivity
      // Note: This is a basic check, actual health check would require a test SMS
      return {
        healthy: true,
        message: "SMS Gateway Hub service configured",
        service: "smsgatewayhub",
        apiKey: this.apiKey ? "Configured" : "Not configured",
      };
    } catch (error) {
      return {
        healthy: false,
        error: error.message,
        service: "smsgatewayhub",
      };
    }
  }
}

module.exports = new SMSService();
