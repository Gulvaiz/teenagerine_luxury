const Slider = require('../models/slider.model');
const { uploadStream } = require('../utils/cloudinary');
const multer = require('multer');

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
}).single('image');

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

exports.getAllSliders = async (req, res) => {
  try {
    const sliders = await Slider.find().sort({ order: 1 });
    res.status(200).json(sliders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getSliderById = async (req, res) => {
  try {
    const slider = await Slider.findById(req.params.id);
    if (!slider) {
      return res.status(404).json({ message: 'Slider not found' });
    }
    res.status(200).json(slider);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.createSlider = async (req, res) => {
  try {
    let imageUrl = '';
    
    // Upload image to Cloudinary if file exists
    if (req.file) {
      try {
        const result = await uploadStream(req.file.buffer);
        imageUrl = result.secure_url;
      } catch (uploadError) {
        console.error('Error uploading to Cloudinary:', uploadError);
        return res.status(500).json({ error: 'Image upload failed' });
      }
    } else if (req.body.image) {
      imageUrl = req.body.image;
    } else {
      return res.status(400).json({ error: 'Image is required' });
    }

    // Get the highest order number and add 1
    const highestOrder = await Slider.findOne().sort({ order: -1 });
    const order = highestOrder ? highestOrder.order + 1 : 1;

    const sliderData = {
      ...req.body,
      image: imageUrl,
      order
    };

    const slider = new Slider(sliderData);
    const savedSlider = await slider.save();
    
    res.status(201).json(savedSlider);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.updateSlider = async (req, res) => {
  try {
    const sliderId = req.params.id;
    let updateData = { ...req.body };
    
    // Upload image to Cloudinary if file exists
    if (req.file) {
      try {
        const result = await uploadStream(req.file.buffer);
        updateData.image = result.secure_url;
      } catch (uploadError) {
        console.error('Error uploading to Cloudinary:', uploadError);
        return res.status(500).json({ error: 'Image upload failed' });
      }
    }

    const slider = await Slider.findByIdAndUpdate(sliderId, updateData, { new: true });
    
    if (!slider) {
      return res.status(404).json({ message: 'Slider not found' });
    }
    
    res.status(200).json(slider);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.deleteSlider = async (req, res) => {
  try {
    const slider = await Slider.findByIdAndDelete(req.params.id);
    
    if (!slider) {
      return res.status(404).json({ message: 'Slider not found' });
    }
    
    res.status(200).json({ message: 'Slider deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateSliderOrder = async (req, res) => {
  try {
    const sliders = req.body;
    
    if (!Array.isArray(sliders)) {
      return res.status(400).json({ error: 'Expected an array of sliders' });
    }
    
    const updatePromises = sliders.map(slider => 
      Slider.findByIdAndUpdate(slider._id, { order: slider.order }, { new: true })
    );
    
    const updatedSliders = await Promise.all(updatePromises);
    res.status(200).json(updatedSliders);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.toggleSliderActive = async (req, res) => {
  try {
    const { isActive } = req.body;
    
    if (typeof isActive !== 'boolean') {
      return res.status(400).json({ error: 'isActive must be a boolean' });
    }
    
    const slider = await Slider.findByIdAndUpdate(
      req.params.id, 
      { isActive }, 
      { new: true }
    );
    
    if (!slider) {
      return res.status(404).json({ message: 'Slider not found' });
    }
    
    res.status(200).json(slider);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};