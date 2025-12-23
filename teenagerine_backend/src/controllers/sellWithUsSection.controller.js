const SellWithUsSection = require('../models/sellWithUsSection.model');
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

exports.getSection = async (req, res) => {
  try {
    const section = await SellWithUsSection.findOne();
    if (!section) {
      return res.status(404).json({ message: 'Sell With Us section not found' });
    }
    res.status(200).json(section);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateSection = async (req, res) => {
  try {
    let updateData = { ...req.body };
    
    // Parse features and extraFeatures if they are strings
    if (typeof updateData.features === 'string') {
      updateData.features = JSON.parse(updateData.features);
    }
    
    if (typeof updateData.extraFeatures === 'string') {
      updateData.extraFeatures = JSON.parse(updateData.extraFeatures);
    }
    
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

    const section = await SellWithUsSection.findOne();
    
    if (!section) {
      // Create new section if it doesn't exist
      const newSection = new SellWithUsSection(updateData);
      const savedSection = await newSection.save();
      return res.status(201).json(savedSection);
    }
    
    // Update existing section
    const updatedSection = await SellWithUsSection.findByIdAndUpdate(
      section._id,
      updateData,
      { new: true }
    );
    
    res.status(200).json(updatedSection);
  } catch (error) {
    console.error('Error updating section:', error);
    res.status(400).json({ error: error.message });
  }
};

exports.updateFeature = async (req, res) => {
  try {
    const { featureId } = req.params;
    const { type } = req.query; // 'features' or 'extraFeatures'
    const updateData = req.body;
    
    if (!type || (type !== 'features' && type !== 'extraFeatures')) {
      return res.status(400).json({ error: 'Invalid feature type' });
    }
    
    const section = await SellWithUsSection.findOne();
    if (!section) {
      return res.status(404).json({ message: 'Sell With Us section not found' });
    }
    
    // Find the feature to update
    const featureIndex = section[type].findIndex(f => f._id.toString() === featureId);
    if (featureIndex === -1) {
      return res.status(404).json({ message: 'Feature not found' });
    }
    
    // Update the feature
    section[type][featureIndex] = { ...section[type][featureIndex].toObject(), ...updateData };
    
    await section.save();
    res.status(200).json(section);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.addFeature = async (req, res) => {
  try {
    const { type } = req.query; // 'features' or 'extraFeatures'
    const featureData = req.body;
    
    if (!type || (type !== 'features' && type !== 'extraFeatures')) {
      return res.status(400).json({ error: 'Invalid feature type' });
    }
    
    const section = await SellWithUsSection.findOne();
    if (!section) {
      return res.status(404).json({ message: 'Sell With Us section not found' });
    }
    
    // Get the highest order number and add 1
    const highestOrder = section[type].length > 0 
      ? Math.max(...section[type].map(f => f.order))
      : 0;
    
    // Add the new feature
    section[type].push({
      ...featureData,
      order: highestOrder + 1,
      isActive: true
    });
    
    await section.save();
    res.status(201).json(section);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.deleteFeature = async (req, res) => {
  try {
    const { featureId } = req.params;
    const { type } = req.query; // 'features' or 'extraFeatures'
    
    if (!type || (type !== 'features' && type !== 'extraFeatures')) {
      return res.status(400).json({ error: 'Invalid feature type' });
    }
    
    const section = await SellWithUsSection.findOne();
    if (!section) {
      return res.status(404).json({ message: 'Sell With Us section not found' });
    }
    
    // Remove the feature
    section[type] = section[type].filter(f => f._id.toString() !== featureId);
    
    // Update order numbers
    section[type].forEach((feature, index) => {
      feature.order = index + 1;
    });
    
    await section.save();
    res.status(200).json(section);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateFeatureOrder = async (req, res) => {
  try {
    const { type } = req.query; // 'features' or 'extraFeatures'
    const features = req.body;
    
    if (!type || (type !== 'features' && type !== 'extraFeatures')) {
      return res.status(400).json({ error: 'Invalid feature type' });
    }
    
    if (!Array.isArray(features)) {
      return res.status(400).json({ error: 'Expected an array of features' });
    }
    
    const section = await SellWithUsSection.findOne();
    if (!section) {
      return res.status(404).json({ message: 'Sell With Us section not found' });
    }
    
    // Create a map of feature IDs to their new order
    const orderMap = new Map();
    features.forEach((feature, index) => {
      orderMap.set(feature._id, index + 1);
    });
    
    // Update the order of each feature
    section[type].forEach(feature => {
      if (orderMap.has(feature._id.toString())) {
        feature.order = orderMap.get(feature._id.toString());
      }
    });
    
    // Sort features by order
    section[type].sort((a, b) => a.order - b.order);
    
    await section.save();
    res.status(200).json(section);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.toggleFeatureActive = async (req, res) => {
  try {
    const { featureId } = req.params;
    const { type } = req.query; // 'features' or 'extraFeatures'
    const { isActive } = req.body;
    
    if (!type || (type !== 'features' && type !== 'extraFeatures')) {
      return res.status(400).json({ error: 'Invalid feature type' });
    }
    
    if (typeof isActive !== 'boolean') {
      return res.status(400).json({ error: 'isActive must be a boolean' });
    }
    
    const section = await SellWithUsSection.findOne();
    if (!section) {
      return res.status(404).json({ message: 'Sell With Us section not found' });
    }
    
    // Find the feature to update
    const featureIndex = section[type].findIndex(f => f._id.toString() === featureId);
    if (featureIndex === -1) {
      return res.status(404).json({ message: 'Feature not found' });
    }
    
    // Update the feature's isActive status
    section[type][featureIndex].isActive = isActive;
    
    await section.save();
    res.status(200).json(section);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Seed initial data
exports.seedSection = async (req, res) => {
  try {
    const count = await SellWithUsSection.countDocuments();
    if (count > 0) {
      return res.status(400).json({ message: 'Sell With Us section already exists' });
    }

    const initialSection = {
      title: "SELL WITH US",
      subtitle: "From Closet to Cash – Profit from Your Style",
      description: "Join our exclusive marketplace and sell your premium fashion items to fashion–forward buyers worldwide. We make selling simple, secure, and profitable.",
      image: "/images/SELL WITH US.jpeg",
      imageCaption: "Luxury Worth Sharing",
      imageSubCaption: "Transform your closet into cash with our premium marketplace",
      ctaTitle: "Ready to Start Selling?",
      ctaDescription: "Join thousands of successful sellers on our platform and turn your luxury items into profit. We're here to help you every step of the way.",
      ctaButtonText: "Create Seller Account",
      ctaButtonLink: "/sell-with-us",
      features: [
        {
          icon: "faImage",
          title: "SHARE IMAGE",
          desc: "OF YOUR PRODUCTS",
          order: 1,
          isActive: true
        },
        {
          icon: "faTruck",
          title: "FREE PAN-INDIA PICK-UP",
          desc: "NATIONWIDE SERVICE",
          order: 2,
          isActive: true
        },
        {
          icon: "faCheckCircle",
          title: "AUTHENTICATION",
          desc: "& LISTING",
          order: 3,
          isActive: true
        },
        {
          icon: "faFileContract",
          title: "DIGITAL CONTRACT",
          desc: "ASSURANCE CERTIFICATE",
          order: 4,
          isActive: true
        },
        {
          icon: "faMoneyBillWave",
          title: "PAYMENT IN 24 HOURS",
          desc: "NO PAYMENT DELAYS",
          order: 5,
          isActive: true
        },
        {
          icon: "faPhoneAlt",
          title: "CONTACT US",
          desc: "704 203 9099",
          order: 6,
          isActive: true
        }
      ],
      extraFeatures: [
        {
          icon: "faCoins",
          title: "Competitive Commission",
          desc: "Enjoy industry-leading commission rates and maximize your profits with our seller-friendly pricing structure.",
          order: 1,
          isActive: true
        },
        {
          icon: "faShieldAlt",
          title: "Secure Platform",
          desc: "Our platform ensures secure transactions and protects both buyers and sellers with advanced security measures.",
          order: 2,
          isActive: true
        },
        {
          icon: "faUsers",
          title: "Dedicated Support",
          desc: "Get personalized support from our expert team to help you list and sell your items effectively.",
          order: 3,
          isActive: true
        }
      ]
    };

    const section = new SellWithUsSection(initialSection);
    await section.save();
    res.status(201).json({ message: 'Sell With Us section seeded successfully', section });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};