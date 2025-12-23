const User = require("../models/user.model");
const Order = require("../models/order.model");
const Address = require("../models/address.model");
const Coupon = require("../models/coupon.model");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");

// Helper function to sign JWT token
const signToken = (user) => {
  return jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN }
  );
};

// Helper function to send welcome email
const sendWelcomeEmail = async (user, password) => {
  try {
    // Create a test account using Ethereal for development
    // In production, use your actual SMTP credentials
    const testAccount = await nodemailer.createTestAccount();
    
    // Create a transporter
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || "smtp.ethereal.email",
      port: process.env.EMAIL_PORT || 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER || testAccount.user,
        pass: process.env.EMAIL_PASS || testAccount.pass,
      },
    });
    
    // Send email
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM || '"Tangerine Luxury" <noreply@tangerineluxury.com>',
      to: user.email,
      subject: "Welcome to Tangerine Luxury - Your Account Has Been Created",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Welcome to Tangerine Luxury!</h2>
          <p>Dear ${user.name},</p>
          <p>Thank you for your purchase! We've created an account for you to track your orders and manage your profile.</p>
          <p><strong>Your account details:</strong></p>
          <ul>
            <li>Email: ${user.email}</li>
            <li>Temporary Password: ${password}</li>
          </ul>
          <p>For security reasons, we recommend changing your password after logging in.</p>
          <p>You can log in to your account <a href="${process.env.FRONTEND_URL || 'https://tangerineluxury.com'}/signin">here</a>.</p>
          <p>Thank you for shopping with us!</p>
          <p>Best regards,<br>The Tangerine Luxury Team</p>
        </div>
      `,
    });
    
    // console.log("Welcome email sent: %s", info.messageId);
    return nodemailer.getTestMessageUrl(info);
  } catch (error) {
    console.error("Error sending welcome email:", error);
    return null;
  }
};

// Process guest checkout
exports.guestCheckout = async (req, res) => {
  try {
    const {
      customerInfo,
      shippingAddress,
      items,
      subtotal,
      deliveryCharge,
      couponCode,
      paymentMethod
    } = req.body;
    
    if (!customerInfo || !shippingAddress || !items || !subtotal || !paymentMethod) {
      return res.status(400).json({ 
        status: "fail", 
        message: "Missing required checkout information" 
      });
    }
    
    const { name, email, phone } = customerInfo;
    
    if (!name || !email || !phone) {
      return res.status(400).json({ 
        status: "fail", 
        message: "Customer name, email, and phone are required" 
      });
    }
    
    // Check if user already exists
    let user = await User.findOne({ email });
    let isNewUser = false;
    let tempPassword = "";
    
    if (!user) {
      // Create a new user with phone number as password
      tempPassword = phone.replace(/[^0-9]/g, ""); // Remove non-numeric characters
      
      if (tempPassword.length < 6) {
        // Ensure password meets minimum length requirement
        tempPassword = tempPassword + "000000".substring(0, 6 - tempPassword.length);
      }
      
      user = await User.create({
        name,
        email,
        password: tempPassword,
        role: "user"
      });
      
      isNewUser = true;
    }
    
    // Create or update address
    const addressData = {
      ...shippingAddress,
      user: user._id,
      name: shippingAddress.name || name,
      phone: shippingAddress.phone || phone,
      isDefault: true
    };
    
    // Check if user already has this address
    const existingAddress = await Address.findOne({
      user: user._id,
      addressLine1: addressData.addressLine1,
      city: addressData.city,
      postalCode: addressData.postalCode
    });
    
    let address;
    if (existingAddress) {
      address = existingAddress;
    } else {
      address = await Address.create(addressData);
    }
    
    // Process order data
    let orderData = {
      user: user._id,
      items: items.map(item => ({
        productId: item.id || item.productId,
        quantity: item.quantity,
        price: item.price
      })),
      shippingAddress: address._id,
      subtotal,
      deliveryCharge: deliveryCharge || 0,
      paymentMethod
    };
    
    // Handle coupon if provided
    if (couponCode) {
      const coupon = await Coupon.findOne({ 
        code: couponCode.toUpperCase(),
        isActive: true
      });
      
      if (coupon) {
        // Check if coupon is expired
        const now = new Date();
        if (now <= coupon.endDate && now >= coupon.startDate) {
          // Check usage limit
          if (!coupon.usageLimit || coupon.usedCount < coupon.usageLimit) {
            // Calculate discount
            let discount = 0;
            if (coupon.type === "percentage") {
              discount = (subtotal * coupon.value) / 100;
              // Apply max discount if set
              if (coupon.maxDiscount && discount > coupon.maxDiscount) {
                discount = coupon.maxDiscount;
              }
            } else {
              // Fixed amount discount
              discount = coupon.value;
              // Ensure discount doesn't exceed cart total
              if (discount > subtotal) {
                discount = subtotal;
              }
            }
            
            // Update coupon usage
            coupon.usedCount += 1;
            coupon.userUsage.push({
              userId: user._id,
              usedCount: 1,
              lastUsed: new Date(),
            });
            await coupon.save();
            
            // Add coupon data to order
            orderData.coupon = {
              couponId: coupon._id,
              code: coupon.code,
              discountAmount: parseFloat(discount.toFixed(2))
            };

            // Calculate total: subtotal - discount + deliveryCharge
            const deliveryChargeAmount = deliveryCharge || 0;
            orderData.totalAmount = parseFloat((subtotal - discount + deliveryChargeAmount).toFixed(2));
          }
        }
      }
    }

    // If no coupon or invalid coupon, total = subtotal + deliveryCharge
    if (!orderData.totalAmount) {
      const deliveryChargeAmount = deliveryCharge || 0;
      orderData.totalAmount = parseFloat((subtotal + deliveryChargeAmount).toFixed(2));
    }
    
    // Create the order
    const order = await Order.create(orderData);
    
    // Send welcome email if new user
    let emailPreviewUrl = null;
    if (isNewUser) {
      emailPreviewUrl = await sendWelcomeEmail(user, tempPassword);
    }
    
    // Generate token for auto-login
    const token = signToken(user);
    
    res.status(201).json({
      status: "success",
      order,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      },
      isNewUser,
      token,
      emailPreviewUrl // For development purposes
    });
    
  } catch (error) {
    console.error("Guest checkout error:", error);
    res.status(500).json({
      status: "error",
      message: error.message
    });
  }
};