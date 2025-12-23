require("dotenv").config();
const crypto = require("crypto");

class CCAvenueService {
  constructor() {
    // Check if we should use test environment
    const isTest = process.env.CCAVENUE_TEST_MODE === "true";

    if (isTest) {
      console.log("🧪 CCAvenue: Using TEST environment");
      // Use separate test credentials if provided, otherwise fall back to production credentials
      this.workingKey = (process.env.CCAVENUE_TEST_WORKING_KEY || process.env.CCAVENUE_WORKING_KEY)?.trim();
      this.accessCode = (process.env.CCAVENUE_TEST_ACCESS_CODE || process.env.CCAVENUE_ACCESS_CODE)?.trim();
      this.merchantId = (process.env.CCAVENUE_TEST_MERCHANT_ID || process.env.CCAVENUE_MERCHANT_ID)?.trim();
      // Test environment uses different URL
      this.ccavenueUrl = "https://secure.ccavenue.com/transaction/transaction.do?command=initiateTransaction";
    } else {
      console.log("🔒 CCAvenue: Using PRODUCTION environment");
      this.workingKey = process.env.CCAVENUE_WORKING_KEY?.trim();
      this.accessCode = process.env.CCAVENUE_ACCESS_CODE?.trim();
      this.merchantId = process.env.CCAVENUE_MERCHANT_ID?.trim();
      this.ccavenueUrl =
        process.env.CCAVENUE_URL ||
        "https://secure.ccavenue.com/transaction/transaction.do?command=initiateTransaction";
    }

    this.redirectUrl =
      process.env.CCAVENUE_REDIRECT_URL ||
      "https://uat.tangerineluxury.com/api/ccavenue/response";
    this.cancelUrl =
      process.env.CCAVENUE_CANCEL_URL ||
      "https://uat.tangerineluxury.com/api/payment/cancel";

    if (!this.workingKey || !this.accessCode || !this.merchantId) {
      console.error(
        "CCAvenue configuration missing. Please set CCAVENUE_WORKING_KEY, CCAVENUE_ACCESS_CODE, and CCAVENUE_MERCHANT_ID"
      );
    } else {
      console.log(`✅ CCAvenue configured with Merchant ID: ${this.merchantId}`);
      console.log(`✅ Access Code: ${this.accessCode}`);
      console.log(`✅ Redirect URL: ${this.redirectUrl}`);
    }
  }

  /**
   * Encrypt data for CCAvenue
   */
  encrypt(plainText) {
    try {
      if (!this.workingKey) {
        throw new Error("CCAvenue working key not configured");
      }

      // CCAvenue specific encryption using MD5 hashed key
      const m = crypto.createHash("md5");
      m.update(this.workingKey);
      const key = m.digest();

      // CCAvenue uses specific IV pattern (not all zeros!)
      const iv = Buffer.from([0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0a, 0x0b, 0x0c, 0x0d, 0x0e, 0x0f]);

      const cipher = crypto.createCipheriv("aes-128-cbc", key, iv);

      let encrypted = cipher.update(plainText, "utf8", "hex");
      encrypted += cipher.final("hex");
        // console.log(encrypted);
      return encrypted;
    } catch (error) {
      console.error("Encryption error:", error);
      throw new Error("Failed to encrypt payment data");
    }
  }

  /**
   * Decrypt response from CCAvenue
   */
  decrypt(encryptedText) {
    try {
      if (!this.workingKey) {
        throw new Error("CCAvenue working key not configured");
      }

      // CCAvenue specific decryption using MD5 hashed key
      const m = crypto.createHash("md5");
      m.update(this.workingKey);
      const key = m.digest();

      // CCAvenue uses specific IV pattern (not all zeros!)
      const iv = Buffer.from([0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0a, 0x0b, 0x0c, 0x0d, 0x0e, 0x0f]);

      const decipher = crypto.createDecipheriv("aes-128-cbc", key, iv);

      let decrypted = decipher.update(encryptedText, "hex", "utf8");
      decrypted += decipher.final("utf8");
      //  console.log(decrypted);
      return decrypted;
    } catch (error) {
      console.error("Decryption error:", error);
      throw new Error("Failed to decrypt payment response");
    }
  }

  /**
   * Create payment request for CCAvenue
   */
  createPaymentRequest(orderData) {
    const {
      orderId,
      amount,
      customerName,
      customerEmail,
      customerPhone,
      billingAddress,
      deliveryAddress,
    } = orderData;

    // Format amount (CCAvenue expects amount in decimal format)
    const formattedAmount = parseFloat(amount).toFixed(2);

    // Create the request data
    const requestData = {
      merchant_id: this.merchantId,
      order_id: orderId,
      amount: formattedAmount,
      currency: "INR",
      redirect_url: this.redirectUrl,
      cancel_url: this.cancelUrl,
      language: "EN",
      billing_name: customerName,
      billing_email: customerEmail,
      billing_tel: customerPhone,
      billing_address: billingAddress?.addressLine1 || "",
      billing_city: billingAddress?.city || "",
      billing_state: billingAddress?.state || "",
      billing_zip: billingAddress?.postalCode || "",
      billing_country: billingAddress?.country || "India",
      delivery_name: customerName,
      delivery_address:
        deliveryAddress?.addressLine1 || billingAddress?.addressLine1 || "",
      delivery_city: deliveryAddress?.city || billingAddress?.city || "",
      delivery_state: deliveryAddress?.state || billingAddress?.state || "",
      delivery_zip:
        deliveryAddress?.postalCode || billingAddress?.postalCode || "",
      delivery_country:
        deliveryAddress?.country || billingAddress?.country || "India",
      delivery_tel: customerPhone,
      merchant_param1: "TangerineLuxury",
      merchant_param2: orderId,
      merchant_param3: "online_payment",
      promo_code: "",
      customer_identifier: customerEmail,
    };

    // Log the merchant ID being sent (for debugging)
    // console.log(`🔐 Creating payment request for Order: ${orderId}`);
    // console.log(`📝 Merchant ID being sent: "${this.merchantId}"`);
    // console.log(`💰 Amount: ${formattedAmount} ${requestData.currency}`);

    // Convert to query string format
    const queryString = Object.keys(requestData)
      .map((key) => `${key}=${encodeURIComponent(requestData[key])}`)
      .join("&");

    // Log the query string before encryption (without sensitive data)
    // console.log(`📤 Request data prepared with ${Object.keys(requestData).length} fields`);

    // Encrypt the data
    const encryptedData = this.encrypt(queryString);

    return {
      access_code: this.accessCode,
      encRequest: encryptedData,
      ccavenueUrl: this.ccavenueUrl,
    };
  }

  /**
   * Process payment response from CCAvenue
   */
  processPaymentResponse(encryptedResponse) {
    try {
      // Decrypt the response
      const decryptedResponse = this.decrypt(encryptedResponse);

      // Parse the response into key-value pairs
      const responseData = {};
      const pairs = decryptedResponse.split("&");

      pairs.forEach((pair) => {
        const [key, value] = pair.split("=");
        if (key && value) {
          responseData[key] = decodeURIComponent(value);
        }
      });

      // Validate the response
      const isSuccess = responseData.order_status === "Success";
      const isFailure = responseData.order_status === "Failure";
      const isAborted = responseData.order_status === "Aborted";

      return {
        success: isSuccess,
        orderId: responseData.order_id,
        trackingId: responseData.tracking_id,
        bankRefNo: responseData.bank_ref_no,
        orderStatus: responseData.order_status,
        failureMessage: responseData.failure_message,
        paymentMode: responseData.payment_mode,
        cardName: responseData.card_name,
        statusMessage: responseData.status_message,
        amount: parseFloat(responseData.amount),
        currency: responseData.currency,
        billingName: responseData.billing_name,
        billingEmail: responseData.billing_email,
        merchantParam1: responseData.merchant_param1,
        merchantParam2: responseData.merchant_param2,
        merchantParam3: responseData.merchant_param3,
        responseTime: new Date().toISOString(),
        rawResponse: responseData,
      };
    } catch (error) {
      console.error("Error processing payment response:", error);
      throw new Error("Failed to process payment response");
    }
  }

  /**
   * Verify payment status with CCAvenue (optional)
   */
  async verifyPayment(orderId, trackingId) {
    try {
      // This would typically involve calling CCAvenue's verification API
      // For now, we'll return a basic structure
      return {
        verified: true,
        orderId,
        trackingId,
        status: "verified",
      };
    } catch (error) {
      console.error("Payment verification error:", error);
      throw new Error("Failed to verify payment");
    }
  }

  /**
   * Generate payment form HTML for frontend
   */
  generatePaymentForm(paymentRequest, formId = "ccavenue-form") {
    return `
      <form id="${formId}" method="post" action="${paymentRequest.ccavenueUrl}" style="display: none;">
        <input type="hidden" name="access_code" value="${paymentRequest.access_code}">
        <input type="hidden" name="encRequest" value="${paymentRequest.encRequest}">
        <input type="submit" value="Submit">
      </form>
      <script>
        document.getElementById('${formId}').submit();
      </script>
    `;
  }
}

// Create instance only when accessed to ensure environment variables are loaded
let instance;
module.exports = {
  getInstance() {
    if (!instance) {
      instance = new CCAvenueService();
    }
    return instance;
  },

  // For backward compatibility, provide direct access to methods
  encrypt: function (plainText) {
    return this.getInstance().encrypt(plainText);
  },
  decrypt: function (encryptedText) {
    return this.getInstance().decrypt(encryptedText);
  },
  createPaymentRequest: function (orderData) {
    return this.getInstance().createPaymentRequest(orderData);
  },
  processPaymentResponse: function (encryptedResponse) {
    return this.getInstance().processPaymentResponse(encryptedResponse);
  },
  verifyPayment: function (orderId, trackingId) {
    return this.getInstance().verifyPayment(orderId, trackingId);
  },
  generatePaymentForm: function (paymentRequest, formId) {
    return this.getInstance().generatePaymentForm(paymentRequest, formId);
  },
};
