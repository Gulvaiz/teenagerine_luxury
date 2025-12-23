const Blog = require('../models/blog.model');
const User = require('../models/user.model');
const slugify = require('slugify');

// Helper function to create slug
const createSlug = (title, existingSlugs = []) => {
  let baseSlug = slugify(title, { lower: true, strict: true });
  let slug = baseSlug;
  let counter = 1;
  
  while (existingSlugs.includes(slug)) {
    slug = `${baseSlug}-${counter}`;
    counter++;
  }
  
  return slug;
};

// Get all blogs with pagination and filters
exports.getAllBlogs = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      category,
      tag,
      author,
      trending,
      featured,
      search,
      sortBy = 'publishedAt',
      sortOrder = 'desc'
    } = req.query;

    const filter = {};
    
    // Apply filters
    if (status) filter.status = status;
    if (category) filter.categories = { $in: [category] };
    if (tag) filter.tags = { $in: [tag] };
    if (author) filter.author = author;
    if (trending === 'true') filter.isTrending = true;
    if (featured === 'true') filter.featuredPost = true;
    
    // Search functionality
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } },
        { excerpt: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const blogs = await Blog.find(filter)
      .populate('author', 'name email')
      .sort(sortOptions)
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Blog.countDocuments(filter);

    res.json({
      success: true,
      data: {
        blogs,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalBlogs: total,
          hasNextPage: page < Math.ceil(total / limit),
          hasPrevPage: page > 1
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching blogs',
      error: error.message
    });
  }
};

// Get published blogs for frontend
exports.getPublishedBlogs = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      category,
      tag,
      trending,
      featured,
      search
    } = req.query;

    const filter = { 
      status: 'published',
      publishedAt: { $lte: new Date() }
    };
    
    if (category) filter.categories = { $in: [category] };
    if (tag) filter.tags = { $in: [tag] };
    if (trending === 'true') filter.isTrending = true;
    if (featured === 'true') filter.featuredPost = true;
    
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { excerpt: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    const blogs = await Blog.find(filter)
      .populate('author', 'name')
      .sort({ publishedAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .select('-content'); // Don't send full content for list view

    const total = await Blog.countDocuments(filter);

    res.json({
      success: true,
      data: {
        blogs,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalBlogs: total
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching published blogs',
      error: error.message
    });
  }
};

// Get single blog by slug
exports.getBlogBySlug = async (req, res) => {
  try {
    const { slug } = req.params;
    const { increment_view = 'true' } = req.query;
    
    const blog = await Blog.findOne({ slug })
      .populate('author', 'name email');
    
    if (!blog) {
      return res.status(404).json({
        success: false,
        message: 'Blog not found'
      });
    }

    // Increment view count if requested (default true for frontend)
    if (increment_view === 'true') {
      await blog.incrementViews();
    }

    res.json({
      success: true,
      data: blog
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching blog',
      error: error.message
    });
  }
};

// Create new blog
exports.createBlog = async (req, res) => {
  // console.log(req.user)
  try {
    const {
      title,
      content,
      excerpt,
      featuredImage,
      images = [],
      categories = [],
      tags = [],
      status = 'draft',
      scheduledAt,
      metaTitle,
      metaDescription,
      metaKeywords = [],
      featuredPost = false,
      allowComments = true
    } = req.body;

    const authorId = req.user.id;

    const author = await User.findById(authorId);
    
    if (!author) {
      return res.status(404).json({
        success: false,
        message: 'Author not found'
      });
    }

    // Generate unique slug
    const existingBlogs = await Blog.find({}, 'slug');
    const existingSlugs = existingBlogs.map(blog => blog.slug);
    const slug = createSlug(title, existingSlugs);

    const blogData = {
      title,
      slug,
      content,
      excerpt,
      featuredImage,
      images,
      author: authorId,
      authorName: author.name,
      categories,
      tags,
      status,
      metaTitle: metaTitle || title,
      metaDescription: metaDescription || excerpt,
      metaKeywords,
      featuredPost,
      allowComments,
      lastModifiedBy: authorId
    };

    // Handle scheduling
    if (status === 'scheduled' && scheduledAt) {
      blogData.scheduledAt = new Date(scheduledAt);
    }

    // Set publishedAt if creating as published
    if (status === 'published') {
      blogData.publishedAt = new Date();
    }

    const blog = new Blog(blogData);
    await blog.save();

    res.status(201).json({
      success: true,
      message: 'Blog created successfully',
      data: blog
    });
  } catch (error) {
    console.log(error)
    res.status(500).json({
      success: false,
      message: 'Error creating blog',
      error: error.message
    });
  }
};

// Update blog
exports.updateBlog = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };
    updateData.lastModifiedBy = req.user.id;

    // Get the existing blog to check previous status
    const existingBlog = await Blog.findById(id);
    if (!existingBlog) {
      return res.status(404).json({
        success: false,
        message: 'Blog not found'
      });
    }

    // Handle slug update if title changed
    if (updateData.title) {
      const existingBlogs = await Blog.find({ _id: { $ne: id } }, 'slug');
      const existingSlugs = existingBlogs.map(blog => blog.slug);
      updateData.slug = createSlug(updateData.title, existingSlugs);
    }

    // Handle status changes
    if (updateData.status === 'scheduled' && updateData.scheduledAt) {
      updateData.scheduledAt = new Date(updateData.scheduledAt);
    }

    // Set publishedAt when status changes to published
    if (updateData.status === 'published' && existingBlog.status !== 'published') {
      updateData.publishedAt = new Date();
    }

    const blog = await Blog.findByIdAndUpdate(id, updateData, { 
      new: true,
      runValidators: true 
    }).populate('author', 'name email');

    if (!blog) {
      return res.status(404).json({
        success: false,
        message: 'Blog not found'
      });
    }

    res.json({
      success: true,
      message: 'Blog updated successfully',
      data: blog
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating blog',
      error: error.message
    });
  }
};

// Delete blog
exports.deleteBlog = async (req, res) => {
  try {
    const { id } = req.params;
    
    const blog = await Blog.findByIdAndDelete(id);
    
    if (!blog) {
      return res.status(404).json({
        success: false,
        message: 'Blog not found'
      });
    }

    res.json({
      success: true,
      message: 'Blog deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting blog',
      error: error.message
    });
  }
};

// Get trending blogs
exports.getTrendingBlogs = async (req, res) => {
  try {
    const { limit = 5 } = req.query;
    
    const trendingBlogs = await Blog.find({
      status: 'published',
      publishedAt: { $lte: new Date() }
    })
    .sort({ views: -1, publishedAt: -1 })
    .limit(parseInt(limit))
    .populate('author', 'name')
    .select('title slug excerpt featuredImage views authorName publishedAt readingTime');

    res.json({
      success: true,
      data: trendingBlogs
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching trending blogs',
      error: error.message
    });
  }
};

// Get featured blogs
exports.getFeaturedBlogs = async (req, res) => {
  try {
    const { limit = 3 } = req.query;
    
    const featuredBlogs = await Blog.find({
      status: 'published',
      featuredPost: true,
      publishedAt: { $lte: new Date() }
    })
    .sort({ publishedAt: -1 })
    .limit(parseInt(limit))
    .populate('author', 'name');

    res.json({
      success: true,
      data: featuredBlogs
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching featured blogs',
      error: error.message
    });
  }
};

// Get blog categories
exports.getBlogCategories = async (req, res) => {
  try {
    const categories = await Blog.aggregate([
      { $match: { status: 'published' } },
      { $unwind: '$categories' },
      { $group: { _id: '$categories', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    res.json({
      success: true,
      data: categories.map(cat => ({
        name: cat._id,
        count: cat.count
      }))
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching blog categories',
      error: error.message
    });
  }
};

// Get blog tags
exports.getBlogTags = async (req, res) => {
  try {
    const tags = await Blog.aggregate([
      { $match: { status: 'published' } },
      { $unwind: '$tags' },
      { $group: { _id: '$tags', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 20 }
    ]);

    res.json({
      success: true,
      data: tags.map(tag => ({
        name: tag._id,
        count: tag.count
      }))
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching blog tags',
      error: error.message
    });
  }
};

// Publish scheduled blogs (to be run by cron job)
exports.publishScheduledBlogs = async (req, res) => {
  try {
    const now = new Date();
    const scheduledBlogs = await Blog.find({
      status: 'scheduled',
      scheduledAt: { $lte: now }
    });

    const publishedCount = await Blog.updateMany(
      {
        status: 'scheduled',
        scheduledAt: { $lte: now }
      },
      {
        status: 'published',
        publishedAt: now
      }
    );

    res.json({
      success: true,
      message: `Published ${publishedCount.modifiedCount} scheduled blogs`,
      data: { publishedCount: publishedCount.modifiedCount }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error publishing scheduled blogs',
      error: error.message
    });
  }
};

// Get blog analytics/stats
exports.getBlogStats = async (req, res) => {
  try {
    const stats = await Blog.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalViews: { $sum: '$views' },
          avgViews: { $avg: '$views' }
        }
      }
    ]);

    const totalBlogs = await Blog.countDocuments();
    const trendingCount = await Blog.countDocuments({ isTrending: true });
    const featuredCount = await Blog.countDocuments({ featuredPost: true });

    const topBlog = await Blog.findOne()
      .sort({ views: -1 })
      .select('title views');

    res.json({
      success: true,
      data: {
        totalBlogs,
        trendingCount,
        featuredCount,
        statusStats: stats,
        topBlog
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching blog stats',
      error: error.message
    });
  }
};