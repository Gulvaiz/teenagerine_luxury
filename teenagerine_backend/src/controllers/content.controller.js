const Content = require('../models/content.model');

// Get content by type
exports.getContentByType = async (req, res) => {
  try {
    const { type } = req.params;
    
    const content = await Content.findOne({ type })
      .sort({ createdAt: -1 })
      .populate('updatedBy', 'name email');
    
    if (!content) {
      return res.status(404).json({
        status: 'fail',
        message: `No content found for ${type}`
      });
    }
    
    res.status(200).json({
      status: 'success',
      data: content
    });
  } catch (error) {
    console.error('Error getting content:', error);
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// Update content
exports.updateContent = async (req, res) => {
  try {
    const { type } = req.params;
    const { title, content } = req.body;
    
    if (!title || !content) {
      return res.status(400).json({
        status: 'fail',
        message: 'Title and content are required'
      });
    }
    
    // Find existing content or create new
    let contentDoc = await Content.findOne({ type });
    
    if (contentDoc) {
      // Update existing content
      contentDoc.title = title;
      contentDoc.content = content;
      contentDoc.lastUpdated = Date.now();
      contentDoc.updatedBy = req.user._id;
      await contentDoc.save();
    } else {
      // Create new content
      contentDoc = await Content.create({
        type,
        title,
        content,
        updatedBy: req.user._id
      });
    }
    
    res.status(200).json({
      status: 'success',
      data: contentDoc
    });
  } catch (error) {
    console.error('Error updating content:', error);
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// Get all content types
exports.getAllContent = async (req, res) => {
  try {
    const contents = await Content.find()
      .sort({ type: 1 })
      .populate('updatedBy', 'name email');
    
    res.status(200).json({
      status: 'success',
      results: contents.length,
      data: contents
    });
  } catch (error) {
    console.error('Error getting all content:', error);
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};