const AboutSection = require('../models/aboutSection.model');
const { uploadStream } = require('../utils/cloudinary');
const multer = require('multer');

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
}).single('logo');

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
    const section = await AboutSection.findOne();
    if (!section) {
      return res.status(404).json({ message: 'About section not found' });
    }
    res.status(200).json(section);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateSection = async (req, res) => {
  try {
    let updateData = { ...req.body };
    
    // Parse features and testimonials if they are strings
    if (typeof updateData.features === 'string') {
      updateData.features = JSON.parse(updateData.features);
    }
    
    if (typeof updateData.testimonials === 'string') {
      updateData.testimonials = JSON.parse(updateData.testimonials);
    }
    
    // Upload logo to Cloudinary if file exists
    if (req.file) {
      try {
        const result = await uploadStream(req.file.buffer);
        updateData.logo = result.secure_url;
      } catch (uploadError) {
        console.error('Error uploading to Cloudinary:', uploadError);
        return res.status(500).json({ error: 'Image upload failed' });
      }
    }

    const section = await AboutSection.findOne();
    
    if (!section) {
      // Create new section if it doesn't exist
      const newSection = new AboutSection(updateData);
      const savedSection = await newSection.save();
      return res.status(201).json(savedSection);
    }
    
    // Update existing section
    const updatedSection = await AboutSection.findByIdAndUpdate(
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

// Feature management
exports.addFeature = async (req, res) => {
  try {
    const featureData = req.body;
    
    const section = await AboutSection.findOne();
    if (!section) {
      return res.status(404).json({ message: 'About section not found' });
    }
    
    // Get the highest order number and add 1
    const highestOrder = section.features.length > 0 
      ? Math.max(...section.features.map(f => f.order))
      : 0;
    
    // Add the new feature
    section.features.push({
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

exports.updateFeature = async (req, res) => {
  try {
    const { featureId } = req.params;
    const updateData = req.body;
    
    const section = await AboutSection.findOne();
    if (!section) {
      return res.status(404).json({ message: 'About section not found' });
    }
    
    // Find the feature to update
    const featureIndex = section.features.findIndex(f => f._id.toString() === featureId);
    if (featureIndex === -1) {
      return res.status(404).json({ message: 'Feature not found' });
    }
    
    // Update the feature
    section.features[featureIndex] = { 
      ...section.features[featureIndex].toObject(), 
      ...updateData 
    };
    
    await section.save();
    res.status(200).json(section);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.deleteFeature = async (req, res) => {
  try {
    const { featureId } = req.params;
    
    const section = await AboutSection.findOne();
    if (!section) {
      return res.status(404).json({ message: 'About section not found' });
    }
    
    // Remove the feature
    section.features = section.features.filter(f => f._id.toString() !== featureId);
    
    // Update order numbers
    section.features.forEach((feature, index) => {
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
    const features = req.body;
    
    if (!Array.isArray(features)) {
      return res.status(400).json({ error: 'Expected an array of features' });
    }
    
    const section = await AboutSection.findOne();
    if (!section) {
      return res.status(404).json({ message: 'About section not found' });
    }
    
    // Create a map of feature IDs to their new order
    const orderMap = new Map();
    features.forEach((feature, index) => {
      orderMap.set(feature._id, index + 1);
    });
    
    // Update the order of each feature
    section.features.forEach(feature => {
      if (orderMap.has(feature._id.toString())) {
        feature.order = orderMap.get(feature._id.toString());
      }
    });
    
    // Sort features by order
    section.features.sort((a, b) => a.order - b.order);
    
    await section.save();
    res.status(200).json(section);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.toggleFeatureActive = async (req, res) => {
  try {
    const { featureId } = req.params;
    const { isActive } = req.body;
    
    if (typeof isActive !== 'boolean') {
      return res.status(400).json({ error: 'isActive must be a boolean' });
    }
    
    const section = await AboutSection.findOne();
    if (!section) {
      return res.status(404).json({ message: 'About section not found' });
    }
    
    // Find the feature to update
    const featureIndex = section.features.findIndex(f => f._id.toString() === featureId);
    if (featureIndex === -1) {
      return res.status(404).json({ message: 'Feature not found' });
    }
    
    // Update the feature's isActive status
    section.features[featureIndex].isActive = isActive;
    
    await section.save();
    res.status(200).json(section);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Testimonial management
exports.addTestimonial = async (req, res) => {
  try {
    const testimonialData = req.body;
    
    const section = await AboutSection.findOne();
    if (!section) {
      return res.status(404).json({ message: 'About section not found' });
    }
    
    // Get the highest order number and add 1
    const highestOrder = section.testimonials.length > 0 
      ? Math.max(...section.testimonials.map(t => t.order))
      : 0;
    
    // Add the new testimonial
    section.testimonials.push({
      ...testimonialData,
      order: highestOrder + 1,
      isActive: true
    });
    
    await section.save();
    res.status(201).json(section);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.updateTestimonial = async (req, res) => {
  try {
    const { testimonialId } = req.params;
    const updateData = req.body;
    
    const section = await AboutSection.findOne();
    if (!section) {
      return res.status(404).json({ message: 'About section not found' });
    }
    
    // Find the testimonial to update
    const testimonialIndex = section.testimonials.findIndex(t => t._id.toString() === testimonialId);
    if (testimonialIndex === -1) {
      return res.status(404).json({ message: 'Testimonial not found' });
    }
    
    // Update the testimonial
    section.testimonials[testimonialIndex] = { 
      ...section.testimonials[testimonialIndex].toObject(), 
      ...updateData 
    };
    
    await section.save();
    res.status(200).json(section);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.deleteTestimonial = async (req, res) => {
  try {
    const { testimonialId } = req.params;
    
    const section = await AboutSection.findOne();
    if (!section) {
      return res.status(404).json({ message: 'About section not found' });
    }
    
    // Remove the testimonial
    section.testimonials = section.testimonials.filter(t => t._id.toString() !== testimonialId);
    
    // Update order numbers
    section.testimonials.forEach((testimonial, index) => {
      testimonial.order = index + 1;
    });
    
    await section.save();
    res.status(200).json(section);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateTestimonialOrder = async (req, res) => {
  try {
    const testimonials = req.body;
    
    if (!Array.isArray(testimonials)) {
      return res.status(400).json({ error: 'Expected an array of testimonials' });
    }
    
    const section = await AboutSection.findOne();
    if (!section) {
      return res.status(404).json({ message: 'About section not found' });
    }
    
    // Create a map of testimonial IDs to their new order
    const orderMap = new Map();
    testimonials.forEach((testimonial, index) => {
      orderMap.set(testimonial._id, index + 1);
    });
    
    // Update the order of each testimonial
    section.testimonials.forEach(testimonial => {
      if (orderMap.has(testimonial._id.toString())) {
        testimonial.order = orderMap.get(testimonial._id.toString());
      }
    });
    
    // Sort testimonials by order
    section.testimonials.sort((a, b) => a.order - b.order);
    
    await section.save();
    res.status(200).json(section);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.toggleTestimonialActive = async (req, res) => {
  try {
    const { testimonialId } = req.params;
    const { isActive } = req.body;
    
    if (typeof isActive !== 'boolean') {
      return res.status(400).json({ error: 'isActive must be a boolean' });
    }
    
    const section = await AboutSection.findOne();
    if (!section) {
      return res.status(404).json({ message: 'About section not found' });
    }
    
    // Find the testimonial to update
    const testimonialIndex = section.testimonials.findIndex(t => t._id.toString() === testimonialId);
    if (testimonialIndex === -1) {
      return res.status(404).json({ message: 'Testimonial not found' });
    }
    
    // Update the testimonial's isActive status
    section.testimonials[testimonialIndex].isActive = isActive;
    
    await section.save();
    res.status(200).json(section);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Seed initial data
exports.seedSection = async (req, res) => {
  try {
    const count = await AboutSection.countDocuments();
    if (count > 0) {
      return res.status(400).json({ message: 'About section already exists' });
    }

    const initialSection = {
      logo: "/Tangerine-Logo-200px.png",
      paragraph1: 'An online marketplace like "Tangerine Luxury" allows users to buy and sell pre-loved women\'s, men\'s, and children\'s clothing and accessories.',
      paragraph2: 'Every single item in our collection was carefully chosen..! You won\'t need to worry about anything when you shop with us because each and every product meets the highest standards for both quality and style.',
      testimonialTitle: "What Our Community Says",
      testimonialSubtitle: "Discover the Tangerine Luxury experience through our community's stories",
      features: [
        {
          icon: '<path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 14h10M9 18h6" />',
          label: "HASSLE FREE RETURNS",
          order: 1,
          isActive: true
        },
        {
          icon: '<path strokeLinecap="round" strokeLinejoin="round" d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-10l-4 4V10a2 2 0 012-2h2" />',
          label: "AFFORDABLE LUXURY",
          order: 2,
          isActive: true
        },
        {
          icon: '<circle cx="12" cy="12" r="10" /><path strokeLinecap="round" strokeLinejoin="round" d="M10 10l4 4M14 10l-4 4" />',
          label: "100% GUARANTEED AUTHENTIC",
          order: 3,
          isActive: true
        },
        {
          icon: '<circle cx="12" cy="12" r="10" /><path strokeLinecap="round" strokeLinejoin="round" d="M2 12h20M12 2a15 15 0 010 20" />',
          label: "WORLDWIDE SHIPPING",
          order: 4,
          isActive: true
        }
      ],
      testimonials: [
        {
          content: 'Our concept ❤️🌿\n"At Tangerine Luxury, we\'ve reimagined luxury as something accessible to all through an eco-friendly online platform for buying and selling pre-loved luxurious items, because we believe it\'s your moment to embrace the luxury you adore."',
          author: "Company Vision",
          order: 1,
          isActive: true
        },
        {
          content: 'What is \'pre-loved\' luxury? 👜♻️\n"Previously owned, but still cherished. Rediscover luxury fashion sustainably."',
          author: "Our Definition",
          order: 2,
          isActive: true
        },
        {
          content: 'Our concept ❤️♻️\n"Prioritizing sustainability in fashion is paramount. We\'re all about mindful, earth-friendly, and affordable luxury through pre-loved designer accessories with trusted authenticity."',
          author: "Sustainability Mission",
          order: 3,
          isActive: true
        }
      ]
    };

    const section = new AboutSection(initialSection);
    await section.save();
    res.status(201).json({ message: 'About section seeded successfully', section });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};