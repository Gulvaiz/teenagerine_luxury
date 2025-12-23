const PrestigiousBrands = require('../models/prestigiousBrands.model');
const { uploadStream } = require('../utils/cloudinary');
const multer = require('multer');

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
}).fields([
  { name: 'mainImage', maxCount: 1 },
  { name: 'leftImage', maxCount: 1 },
  { name: 'rightImage', maxCount: 1 },
  { name: 'featuredItemImage', maxCount: 1 }
]);

// Middleware to handle file uploads
exports.uploadImages = (req, res, next) => {
  upload(req, res, function (err) {
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
    const section = await PrestigiousBrands.findOne();
    if (!section) {
      return res.status(404).json({ message: 'Prestigious Brands section not found' });
    }
    res.status(200).json(section);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateSection = async (req, res) => {
  try {
    let updateData = { ...req.body };

    // Parse featuredItems if it's a string
    if (typeof updateData.featuredItems === 'string') {
      updateData.featuredItems = JSON.parse(updateData.featuredItems);
    }

    // Ensure quote is included if present
    if (req.body.quote) {
      updateData.quote = req.body.quote;
    }

    // Upload images to Cloudinary if files exist
    if (req.files) {
      if (req.files.mainImage) {
        const result = await uploadStream(req.files.mainImage[0].buffer);
        updateData.mainImage = result.secure_url;
      }

      if (req.files.leftImage) {
        const result = await uploadStream(req.files.leftImage[0].buffer);
        updateData.leftImage = result.secure_url;
      }

      if (req.files.rightImage) {
        const result = await uploadStream(req.files.rightImage[0].buffer);
        updateData.rightImage = result.secure_url;
      }
    }

    const section = await PrestigiousBrands.findOne();

    if (!section) {
      // Create new section if it doesn't exist
      const newSection = new PrestigiousBrands(updateData);
      const savedSection = await newSection.save();
      return res.status(201).json(savedSection);
    }

    // Update existing section
    const updatedSection = await PrestigiousBrands.findByIdAndUpdate(
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

exports.addFeaturedItem = async (req, res) => {
  try {
    const itemData = { ...req.body };

    // Upload image to Cloudinary if file exists
    if (req.files && req.files.featuredItemImage) {
      const result = await uploadStream(req.files.featuredItemImage[0].buffer);
      itemData.image = result.secure_url;
    } else if (!itemData.image) {
      return res.status(400).json({ error: 'Featured item image is required' });
    }

    const section = await PrestigiousBrands.findOne();
    if (!section) {
      return res.status(404).json({ message: 'Prestigious Brands section not found' });
    }

    // Get the highest order number and add 1
    const highestOrder = section.featuredItems.length > 0
      ? Math.max(...section.featuredItems.map(item => item.order))
      : 0;

    // Add the new item
    section.featuredItems.push({
      ...itemData,
      order: highestOrder + 1,
      isActive: true
    });

    await section.save();
    res.status(201).json(section);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.updateFeaturedItem = async (req, res) => {
  try {
    const { itemId } = req.params;
    const updateData = { ...req.body };

    // Upload image to Cloudinary if file exists
    if (req.files && req.files.featuredItemImage) {
      const result = await uploadStream(req.files.featuredItemImage[0].buffer);
      updateData.image = result.secure_url;
    }

    const section = await PrestigiousBrands.findOne();
    if (!section) {
      return res.status(404).json({ message: 'Prestigious Brands section not found' });
    }

    // Find the item to update
    const itemIndex = section.featuredItems.findIndex(item => item._id.toString() === itemId);
    if (itemIndex === -1) {
      return res.status(404).json({ message: 'Featured item not found' });
    }

    // Update the item
    section.featuredItems[itemIndex] = {
      ...section.featuredItems[itemIndex].toObject(),
      ...updateData
    };

    await section.save();
    res.status(200).json(section);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.deleteFeaturedItem = async (req, res) => {
  try {
    const { itemId } = req.params;

    const section = await PrestigiousBrands.findOne();
    if (!section) {
      return res.status(404).json({ message: 'Prestigious Brands section not found' });
    }

    // Remove the item
    section.featuredItems = section.featuredItems.filter(item => item._id.toString() !== itemId);

    // Update order numbers
    section.featuredItems.forEach((item, index) => {
      item.order = index + 1;
    });

    await section.save();
    res.status(200).json(section);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateFeaturedItemOrder = async (req, res) => {
  try {
    const items = req.body;

    if (!Array.isArray(items)) {
      return res.status(400).json({ error: 'Expected an array of items' });
    }

    const section = await PrestigiousBrands.findOne();
    if (!section) {
      return res.status(404).json({ message: 'Prestigious Brands section not found' });
    }

    // Create a map of item IDs to their new order
    const orderMap = new Map();
    items.forEach((item, index) => {
      orderMap.set(item._id, index + 1);
    });

    // Update the order of each item
    section.featuredItems.forEach(item => {
      if (orderMap.has(item._id.toString())) {
        item.order = orderMap.get(item._id.toString());
      }
    });

    // Sort items by order
    section.featuredItems.sort((a, b) => a.order - b.order);

    await section.save();
    res.status(200).json(section);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.toggleFeaturedItemActive = async (req, res) => {
  try {
    const { itemId } = req.params;
    const { isActive } = req.body;

    if (typeof isActive !== 'boolean') {
      return res.status(400).json({ error: 'isActive must be a boolean' });
    }

    const section = await PrestigiousBrands.findOne();
    if (!section) {
      return res.status(404).json({ message: 'Prestigious Brands section not found' });
    }

    // Find the item to update
    const itemIndex = section.featuredItems.findIndex(item => item._id.toString() === itemId);
    if (itemIndex === -1) {
      return res.status(404).json({ message: 'Featured item not found' });
    }

    // Update the item's isActive status
    section.featuredItems[itemIndex].isActive = isActive;

    await section.save();
    res.status(200).json(section);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Seed initial data
exports.seedSection = async (req, res) => {
  try {
    const count = await PrestigiousBrands.countDocuments();
    if (count > 0) {
      return res.status(400).json({ message: 'Prestigious Brands section already exists' });
    }

    const initialSection = {
      title: "Prestigious Brands' Goods Sale",
      description: "Enteger neque felis, egestas a euismod in, pulvinar et nisl. Aliquam ullam. Nulla tincidunt convallis bibendum. Duis sed risus suscipit justo maximus pulvinar.",
      quote: "MIX, MATCH & SHOP THE COMBO",
      mainImage: "/images/prestig-1.jpg",
      leftImage: "/images/prestig-2.jpg",
      rightImage: "/images/prestig-3.jpg",
      buttonText: "Shop Collection →",
      buttonLink: "/collections",
      featuredItems: [
        {
          name: "Women Casual Sweater",
          price: "$800.00",
          image: "/images/img-box01-1.jpg",
          order: 1,
          isActive: true
        },
        {
          name: "White Shorts",
          price: "$20.00",
          image: "/images/img-box02-1.jpg",
          order: 2,
          isActive: true
        },
        {
          name: "Sneakers",
          price: "$120.00",
          image: "/images/img-box03-1.jpg",
          order: 3,
          isActive: true
        }
      ]
    };

    const section = new PrestigiousBrands(initialSection);
    await section.save();
    res.status(201).json({ message: 'Prestigious Brands section seeded successfully', section });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

