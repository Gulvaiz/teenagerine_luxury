const Comment = require('../models/comment.model');
const Blog = require('../models/blog.model');

// Get comments for a blog post
exports.getCommentsByBlog = async (req, res) => {
  try {
    const { blogId } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const comments = await Comment.find({
      blog: blogId,
      isApproved: true
    })
      .populate('user', 'name')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Comment.countDocuments({ blog: blogId, isApproved: true });

    res.json({
      success: true,
      data: {
        comments,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalComments: total
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching comments',
      error: error.message
    });
  }
};

// Create a new comment
exports.createComment = async (req, res) => {
  try {
    const { blogId } = req.params;
    const { content } = req.body;
    const userId = req.user.id;

    // Check if blog exists and allows comments
    const blog = await Blog.findById(blogId);
    if (!blog) {
      return res.status(404).json({
        success: false,
        message: 'Blog not found'
      });
    }

    if (!blog.allowComments) {
      return res.status(403).json({
        success: false,
        message: 'Comments are disabled for this blog post'
      });
    }

    // Create comment
    const comment = new Comment({
      blog: blogId,
      user: userId,
      userName: req.user.name,
      userEmail: req.user.email,
      content: content.trim()
    });

    await comment.save();

    // Populate user info for response
    await comment.populate('user', 'name');

    res.status(201).json({
      success: true,
      message: 'Comment posted successfully',
      data: comment
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating comment',
      error: error.message
    });
  }
};

// Update a comment (only by comment owner)
exports.updateComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const { content } = req.body;
    const userId = req.user.id;

    const comment = await Comment.findById(commentId);

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: 'Comment not found'
      });
    }

    // Check if user is the comment owner
    if (comment.user.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'You can only edit your own comments'
      });
    }

    comment.content = content.trim();
    await comment.save();

    await comment.populate('user', 'name');

    res.json({
      success: true,
      message: 'Comment updated successfully',
      data: comment
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating comment',
      error: error.message
    });
  }
};

// Delete a comment (only by comment owner or admin)
exports.deleteComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    const comment = await Comment.findById(commentId);

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: 'Comment not found'
      });
    }

    // Check if user is the comment owner or admin
    if (comment.user.toString() !== userId && userRole !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'You can only delete your own comments'
      });
    }

    await Comment.findByIdAndDelete(commentId);

    res.json({
      success: true,
      message: 'Comment deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting comment',
      error: error.message
    });
  }
};

// Admin: Get all comments (for moderation)
exports.getAllComments = async (req, res) => {
  try {
    const { page = 1, limit = 50, approved } = req.query;

    const filter = {};
    if (approved !== undefined) {
      filter.isApproved = approved === 'true';
    }

    const comments = await Comment.find(filter)
      .populate('user', 'name email')
      .populate('blog', 'title slug')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Comment.countDocuments(filter);

    res.json({
      success: true,
      data: {
        comments,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalComments: total
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching comments',
      error: error.message
    });
  }
};

// Admin: Approve/Reject comment
exports.moderateComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const { isApproved } = req.body;

    const comment = await Comment.findByIdAndUpdate(
      commentId,
      { isApproved },
      { new: true }
    ).populate('user', 'name');

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: 'Comment not found'
      });
    }

    res.json({
      success: true,
      message: `Comment ${isApproved ? 'approved' : 'rejected'} successfully`,
      data: comment
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error moderating comment',
      error: error.message
    });
  }
};

module.exports = exports;
