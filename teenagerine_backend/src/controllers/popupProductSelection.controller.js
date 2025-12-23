const PopupProductSelection = require('../models/popupProductSelection.model');
const Product = require('../models/product.model');

// Get all sold products that admin can select from
exports.getAllSoldProducts = async (req, res) => {
  try {
    const { page = 1, limit = 50, search = '' } = req.query;
    
    // Build query for sold products (soldOut = true or stockQuantity = 0)
    let query = {
      $or: [
        { soldOut: true },
        { stockQuantity: { $lte: 0 } }
      ]
    };

    // Add search functionality
    if (search.trim()) {
      query.$and = [
        { $or: [
          { soldOut: true },
          { stockQuantity: { $lte: 0 } }
        ]},
        { $or: [
          { name: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } }
        ]}
      ];
    }

    const skip = (page - 1) * limit;
    
    const soldProducts = await Product.find(query)
      .populate('primaryBrand', 'name')
      .populate('primaryCategory', 'name')
      .select('name image price salePrice retailPrice createdAt updatedAt soldOut stockQuantity')
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Product.countDocuments(query);

    res.status(200).json({
      status: 'success',
      results: soldProducts.length,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / limit),
      data: { products: soldProducts }
    });
  } catch (error) {
    console.error('Error fetching sold products:', error);
    res.status(500).json({ 
      status: 'error', 
      message: error.message 
    });
  }
};

// Get current popup product selection
exports.getPopupProductSelection = async (req, res) => {
  try {
    const selection = await PopupProductSelection.findOne()
      .populate({
        path: 'selectedProducts.productId',
        select: 'name image price salePrice retailPrice createdAt updatedAt',
        populate: [
          { path: 'primaryBrand', select: 'name' },
          { path: 'primaryCategory', select: 'name' }
        ]
      })
      .populate('updatedBy', 'name email');

    if (!selection) {
      return res.status(200).json({
        status: 'success',
        data: {
          selectedProducts: [],
          isActive: true
        }
      });
    }

    res.status(200).json({
      status: 'success',
      data: selection
    });
  } catch (error) {
    console.error('Error fetching popup product selection:', error);
    res.status(500).json({ 
      status: 'error', 
      message: error.message 
    });
  }
};

// Update popup product selection
exports.updatePopupProductSelection = async (req, res) => {
  try {
    const { selectedProductIds, isActive = true } = req.body;
    const userId = req.user._id;

    // Validate input
    if (!Array.isArray(selectedProductIds)) {
      return res.status(400).json({
        status: 'fail',
        message: 'selectedProductIds must be an array'
      });
    }

    // Verify that all products exist and are sold out
    const products = await Product.find({
      _id: { $in: selectedProductIds },
      $or: [
        { soldOut: true },
        { stockQuantity: { $lte: 0 } }
      ]
    });

    if (products.length !== selectedProductIds.length) {
      return res.status(400).json({
        status: 'fail',
        message: 'Some products are not found or not sold out'
      });
    }

    // Prepare selected products array with order
    const selectedProducts = selectedProductIds.map((productId, index) => ({
      productId,
      isSelected: true,
      order: index
    }));

    // Update or create popup product selection
    const selection = await PopupProductSelection.findOneAndUpdate(
      {},
      {
        selectedProducts,
        isActive,
        updatedBy: userId
      },
      {
        new: true,
        upsert: true
      }
    ).populate({
      path: 'selectedProducts.productId',
      select: 'name image price salePrice retailPrice createdAt updatedAt',
      populate: [
        { path: 'primaryBrand', select: 'name' },
        { path: 'primaryCategory', select: 'name' }
      ]
    }).populate('updatedBy', 'name email');

    res.status(200).json({
      status: 'success',
      message: 'Popup product selection updated successfully',
      data: selection
    });
  } catch (error) {
    console.error('Error updating popup product selection:', error);
    res.status(500).json({ 
      status: 'error', 
      message: error.message 
    });
  }
};

// Toggle popup active status
exports.togglePopupProductSelection = async (req, res) => {
  try {
    const { isActive } = req.body;
    const userId = req.user._id;

    if (typeof isActive !== 'boolean') {
      return res.status(400).json({
        status: 'fail',
        message: 'isActive must be a boolean'
      });
    }

    const selection = await PopupProductSelection.findOneAndUpdate(
      {},
      {
        isActive,
        updatedBy: userId
      },
      {
        new: true,
        upsert: true
      }
    ).populate({
      path: 'selectedProducts.productId',
      select: 'name image price salePrice retailPrice createdAt updatedAt'
    }).populate('updatedBy', 'name email');

    res.status(200).json({
      status: 'success',
      message: `Popup products ${isActive ? 'enabled' : 'disabled'} successfully`,
      data: selection
    });
  } catch (error) {
    console.error('Error toggling popup product selection:', error);
    res.status(500).json({ 
      status: 'error', 
      message: error.message 
    });
  }
};

// Get selected products for popup display (public endpoint)
exports.getSelectedProductsForPopup = async (req, res) => {
  try {
    const selection = await PopupProductSelection.findOne({ isActive: true })
      .populate({
        path: 'selectedProducts.productId',
        select: 'name image images price salePrice retailPrice createdAt updatedAt',
        match: { 
          $or: [
            { soldOut: true },
            { stockQuantity: { $lte: 0 } }
          ]
        }
      });

    if (!selection || !selection.selectedProducts.length) {
      return res.status(200).json({
        status: 'success',
        data: { products: [] }
      });
    }

    // Filter out null products (in case some were deleted) and sort by order
    const validProducts = selection.selectedProducts
      .filter(item => item.productId !== null)
      .sort((a, b) => a.order - b.order)
      .map(item => item.productId);

    res.status(200).json({
      status: 'success',
      data: { products: validProducts }
    });
  } catch (error) {
    console.error('Error fetching selected products for popup:', error);
    res.status(500).json({ 
      status: 'error', 
      message: error.message 
    });
  }
};