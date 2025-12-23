const SignupPopup = require('../models/signupPopup.model');
const { uploadStream } = require('../utils/cloudinary');
const multer = require('multer');

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
}).single('backgroundImage');

// Middleware to handle file uploads
exports.uploadImage = (req, res, next) => {
  upload(req, res, function(err) {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ error: `Multer error: ${err.message}` });
    } else if (err) {
      return res.status(500).json({ error: `Unknown error: ${err.message}` });
    }
    next();
  });
};

exports.getSignupPopup = async (req, res) => {
  try {
    let signupPopup = await SignupPopup.findOne();
    
    // If no signup popup exists, create one with default values
    if (!signupPopup) {
      signupPopup = new SignupPopup({});
      await signupPopup.save();
    }
    
    res.status(200).json(signupPopup);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateSignupPopup = async (req, res) => {
  try {
    let updateData = { ...req.body };
    
    // Convert string boolean values to actual booleans
    if (updateData.enabled === 'true') updateData.enabled = true;
    if (updateData.enabled === 'false') updateData.enabled = false;
    
    // Convert numeric strings to numbers
    if (typeof updateData.discountAmount === 'string') {
      updateData.discountAmount = parseInt(updateData.discountAmount, 10);
    }
    if (typeof updateData.minimumOrderAmount === 'string') {
      updateData.minimumOrderAmount = parseInt(updateData.minimumOrderAmount, 10);
    }
    if (typeof updateData.showDelayMs === 'string') {
      updateData.showDelayMs = parseInt(updateData.showDelayMs, 10);
    }
    
    // Upload background image to Cloudinary if file exists
    if (req.file) {
      try {
        const result = await uploadStream(req.file.buffer);
        updateData.backgroundImage = result.secure_url;
      } catch (uploadError) {
        console.error('Error uploading background image to Cloudinary:', uploadError);
        return res.status(500).json({ error: 'Background image upload failed' });
      }
    }

    let signupPopup = await SignupPopup.findOne();
    
    if (!signupPopup) {
      // Create new signup popup if it doesn't exist
      signupPopup = new SignupPopup(updateData);
      await signupPopup.save();
      return res.status(201).json(signupPopup);
    }
    
    // Update existing signup popup
    const updatedSignupPopup = await SignupPopup.findByIdAndUpdate(
      signupPopup._id,
      updateData,
      { new: true }
    );
    
    res.status(200).json(updatedSignupPopup);
  } catch (error) {
    console.error('Error updating signup popup:', error);
    res.status(400).json({ error: error.message });
  }
};

exports.toggleSignupPopup = async (req, res) => {
  try {
    const { enabled } = req.body;
    
    if (typeof enabled !== 'boolean') {
      return res.status(400).json({ error: 'enabled must be a boolean' });
    }
    
    let signupPopup = await SignupPopup.findOne();
    
    if (!signupPopup) {
      // Create new signup popup if it doesn't exist
      signupPopup = new SignupPopup({ enabled });
      await signupPopup.save();
    } else {
      signupPopup.enabled = enabled;
      await signupPopup.save();
    }
    
    res.status(200).json(signupPopup);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Seed initial data
exports.seedSignupPopup = async (req, res) => {
  try {
    const count = await SignupPopup.countDocuments();
    if (count > 0) {
      return res.status(400).json({ message: 'Signup popup already exists' });
    }

    const signupPopup = new SignupPopup({});
    await signupPopup.save();
    res.status(201).json({ message: 'Signup popup seeded successfully', signupPopup });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};