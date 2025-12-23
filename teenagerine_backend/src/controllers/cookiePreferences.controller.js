const CookiePreferences = require("../models/cookiePreferences.model");
const jwt = require("jsonwebtoken");

// Helper function to get user ID from token (if available)
const getUserFromToken = (req) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      return decoded.id;
    }
    return null;
  } catch (error) {
    return null;
  }
};

// Helper function to generate session ID for guests
const generateSessionId = () => {
  return `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Get current cookie preferences
exports.getCookiePreferences = async (req, res) => {
  try {
    const userId = getUserFromToken(req);
    const { sessionId } = req.query;

    if (!userId && !sessionId) {
      return res.status(400).json({
        status: "fail",
        message: "User authentication or session ID required"
      });
    }

    const identifier = userId ? { userId } : { sessionId };
    const preferences = await CookiePreferences.findOrCreate(identifier);

    res.status(200).json({
      status: "success",
      data: {
        preferences: preferences.preferences,
        consentGiven: preferences.consentGiven,
        lastUpdated: preferences.lastUpdated,
        sessionId: !userId ? (sessionId || generateSessionId()) : undefined
      }
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: error.message
    });
  }
};

// Update cookie preferences
exports.updateCookiePreferences = async (req, res) => {
  try {
    const userId = getUserFromToken(req);
    const { preferences, sessionId } = req.body;

    if (!userId && !sessionId) {
      return res.status(400).json({
        status: "fail",
        message: "User authentication or session ID required"
      });
    }

    // Validate preferences structure
    const validPreferences = ['necessary', 'analytics', 'marketing', 'personalization', 'functionality'];
    const invalidKeys = Object.keys(preferences || {}).filter(key => !validPreferences.includes(key));
    
    if (invalidKeys.length > 0) {
      return res.status(400).json({
        status: "fail",
        message: `Invalid preference keys: ${invalidKeys.join(', ')}`
      });
    }

    const identifier = userId ? { userId } : { sessionId };
    let cookiePrefs = await CookiePreferences.findOrCreate(identifier);

    // Always ensure necessary cookies are true
    const updatedPreferences = {
      ...preferences,
      necessary: true
    };

    // Update preferences
    await cookiePrefs.updatePreferences(updatedPreferences);

    // Store IP and User Agent for compliance
    cookiePrefs.ipAddress = req.ip || req.connection.remoteAddress;
    cookiePrefs.userAgent = req.headers['user-agent'];
    await cookiePrefs.save();

    res.status(200).json({
      status: "success",
      data: {
        preferences: cookiePrefs.preferences,
        consentGiven: cookiePrefs.consentGiven,
        lastUpdated: cookiePrefs.lastUpdated,
        message: "Cookie preferences updated successfully"
      }
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: error.message
    });
  }
};

// Accept all cookies (convenience endpoint)
exports.acceptAllCookies = async (req, res) => {
  try {
    const userId = getUserFromToken(req);
    const { sessionId } = req.body;

    if (!userId && !sessionId) {
      return res.status(400).json({
        status: "fail",
        message: "User authentication or session ID required"
      });
    }

    const allAcceptedPreferences = {
      necessary: true,
      analytics: true,
      marketing: true,
      personalization: true,
      functionality: true
    };

    req.body.preferences = allAcceptedPreferences;

    // Reuse the update function
    return exports.updateCookiePreferences(req, res);
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: error.message
    });
  }
};

// Reject all non-necessary cookies
exports.rejectAllCookies = async (req, res) => {
  try {
    const userId = getUserFromToken(req);
    const { sessionId } = req.body;

    if (!userId && !sessionId) {
      return res.status(400).json({
        status: "fail",
        message: "User authentication or session ID required"
      });
    }

    const necessaryOnlyPreferences = {
      necessary: true,
      analytics: false,
      marketing: false,
      personalization: false,
      functionality: false
    };

    req.body.preferences = necessaryOnlyPreferences;

    // Reuse the update function
    return exports.updateCookiePreferences(req, res);
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: error.message
    });
  }
};

// Get cookie preferences for authenticated user (migrate from session if needed)
exports.migrateCookiePreferences = async (req, res) => {
  try {
    const userId = getUserFromToken(req);
    const { sessionId } = req.body;

    if (!userId) {
      return res.status(401).json({
        status: "fail",
        message: "Authentication required"
      });
    }

    // Check if user already has preferences
    let userPrefs = await CookiePreferences.findOne({ user: userId });
    
    if (!userPrefs && sessionId) {
      // Try to find guest preferences and migrate them
      const guestPrefs = await CookiePreferences.findOne({ sessionId });
      
      if (guestPrefs) {
        // Create new preferences for the user based on guest preferences
        userPrefs = new CookiePreferences({
          user: userId,
          preferences: guestPrefs.preferences,
          consentGiven: guestPrefs.consentGiven,
          lastUpdated: new Date(),
          ipAddress: req.ip || req.connection.remoteAddress,
          userAgent: req.headers['user-agent']
        });
        await userPrefs.save();
        
        // Delete guest preferences
        await CookiePreferences.deleteOne({ sessionId });
      }
    }

    // If still no preferences, create default ones
    if (!userPrefs) {
      userPrefs = await CookiePreferences.findOrCreate({ userId });
    }

    res.status(200).json({
      status: "success",
      data: {
        preferences: userPrefs.preferences,
        consentGiven: userPrefs.consentGiven,
        lastUpdated: userPrefs.lastUpdated,
        migrated: sessionId ? true : false
      }
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: error.message
    });
  }
};