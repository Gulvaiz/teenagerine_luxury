const mongoose = require('mongoose');

const blogSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxLength: 200
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  content: {
    type: String,
    required: true
  },
  excerpt: {
    type: String,
    required: true,
    maxLength: 500
  },
  featuredImage: {
    type: String,
    required: true
  },
  images: [{
    type: String
  }],
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  authorName: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['draft', 'published', 'scheduled', 'archived'],
    default: 'draft'
  },
  publishedAt: {
    type: Date
  },
  scheduledAt: {
    type: Date
  },
  categories: [{
    type: String,
    trim: true
  }],
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  metaTitle: {
    type: String,
    maxLength: 100
  },
  metaDescription: {
    type: String,
    maxLength: 200
  },
  metaKeywords: [{
    type: String
  }],
  views: {
    type: Number,
    default: 0
  },
  likes: {
    type: Number,
    default: 0
  },
  shares: {
    type: Number,
    default: 0
  },
  isTrending: {
    type: Boolean,
    default: false
  },
  featuredPost: {
    type: Boolean,
    default: false
  },
  allowComments: {
    type: Boolean,
    default: true
  },
  readingTime: {
    type: Number, // in minutes
    default: 1
  },
  lastModifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  seoOptimized: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Indexes for better performance
blogSchema.index({ slug: 1 });
blogSchema.index({ status: 1, publishedAt: -1 });
blogSchema.index({ views: -1 });
blogSchema.index({ categories: 1 });
blogSchema.index({ tags: 1 });
blogSchema.index({ isTrending: 1, views: -1 });

// Virtual for URL
blogSchema.virtual('url').get(function() {
  return `/blog/${this.slug}`;
});

// Method to calculate reading time
blogSchema.methods.calculateReadingTime = function() {
  const wordsPerMinute = 200;
  const words = this.content.split(' ').length;
  this.readingTime = Math.ceil(words / wordsPerMinute);
  return this.readingTime;
};

// Method to increment views
blogSchema.methods.incrementViews = function() {
  this.views += 1;
  // Mark as trending if views exceed threshold
  if (this.views > 100) {
    this.isTrending = true;
  }
  return this.save();
};

// Pre-save middleware to calculate reading time and set publish date
blogSchema.pre('save', function(next) {
  if (this.isNew || this.isModified('content')) {
    this.calculateReadingTime();
  }
  
  // Set publishedAt when status changes to published
  if (this.isModified('status') && this.status === 'published' && !this.publishedAt) {
    this.publishedAt = new Date();
  }
  
  next();
});

module.exports = mongoose.model('Blog', blogSchema);