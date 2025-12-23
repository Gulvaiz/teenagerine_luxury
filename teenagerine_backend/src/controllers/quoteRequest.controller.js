require('dotenv').config();
const QuoteRequest = require("../models/quoteRequest.model");
const Product = require("../models/product.model");
const nodemailer = require("nodemailer");

// Create a singleton transporter instance
let transporter = null;

const getTransporter = () => {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: parseInt(process.env.EMAIL_PORT),
      secure: true, // Use SSL for port 465
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
      pool: true, // Use connection pooling
      maxConnections: 5,
      maxMessages: 100,
      rateLimit: 14, // Limit to 14 messages per second
      connectionTimeout: 60000, // 60 seconds
      greetingTimeout: 30000, // 30 seconds
      socketTimeout: 60000, // 60 seconds
    });
  }
  return transporter;
};

// Create a new quote request
exports.createQuoteRequest = async (req, res) => {
  try {
    const { productId, fullName, email, phone, whatsapp, price, quantity = 1, message,url } = req.body;

    // Validate required fields
    if (!productId || !fullName || !email || !phone || !price || !url) {
      return res.status(400).json({
        status: "fail",
        message: "Missing required fields",
      });
    }

    // Check if product exists
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        status: "fail",
        message: "Product not found",
      });
    }

    // Create quote request
    const quoteRequest = new QuoteRequest({
      productId,
      fullName,
      email,
      phone,
      whatsapp: whatsapp || "",
      price,
      quantity,
      productUrl: (process.env.FRONTED_URI && url) ? `${process.env.FRONTED_URI}${url}` : '',
      message: message || "",
      isGuest: !req.user,
      userId: req.user ? req.user._id : null,
    });

    await quoteRequest.save();

    // Send email notification to admin
    await sendAdminNotification(quoteRequest, product);

    // Send confirmation email to user
    await sendUserConfirmation(quoteRequest, product);

    res.status(201).json({
      status: "success",
      data: {
        quoteRequest,
      },
    });
  } catch (error) {
    console.error("Error creating quote request:", error);
    res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
};

// Get all quote requests (admin only)
exports.getAllQuoteRequests = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, startDate, endDate, productId } = req.query;
    const skip = (page - 1) * limit;

    // Build query
    const query = {};
    if (status) query.status = status;
    if (productId) query.productId = productId;
    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    const quoteRequests = await QuoteRequest.find(query)
      .populate("productId", "name image price")
      .populate("userId", "name email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await QuoteRequest.countDocuments(query);

    res.status(200).json({
      status: "success",
      results: quoteRequests.length,
      total,
      totalPages: Math.ceil(total / limit),
      page: Number(page),
      data: {
        quoteRequests,
      },
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
};

// Update quote request status (admin only)
exports.updateQuoteRequestStatus = async (req, res) => {
  try {
    const { status } = req.body;

    if (!["pending", "responded", "closed"].includes(status)) {
      return res.status(400).json({
        status: "fail",
        message: "Invalid status value",
      });
    }

    const quoteRequest = await QuoteRequest.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    if (!quoteRequest) {
      return res.status(404).json({
        status: "fail",
        message: "Quote request not found",
      });
    }

    res.status(200).json({
      status: "success",
      data: {
        quoteRequest,
      },
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
};

// Helper function to send email notification to admin
const sendAdminNotification = async (quoteRequest, product) => {
  try {
    const emailTransporter = getTransporter();

    await emailTransporter.sendMail({
      from: process.env.EMAIL_FROM || '"Tangerine Luxury" <quotes@tangerineluxury.com>',
      to: "consign@tangerineluxury.com",
      cc: process.env.EMAIL_USER,
      subject: `New Quote Request: ${quoteRequest.referenceNumber}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>New Quote Request</title>
        </head>
        <body style="margin: 0; padding: 0; background-color: #f4f4f4; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
          <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">

            <!-- Header -->
            <div style="background: linear-gradient(135deg, #ff6b35, #f7931e); padding: 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 600; text-shadow: 0 2px 4px rgba(0,0,0,0.3);">
                🔔 New Quote Request
              </h1>
              <p style="color: #ffffff; margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">
                Reference: ${quoteRequest.referenceNumber}
              </p>
            </div>

            <!-- Content -->
            <div style="padding: 40px 30px;">

              <!-- Product Section -->
              <div style="background-color: #f8f9fa; border-left: 4px solid #ff6b35; padding: 20px; margin-bottom: 30px; border-radius: 0 8px 8px 0;">
                <h2 style="color: #333; margin: 0 0 15px 0; font-size: 20px; display: flex; align-items: center;">
                  🛍️ Product Details
                </h2>
                <p style="margin: 0; font-size: 16px; color: #555; font-weight: 600;">${product.name}</p>
                <div style="margin-top: 15px;">
                  <span style="background-color: #ff6b35; color: white; padding: 8px 16px; border-radius: 20px; font-size: 14px; font-weight: 600;">
                    ₹${quoteRequest.price.toLocaleString()}
                  </span>
                </div>
                ${quoteRequest.productUrl ? `
                <div style="margin-top: 15px;">
                  <a href="${quoteRequest.productUrl}" style="color: #007bff; text-decoration: none; font-weight: 600; display: inline-block; padding: 8px 16px; background-color: #e3f2fd; border-radius: 6px; font-size: 14px;">
                    🔗 View Product
                  </a>
                </div>
                ` : ''}
              </div>

              <!-- Customer Section -->
              <div style="background-color: #f8f9fa; border-left: 4px solid #28a745; padding: 20px; margin-bottom: 30px; border-radius: 0 8px 8px 0;">
                <h2 style="color: #333; margin: 0 0 20px 0; font-size: 20px; display: flex; align-items: center;">
                  👤 Customer Information
                </h2>
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 8px 0; font-weight: 600; color: #666; width: 120px;">Name:</td>
                    <td style="padding: 8px 0; color: #333;">${quoteRequest.fullName}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; font-weight: 600; color: #666;">Email:</td>
                    <td style="padding: 8px 0; color: #333;">
                      <a href="mailto:${quoteRequest.email}" style="color: #007bff; text-decoration: none;">${quoteRequest.email}</a>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; font-weight: 600; color: #666;">Phone:</td>
                    <td style="padding: 8px 0; color: #333;">
                      <a href="tel:${quoteRequest.phone}" style="color: #007bff; text-decoration: none;">${quoteRequest.phone}</a>
                    </td>
                  </tr>
                  ${quoteRequest.whatsapp ? `
                  <tr>
                    <td style="padding: 8px 0; font-weight: 600; color: #666;">WhatsApp:</td>
                    <td style="padding: 8px 0; color: #333;">
                      <a href="https://wa.me/${quoteRequest.whatsapp.replace(/\D/g, '')}" style="color: #25d366; text-decoration: none;">${quoteRequest.whatsapp}</a>
                    </td>
                  </tr>
                  ` : ''}
                </table>
              </div>

              <!-- Message Section -->
              ${quoteRequest.message ? `
              <div style="background-color: #e3f2fd; border-left: 4px solid #2196f3; padding: 20px; margin-bottom: 30px; border-radius: 0 8px 8px 0;">
                <h2 style="color: #333; margin: 0 0 15px 0; font-size: 18px; display: flex; align-items: center;">
                  💬 Customer Message
                </h2>
                <p style="margin: 0; color: #555; font-style: italic; line-height: 1.6;">"${quoteRequest.message}"</p>
              </div>
              ` : ''}

              <!-- Details Section -->
              <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 20px; margin-bottom: 30px; border-radius: 0 8px 8px 0;">
                <h2 style="color: #333; margin: 0 0 15px 0; font-size: 18px; display: flex; align-items: center;">
                  📋 Request Details
                </h2>
                <p style="margin: 0 0 8px 0; color: #666;">
                  <strong>Date & Time:</strong> ${new Date(quoteRequest.createdAt).toLocaleString('en-IN', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
                <p style="margin: 0 0 8px 0; color: #666;">
                  <strong>Customer Type:</strong> ${quoteRequest.isGuest ? 'Guest User' : 'Registered User'}
                </p>
                ${quoteRequest.productUrl ? `
                <p style="margin: 0; color: #666;">
                  <strong>Product URL:</strong> <a href="${quoteRequest.productUrl}" style="color: #007bff; text-decoration: none;">${quoteRequest.productUrl}</a>
                </p>
                ` : ''}
              </div>

              <!-- Action Section -->
              <div style="text-align: center; margin: 40px 0;">
                <div style="background: linear-gradient(135deg, #dc3545, #c82333); display: inline-block; padding: 15px 30px; border-radius: 8px; box-shadow: 0 4px 8px rgba(220, 53, 69, 0.3);">
                  <p style="color: #ffffff; margin: 0; font-size: 16px; font-weight: 600;">
                    ⚡ Action Required: Please respond as soon as possible
                  </p>
                </div>
              </div>

            </div>

            <!-- Footer -->
            <div style="background-color: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #dee2e6;">
              <p style="margin: 0; color: #6c757d; font-size: 14px;">
                This email was sent from <strong>Tangerine Luxury</strong> Quote Management System
              </p>
              <p style="margin: 5px 0 0 0; color: #6c757d; font-size: 12px;">
                ${new Date().getFullYear()} © Tangerine Luxury. All rights reserved.
              </p>
            </div>

          </div>
        </body>
        </html>
      `,
    });
  } catch (error) {
    console.error("Error sending admin notification:", error);
    throw error;
  }
};

// Helper function to send confirmation email to user
const sendUserConfirmation = async (quoteRequest, product) => {
  try {
    const emailTransporter = getTransporter();

    await emailTransporter.sendMail({
      from: process.env.EMAIL_FROM || '"Tangerine Luxury" <quotes@tangerineluxury.com>',
      to: quoteRequest.email,
      subject: `Your Quote Request: ${quoteRequest.referenceNumber}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Quote Request Confirmation</title>
        </head>
        <body style="margin: 0; padding: 0; background-color: #f4f4f4; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
          <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">

            <!-- Header -->
            <div style="background: linear-gradient(135deg, #28a745, #20c997); padding: 40px 30px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 32px; font-weight: 600; text-shadow: 0 2px 4px rgba(0,0,0,0.3);">
                ✅ Thank You!
              </h1>
              <p style="color: #ffffff; margin: 15px 0 0 0; font-size: 18px; opacity: 0.95;">
                Your quote request has been received
              </p>
            </div>

            <!-- Content -->
            <div style="padding: 40px 30px;">

              <!-- Greeting -->
              <div style="text-align: center; margin-bottom: 40px;">
                <h2 style="color: #333; margin: 0 0 15px 0; font-size: 24px;">
                  Dear ${quoteRequest.fullName},
                </h2>
                <p style="color: #666; font-size: 16px; line-height: 1.6; margin: 0;">
                  We're excited to help you with your purchase! Our team has received your quote request and will review it carefully.
                </p>
              </div>

              <!-- Reference Number -->
              <div style="background: linear-gradient(135deg, #007bff, #0056b3); padding: 20px; text-align: center; border-radius: 12px; margin-bottom: 30px; box-shadow: 0 4px 8px rgba(0, 123, 255, 0.3);">
                <p style="color: #ffffff; margin: 0; font-size: 14px; opacity: 0.9;">Your Reference Number</p>
                <h3 style="color: #ffffff; margin: 8px 0 0 0; font-size: 24px; font-weight: 700; letter-spacing: 2px;">
                  ${quoteRequest.referenceNumber}
                </h3>
              </div>

              <!-- Product Summary -->
              <div style="background-color: #f8f9fa; border-left: 4px solid #ff6b35; padding: 25px; margin-bottom: 30px; border-radius: 0 12px 12px 0;">
                <h3 style="color: #333; margin: 0 0 20px 0; font-size: 20px; display: flex; align-items: center;">
                  🛍️ Your Product Request
                </h3>
                <div style="background-color: #ffffff; padding: 20px; border-radius: 8px; border: 1px solid #e9ecef;">
                  <h4 style="color: #333; margin: 0 0 15px 0; font-size: 18px; font-weight: 600;">
                    ${product.name}
                  </h4>
                  <div style="display: flex; flex-direction: column; justify-content: space-between; flex-wrap: wrap; gap: 15px; align-items: center;">
                    <div>
                      <p style="margin: 0; color: #666; font-size: 14px;">Your Offered Price</p>
                      <p style="margin: 5px 0 0 0; color: #28a745; font-size: 20px; font-weight: 700;">
                        ₹${quoteRequest.price.toLocaleString()}
                      </p>
                    </div>
                    ${quoteRequest.productUrl ? `
                    <div>
                      <a href="${quoteRequest.productUrl}" style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px; display: inline-block;">
                        🔗 View Product
                      </a>
                    </div>
                    ` : ''}
                  </div>
                </div>
              </div>

              <!-- Your Message -->
              ${quoteRequest.message ? `
              <div style="background-color: #e3f2fd; border-left: 4px solid #2196f3; padding: 20px; margin-bottom: 30px; border-radius: 0 8px 8px 0;">
                <h3 style="color: #333; margin: 0 0 15px 0; font-size: 18px; display: flex; align-items: center;">
                  💬 Your Message
                </h3>
                <p style="margin: 0; color: #555; font-style: italic; line-height: 1.6; background-color: #ffffff; padding: 15px; border-radius: 6px; border: 1px solid #bbdefb;">
                  "${quoteRequest.message}"
                </p>
              </div>
              ` : ''}

              <!-- What Happens Next -->
              <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 25px; margin-bottom: 30px; border-radius: 0 8px 8px 0;">
                <h3 style="color: #333; margin: 0 0 20px 0; font-size: 20px; display: flex; align-items: center;">
                  🚀 What Happens Next?
                </h3>
                <div style="space-y: 15px;">
                  <div style="display: flex; align-items: flex-start; margin-bottom: 15px;">
                    <span style="background-color: #ffc107; color: #333; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 12px; margin-right: 15px; flex-shrink: 0;">1</span>
                    <p style="margin: 0; color: #666; line-height: 1.5;">Our team will review your quote request within <strong>24 hours</strong></p>
                  </div>
                  <div style="display: flex; align-items: flex-start; margin-bottom: 15px;">
                    <span style="background-color: #ffc107; color: #333; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 12px; margin-right: 15px; flex-shrink: 0;">2</span>
                    <p style="margin: 0; color: #666; line-height: 1.5;">We'll contact you via <strong>email or phone</strong> with our response</p>
                  </div>
                  <div style="display: flex; align-items: flex-start;">
                    <span style="background-color: #ffc107; color: #333; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 12px; margin-right: 15px; flex-shrink: 0;">3</span>
                    <p style="margin: 0; color: #666; line-height: 1.5;">If we accept your quote, we'll arrange for <strong>payment and delivery</strong></p>
                  </div>
                </div>
              </div>

              <!-- Contact Information -->
              <div style="background-color: #f8f9fa; padding: 25px; border-radius: 12px; text-align: center; margin-bottom: 30px;">
                <h3 style="color: #333; margin: 0 0 20px 0; font-size: 18px;">
                  📞 Have Questions?
                </h3>
                <p style="margin: 0 0 15px 0; color: #666; line-height: 1.6;">
                  Feel free to reach out to us anytime
                </p>
                <div style="display: flex; justify-content: center; gap: 20px; flex-wrap: wrap;">
                  <a href="mailto:info@tangerineluxury.com" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight: 600;">
                    📧 Email Us
                  </a>
                  <a href="tel:${process.env.TANGERINE_PHONE_NUMBER}}" style="background-color: #28a745; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight: 600;">
                    📱 Call Us
                  </a>
                </div>
              </div>

              <!-- Thank You Message -->
              <div style="text-align: center; margin: 40px 0;">
                <div style="background: linear-gradient(135deg, #ff6b35, #f7931e); display: inline-block; padding: 20px 40px; border-radius: 12px; box-shadow: 0 4px 8px rgba(255, 107, 53, 0.3);">
                  <p style="color: #ffffff; margin: 0; font-size: 18px; font-weight: 600;">
                    🙏 Thank you for choosing Tangerine Luxury!
                  </p>
                </div>
              </div>

            </div>

            <!-- Footer -->
            <div style="background-color: #343a40; color: #ffffff; padding: 30px; text-align: center;">
              <h4 style="margin: 0 0 15px 0; color: #ffffff; font-size: 20px;">Tangerine Luxury</h4>
              <p style="margin: 0 0 10px 0; color: #adb5bd; font-size: 14px;">
                Your trusted partner for luxury goods
              </p>
              <p style="margin: 0; color: #6c757d; font-size: 12px;">
                ${new Date().getFullYear()} © Tangerine Luxury. All rights reserved.
              </p>
              <div style="margin-top: 20px;">
                <p style="margin: 0; color: #adb5bd; font-size: 12px;">
                  This is an automated confirmation email. Please save your reference number for future correspondence.
                </p>
              </div>
            </div>

          </div>
        </body>
        </html>
      `,
    });
  } catch (error) {
    console.error("Error sending user confirmation:", error);
    throw error;
  }
};