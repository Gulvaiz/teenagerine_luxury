const ProductRequest = require('../models/productRequest.model');
const User = require('../models/user.model');
const emailService = require('../utils/emailService');

// Create a new product request
exports.createProductRequest = async (req, res) => {
  try {
    const { name, description, budget, contactEmail, contactPhone,referenceImage} = req.body;
    const requestData = {
      name,
      description,
      budget,
      contactEmail,
      contactPhone,
      referenceImage,
      isGuest: !req.user
    };
    
    // Add user ID if authenticated
    if (req.user) {
      requestData.requestedBy = req.user._id;
    }
    
    const productRequest = await ProductRequest.create(requestData);
    
    // Send email notifications (don't block the response if email fails)
    try {
      await Promise.all([
        emailService.sendProductRequestAdminEmail(productRequest),
        emailService.sendProductRequestConfirmationEmail(productRequest)
      ]);
    } catch (emailError) {
      console.error('Product request email sending failed:', emailError);
      // Continue with success response even if email fails
    }
    
    res.status(201).json({
      status: 'success',
      data: {
        productRequest
      }
    });
  } catch (error) {
    console.error('Error creating product request:', error);
    res.status(400).json({
      status: 'fail',
      message: error.message
    });
  }
};

// Get all product requests (admin only)
exports.getAllProductRequests = async (req, res) => {
  try {
    const { status } = req.query;
    
    // Build query
    const query = {};
    if (status) {
      query.status = status;
    }
    
    const productRequests = await ProductRequest.find(query)
      .populate('requestedBy', 'name email')
      .sort({ createdAt: -1 });
    
    res.status(200).json({
      status: 'success',
      results: productRequests.length,
      data: {
        productRequests
      }
    });
  } catch (error) {
    console.error('Error getting product requests:', error);
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// Get user's product requests
exports.getUserProductRequests = async (req, res) => {
  try {
    const productRequests = await ProductRequest.find({ requestedBy: req.user._id })
      .sort({ createdAt: -1 });
    
    res.status(200).json({
      status: 'success',
      results: productRequests.length,
      data: {
        productRequests
      }
    });
  } catch (error) {
    console.error('Error getting user product requests:', error);
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// Get a single product request
exports.getProductRequest = async (req, res) => {
  try {
    const productRequest = await ProductRequest.findById(req.params.id)
      .populate('requestedBy', 'name email');
    
    if (!productRequest) {
      return res.status(404).json({
        status: 'fail',
        message: 'Product request not found'
      });
    }
    
    // Check if user is admin or the request owner
    if (req.user.role !== 'admin' && productRequest.requestedBy._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        status: 'fail',
        message: 'You are not authorized to access this product request'
      });
    }
    
    res.status(200).json({
      status: 'success',
      data: {
        productRequest
      }
    });
  } catch (error) {
    console.error('Error getting product request:', error);
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// Update product request status (admin only)
exports.updateProductRequestStatus = async (req, res) => {
  try {
    const { status, adminNotes } = req.body;
    
    const productRequest = await ProductRequest.findByIdAndUpdate(
      req.params.id,
      { 
        status, 
        adminNotes: adminNotes || '',
        updatedAt: Date.now()
      },
      { new: true, runValidators: true }
    ).populate('requestedBy', 'name email');
    
    if (!productRequest) {
      return res.status(404).json({
        status: 'fail',
        message: 'Product request not found'
      });
    }
    
    res.status(200).json({
      status: 'success',
      data: {
        productRequest
      }
    });
  } catch (error) {
    console.error('Error updating product request:', error);
    res.status(400).json({
      status: 'fail',
      message: error.message
    });
  }
};