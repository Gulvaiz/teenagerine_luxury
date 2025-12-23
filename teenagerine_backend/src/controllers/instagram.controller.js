const InstagramPost = require('../models/instagram.model');
const { uploadStream } = require('../utils/cloudinary');
const multer = require('multer');

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
}).single('thumbnail');

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

exports.getAllInstagramPosts = async (req, res) => {
  try {
    const posts = await InstagramPost.find().sort({ order: 1 });
    res.status(200).json(posts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getInstagramPostById = async (req, res) => {
  try {
    const post = await InstagramPost.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ message: 'Instagram post not found' });
    }
    res.status(200).json(post);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.createInstagramPost = async (req, res) => {
  try {
    let thumbnailUrl = '';
    
    // Upload image to Cloudinary if file exists
    if (req.file) {
      try {
        const result = await uploadStream(req.file.buffer);
        thumbnailUrl = result.secure_url;
      } catch (uploadError) {
        console.error('Error uploading to Cloudinary:', uploadError);
        return res.status(500).json({ error: 'Image upload failed' });
      }
    } else if (req.body.thumbnail) {
      thumbnailUrl = req.body.thumbnail;
    } else {
      return res.status(400).json({ error: 'Thumbnail image is required' });
    }

    // Get the highest order number and add 1
    const highestOrder = await InstagramPost.findOne().sort({ order: -1 });
    const order = highestOrder ? highestOrder.order + 1 : 1;

    const postData = {
      ...req.body,
      thumbnail: thumbnailUrl,
      order
    };

    const post = new InstagramPost(postData);
    const savedPost = await post.save();
    
    res.status(201).json(savedPost);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.updateInstagramPost = async (req, res) => {
  try {
    const postId = req.params.id;
    let updateData = { ...req.body };
    
    // Upload image to Cloudinary if file exists
    if (req.file) {
      try {
        const result = await uploadStream(req.file.buffer);
        updateData.thumbnail = result.secure_url;
      } catch (uploadError) {
        console.error('Error uploading to Cloudinary:', uploadError);
        return res.status(500).json({ error: 'Image upload failed' });
      }
    }

    const post = await InstagramPost.findByIdAndUpdate(postId, updateData, { new: true });
    
    if (!post) {
      return res.status(404).json({ message: 'Instagram post not found' });
    }
    
    res.status(200).json(post);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.deleteInstagramPost = async (req, res) => {
  try {
    const post = await InstagramPost.findByIdAndDelete(req.params.id);
    
    if (!post) {
      return res.status(404).json({ message: 'Instagram post not found' });
    }
    
    res.status(200).json({ message: 'Instagram post deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
exports.updateInstagramPostOrder = async (req, res) => {
  try {
    const posts = req.body;
    
    // Validate request body
    if (!Array.isArray(posts)) {
      return res.status(400).json({ 
        success: false,
        error: 'Expected an array of posts with _id and order properties' 
      });
    }
    
    // Validate each post has required fields
    for (const post of posts) {
      if (!post._id || typeof post.order !== 'number') {
        return res.status(400).json({ 
          success: false,
          error: 'Each post must have _id and order (number) properties' 
        });
      }
    }
    
    // Update all posts with new order
    const updatePromises = posts.map(post => 
      InstagramPost.findByIdAndUpdate(
        post._id, 
        { order: post.order }, 
        { new: true, runValidators: true }
      )
    );
    
    const updatedPosts = await Promise.all(updatePromises);
    
    // Check if any posts were not found
    const notFoundPosts = updatedPosts.filter(post => !post);
    if (notFoundPosts.length > 0) {
      return res.status(404).json({
        success: false,
        error: `${notFoundPosts.length} post(s) not found`
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Instagram post order updated successfully',
      data: updatedPosts.sort((a, b) => a.order - b.order)
    });
  } catch (error) {
    console.error('Error updating Instagram post order:', error);
    res.status(500).json({ 
      success: false,
      error: 'Internal server error while updating post order' 
    });
  }
};

exports.toggleInstagramPostActive = async (req, res) => {
  try {
    const { isActive } = req.body;
    
    if (typeof isActive !== 'boolean') {
      return res.status(400).json({ error: 'isActive must be a boolean' });
    }
    
    const post = await InstagramPost.findByIdAndUpdate(
      req.params.id, 
      { isActive }, 
      { new: true }
    );
    
    if (!post) {
      return res.status(404).json({ message: 'Instagram post not found' });
    }
    
    res.status(200).json(post);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Seed initial data
exports.seedInstagramPosts = async (req, res) => {
  try {
    const count = await InstagramPost.countDocuments();
    if (count > 0) {
      return res.status(400).json({ message: 'Instagram posts already exist' });
    }

    const initialPosts = [
      {
        thumbnail: "https://tang-cloth.vercel.app/assets/img1-f229cc41.jpg",
        alt: "Luxury Fashion Haul | Tangerine Luxury",
        title: "Luxury Fashion Haul | Tangerine Luxury",
        description: "Unboxing the most luxurious pieces from Tangerine Luxury's latest collection",
        link: "https://www.instagram.com/reel/C7D7vway-sR/",
        order: 1,
        isActive: true
      },
      {
        thumbnail: "https://tang-cloth.vercel.app/assets/img2-17de399e.jpg",
        alt: "Summer Collection Styling Tips",
        title: "Summer Collection Styling Tips", 
        description: "How to style Tangerine Luxury's summer collection for different occasions",
        link: "https://www.instagram.com/reel/DHOFqG2ykb7/",
        order: 2,
        isActive: true
      },
      {
        thumbnail: "https://tang-cloth.vercel.app/assets/img3-572a1817.jpg",
        alt: "Summer Collection Styling Tips",
        title: "Summer Collection Styling Tips",
        description: "How to style Tangerine Luxury's summer collection for different occasions",
        link: "https://www.instagram.com/reel/DHOFqG2ykb7/",
        order: 3,
        isActive: true
      },
      {
        thumbnail: "https://tang-cloth.vercel.app/assets/img4-4578214a.jpg",
        alt: "Summer Collection Styling Tips",
        title: "Summer Collection Styling Tips",
        description: "How to style Tangerine Luxury's summer collection for different occasions",
        link: "https://www.instagram.com/reel/DHOFqG2ykb7/",
        order: 4,
        isActive: true
      },
      {
        thumbnail: "https://tang-cloth.vercel.app/assets/img7-29c7172a.png",
        alt: "Summer Collection Styling Tips",
        title: "Summer Collection Styling Tips",
        description: "How to style Tangerine Luxury's summer collection for different occasions",
        link: "https://www.instagram.com/reel/DHOFqG2ykb7/",
        order: 5,
        isActive: true
      },
      {
        thumbnail: "https://tang-cloth.vercel.app/assets/img5-e2841ec6.jpg",
        alt: "Summer Collection Styling Tips",
        title: "Summer Collection Styling Tips",
        description: "How to style Tangerine Luxury's summer collection for different occasions",
        link: "https://www.instagram.com/reel/DHOFqG2ykb7/",
        order: 6,
        isActive: true
      },
      {
        thumbnail: "https://tang-cloth.vercel.app/assets/img6-308f1147.png",
        alt: "Summer Collection Styling Tips",
        title: "Summer Collection Styling Tips",
        description: "How to style Tangerine Luxury's summer collection for different occasions",
        link: "https://www.instagram.com/reel/DHOFqG2ykb7/",
        order: 7,
        isActive: true
      }
    ];

    await InstagramPost.insertMany(initialPosts);
    res.status(201).json({ message: 'Instagram posts seeded successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};