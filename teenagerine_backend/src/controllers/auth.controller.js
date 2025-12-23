const jwt = require("jsonwebtoken");
const User = require("../models/user.model");

const signToken = (user) => {
  return jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN }
  );
};

exports.signup = async (req, res) => {
  // console.log(req.body)
  try {
    const { name, email, password } = req.body;
    if(!name || !email || !password) {
      return res.status(400).json({ status: "fail", message: "Name, email, and password are required" });
    }
    const user = await User.create({ name, email, password });

    const token = signToken(user);
    res.status(201).json({ status: "success", token, user: { id: user._id, name, email,role:user.role} });
  } catch (err) {
    console.log(err)
    res.status(400).json({ status: "fail", message: err.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select("+password");
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ status: "fail", message: "Invalid email or password" });
    }

    const token = signToken(user);
    res.status(200).json({ status: "success", token, user: { id: user._id, name: user.name, email,role:user.role } });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
};

// Update password for authenticated users
exports.updatePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ 
        status: "fail", 
        message: "Current password and new password are required" 
      });
    }
    
    if (newPassword.length < 6) {
      return res.status(400).json({ 
        status: "fail", 
        message: "Password must be at least 6 characters long" 
      });
    }
    
    // Get user with password
    const user = await User.findById(req.user.id).select("+password");
    
    // Check if current password is correct
    if (!(await user.comparePassword(currentPassword))) {
      return res.status(401).json({ 
        status: "fail", 
        message: "Current password is incorrect" 
      });
    }
    
    // Update password
    user.password = newPassword;
    await user.save();
    
    // Generate new token
    const token = signToken(user);
    
    res.status(200).json({ 
      status: "success", 
      message: "Password updated successfully",
      token
    });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
};
