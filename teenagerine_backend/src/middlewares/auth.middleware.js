const jwt = require("jsonwebtoken");
const User = require("../models/user.model");

// Cache frequently used tokens to reduce database lookups
const tokenCache = new Map();

exports.protect = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    // console.log(authHeader)
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ 
        success: false,
        message: "Please login to access this resource" 
      });
    }

    // Extract and verify token
    const token = authHeader.split(" ")[1];
    // console.log("Token received:", token);
    // Check token cache first
    if (tokenCache.has(token)) {
      req.user = tokenCache.get(token);
      return next();
    }

    // Verify token and decode
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      console.error("Token verification failed:", err);
      return res.status(401).json({
        success: false,
        message: "Token is invalid or has expired"
      });
    }
    // console.log("Decoded token:", decoded);
    // Check if user still exists
    const user = await User.findById(decoded.id);
    // console.error("User found:", user);
    if (!user) {
      return res.status(401).json({
        success: false, 
        message: "User no longer exists or is inactive"
      });
    }

    // Check if user changed password after token was issued
    if (user.changedPasswordAfter && user.changedPasswordAfter(decoded.iat)) {
      console.error("Password changed after token issued");
      return res.status(401).json({
        success: false,
        message: "Password was changed, please login again"
      });
    }

    // Cache the user object
    tokenCache.set(token, user);

    // Grant access
    req.user = user;
    next();

  } catch (err) {
    console.log("Auth middleware error:", err)
    return res.status(500).json({
      success: false,
      message: "Internal server error during authentication"
    });
  }
};

exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    // Check if user role exists and is allowed
    if (!req.user?.role || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to perform this action"
      });
    }
    next();
  };
};
