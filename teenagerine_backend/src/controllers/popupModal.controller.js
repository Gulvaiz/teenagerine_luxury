const PopupModal = require('../models/popupModal.model');
const { uploadStream } = require('../utils/cloudinary');
const multer = require('multer');

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
}).fields([
  { name: 'backgroundImage', maxCount: 1 },
  { name: 'closeButtonImage', maxCount: 1 }
]);

// Middleware to handle file uploads
exports.uploadImages = (req, res, next) => {
  upload(req, res, function(err) {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ error: `Multer error: ${err.message}` });
    } else if (err) {
      return res.status(500).json({ error: `Unknown error: ${err.message}` });
    }
    next();
  });
};

exports.getPopupModal = async (req, res) => {
  try {
    const popupModal = await PopupModal.findOne();
    if (!popupModal) {
      return res.status(404).json({ message: 'Popup modal not found' });
    }
    res.status(200).json(popupModal);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updatePopupModal = async (req, res) => {
  try {
    let updateData = { ...req.body };
    
    // Parse arrays if they are strings
    if (typeof updateData.showOnPages === 'string') {
      updateData.showOnPages = JSON.parse(updateData.showOnPages);
    }
    
    // Convert string boolean values to actual booleans
    if (updateData.enabled === 'true') updateData.enabled = true;
    if (updateData.enabled === 'false') updateData.enabled = false;
    if (updateData.followMouse === 'true') updateData.followMouse = true;
    if (updateData.followMouse === 'false') updateData.followMouse = false;
    if (updateData.dontShowAgainOption === 'true') updateData.dontShowAgainOption = true;
    if (updateData.dontShowAgainOption === 'false') updateData.dontShowAgainOption = false;
    
    // Convert delay to number if it's a string
    if (typeof updateData.delay === 'string') {
      updateData.delay = parseInt(updateData.delay, 10);
    }
    
    // Upload images to Cloudinary if files exist
    if (req.files) {
      if (req.files.backgroundImage) {
        try {
          const result = await uploadStream(req.files.backgroundImage[0].buffer);
          updateData.backgroundImage = result.secure_url;
        } catch (uploadError) {
          console.error('Error uploading background image to Cloudinary:', uploadError);
          return res.status(500).json({ error: 'Background image upload failed' });
        }
      }
      
      if (req.files.closeButtonImage) {
        try {
          const result = await uploadStream(req.files.closeButtonImage[0].buffer);
          updateData.closeButtonImage = result.secure_url;
        } catch (uploadError) {
          console.error('Error uploading close button image to Cloudinary:', uploadError);
          return res.status(500).json({ error: 'Close button image upload failed' });
        }
      }
    }

    const popupModal = await PopupModal.findOne();
    
    if (!popupModal) {
      // Create new popup modal if it doesn't exist
      const newPopupModal = new PopupModal(updateData);
      const savedPopupModal = await newPopupModal.save();
      return res.status(201).json(savedPopupModal);
    }
    
    // Update existing popup modal
    const updatedPopupModal = await PopupModal.findByIdAndUpdate(
      popupModal._id,
      updateData,
      { new: true }
    );
    
    res.status(200).json(updatedPopupModal);
  } catch (error) {
    console.error('Error updating popup modal:', error);
    res.status(400).json({ error: error.message });
  }
};

exports.togglePopupModal = async (req, res) => {
  try {
    const { enabled } = req.body;
    
    if (typeof enabled !== 'boolean') {
      return res.status(400).json({ error: 'enabled must be a boolean' });
    }
    
    const popupModal = await PopupModal.findOne();
    if (!popupModal) {
      return res.status(404).json({ message: 'Popup modal not found' });
    }
    
    popupModal.enabled = enabled;
    await popupModal.save();
    
    res.status(200).json(popupModal);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Seed initial data
exports.seedPopupModal = async (req, res) => {
  try {
    const count = await PopupModal.countDocuments();
    if (count > 0) {
      return res.status(400).json({ message: 'Popup modal already exists' });
    }

    const initialPopupModal = {
      title: "Tangerine Luxury..",
      subtitle: "Always First.",
      description: "Join our newsletter for exclusive offers and updates on latest trends.",
      backgroundImage: "/images/Newsletter-Bg-2.jpg",
      watermarkText: "Subscribe Now",
      buttonText: "Subscribe",
      closeButtonImage: "images/pop-close.png",
      enabled: true,
      delay: 500,
      followMouse: true,
      dontShowAgainOption: true,
      showOnPages: ['home']
    };

    const popupModal = new PopupModal(initialPopupModal);
    await popupModal.save();
    res.status(201).json({ message: 'Popup modal seeded successfully', popupModal });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};