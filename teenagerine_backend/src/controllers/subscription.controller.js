const Subscription = require("../models/subscription.model");
const User = require("../models/user.model");
const emailService = require("../services/emailService");

// Create a new subscription
exports.subscribe = async (req, res) => {
  try {
    const { email, name } = req.body;
    
    // Check if email already exists
    const existingSubscription = await Subscription.findOne({ email });
    if (existingSubscription) {
      return res.status(400).json({
        status: "fail",
        message: "Email already subscribed",
      });
    }
    
    // Create new subscription
    const subscription = new Subscription({
      email,
      name,
      userId: req.user ? req.user._id : null,
    });
    
    await subscription.save();
    
    // Send welcome email
    try {
      await emailService.sendWelcomeEmail(email, name);
    } catch (emailError) {
      console.error("Failed to send welcome email:", emailError);
      // Don't fail the subscription if email fails
    }
    
    res.status(201).json({
      status: "success",
      data: { subscription },
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
};

// Get all subscriptions (admin only)
exports.getAllSubscriptions = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = "" } = req.query;
    const skip = (page - 1) * limit;
    
    const query = {};
    if (search) {
      query.$or = [
        { email: { $regex: search, $options: "i" } },
        { name: { $regex: search, $options: "i" } },
      ];
    }
    
    const subscriptions = await Subscription.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .populate("userId", "name email");
      
    const total = await Subscription.countDocuments(query);
    
    res.status(200).json({
      status: "success",
      results: subscriptions.length,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / limit),
      data: { subscriptions },
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
};

// Delete a subscription
exports.deleteSubscription = async (req, res) => {
  try {
    const subscription = await Subscription.findByIdAndDelete(req.params.id);
    
    if (!subscription) {
      return res.status(404).json({
        status: "fail",
        message: "Subscription not found",
      });
    }
    
    // Send unsubscribe confirmation email
    try {
      await emailService.sendUnsubscribeConfirmation(subscription.email);
    } catch (emailError) {
      console.error("Failed to send unsubscribe confirmation:", emailError);
      // Don't fail the unsubscribe if email fails
    }
    
    res.status(200).json({
      status: "success",
      data: null,
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
};

// Send email to selected subscribers
exports.sendEmail = async (req, res) => {
  try {
    const { 
      subject, 
      content, 
      recipients, 
      template = 'newsletter',
      templateData = {}
    } = req.body;
    
    if (!subject) {
      return res.status(400).json({
        status: "fail",
        message: "Subject is required",
      });
    }

    if (!content && template === 'newsletter') {
      return res.status(400).json({
        status: "fail",
        message: "Content is required for newsletter template",
      });
    }
    
    // Get recipient emails
    let recipientEmails = [];
    
    if (recipients === "all") {
      // Send to all active subscribers
      const allSubscriptions = await Subscription.find({ isActive: true });
      recipientEmails = allSubscriptions.map(sub => sub.email);
    } else if (Array.isArray(recipients)) {
      // Send to selected subscribers
      const selectedSubscriptions = await Subscription.find({
        _id: { $in: recipients },
        isActive: true,
      });
      recipientEmails = selectedSubscriptions.map(sub => sub.email);
    } else {
      return res.status(400).json({
        status: "fail",
        message: "Invalid recipients format",
      });
    }
    
    if (recipientEmails.length === 0) {
      return res.status(400).json({
        status: "fail",
        message: "No valid recipients found",
      });
    }

    // Prepare template data
    const emailData = {
      content,
      subject,
      ...templateData
    };
    
    // Send emails using the email service
    const result = await emailService.sendBulkEmail({
      recipients: recipientEmails,
      subject,
      template,
      data: emailData
    });
    
    res.status(200).json({
      status: "success",
      message: `Email campaign completed`,
      results: {
        totalRecipients: recipientEmails.length,
        successful: result.successful,
        failed: result.failed,
        errors: result.errors
      }
    });
  } catch (error) {
    console.error("Email sending error:", error);
    res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
};

// Send promotional email campaign
exports.sendPromotionalEmail = async (req, res) => {
  try {
    const { 
      subject, 
      title,
      content,
      discount,
      promoCode,
      expiryDate,
      featuredItems = [],
      callToAction,
      recipients = "all"
    } = req.body;
    
    if (!subject || !title) {
      return res.status(400).json({
        status: "fail",
        message: "Subject and title are required",
      });
    }

    // Get recipient emails
    let recipientEmails = [];
    
    if (recipients === "all") {
      const allSubscriptions = await Subscription.find({ isActive: true });
      recipientEmails = allSubscriptions.map(sub => sub.email);
    } else if (Array.isArray(recipients)) {
      const selectedSubscriptions = await Subscription.find({
        _id: { $in: recipients },
        isActive: true,
      });
      recipientEmails = selectedSubscriptions.map(sub => sub.email);
    }
    
    if (recipientEmails.length === 0) {
      return res.status(400).json({
        status: "fail",
        message: "No valid recipients found",
      });
    }

    const templateData = {
      title,
      content,
      discount,
      promoCode,
      expiryDate,
      featuredItems,
      callToAction
    };
    
    const result = await emailService.sendBulkEmail({
      recipients: recipientEmails,
      subject,
      template: 'promotional',
      data: templateData
    });
    
    res.status(200).json({
      status: "success",
      message: `Promotional email sent`,
      results: {
        totalRecipients: recipientEmails.length,
        successful: result.successful,
        failed: result.failed
      }
    });
  } catch (error) {
    console.error("Promotional email error:", error);
    res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
};

// Send announcement email
exports.sendAnnouncement = async (req, res) => {
  try {
    const { 
      subject, 
      title,
      content,
      type = 'general',
      priority = 'normal',
      images = [],
      callToAction,
      recipients = "all"
    } = req.body;
    
    if (!subject || !title || !content) {
      return res.status(400).json({
        status: "fail",
        message: "Subject, title, and content are required",
      });
    }

    // Get recipient emails
    let recipientEmails = [];
    
    if (recipients === "all") {
      const allSubscriptions = await Subscription.find({ isActive: true });
      recipientEmails = allSubscriptions.map(sub => sub.email);
    } else if (Array.isArray(recipients)) {
      const selectedSubscriptions = await Subscription.find({
        _id: { $in: recipients },
        isActive: true,
      });
      recipientEmails = selectedSubscriptions.map(sub => sub.email);
    }
    
    if (recipientEmails.length === 0) {
      return res.status(400).json({
        status: "fail",
        message: "No valid recipients found",
      });
    }

    const templateData = {
      title,
      content,
      type,
      priority,
      images,
      callToAction,
      announcementDate: new Date()
    };
    
    const result = await emailService.sendBulkEmail({
      recipients: recipientEmails,
      subject,
      template: 'announcement',
      data: templateData
    });
    
    res.status(200).json({
      status: "success",
      message: `Announcement sent`,
      results: {
        totalRecipients: recipientEmails.length,
        successful: result.successful,
        failed: result.failed
      }
    });
  } catch (error) {
    console.error("Announcement email error:", error);
    res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
};

// Test email template preview
exports.previewEmailTemplate = async (req, res) => {
  try {
    const { template, data = {} } = req.body;
    
    if (!template) {
      return res.status(400).json({
        status: "fail",
        message: "Template name is required",
      });
    }

    // Send a preview email to the admin
    const adminEmail = process.env.ADMIN_EMAIL;
    
    const result = await emailService.sendEmail({
      to: adminEmail,
      subject: `[PREVIEW] ${template.toUpperCase()} Template`,
      template,
      data: {
        ...data,
        isPreview: true
      }
    });
    
    res.status(200).json({
      status: "success",
      message: `Preview email sent to ${adminEmail}`,
      previewUrl: result.previewUrl
    });
  } catch (error) {
    console.error("Preview email error:", error);
    res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
};

// Import subscribers from users
exports.importFromUsers = async (req, res) => {
  try {
    // Get all users
    const users = await User.find({ email: { $exists: true, $ne: "" } });
    
    let importedCount = 0;
    
    // For each user, create a subscription if it doesn't exist
    for (const user of users) {
      const existingSubscription = await Subscription.findOne({ email: user.email });
      
      if (!existingSubscription) {
        await Subscription.create({
          email: user.email,
          name: user.name || "",
          userId: user._id,
          isActive: true,
        });
        importedCount++;
      }
    }
    
    res.status(200).json({
      status: "success",
      message: `Imported ${importedCount} subscribers from users`,
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
};