const SaleItemsSelection = require('../models/saleItemsSelection.model');
const Product = require('../models/product.model');

// Get all products that can be selected for sale items (sale products)
exports.getAllSaleProducts = async (req, res) => {
  try {
    const { page = 1, limit = 50, search = '' } = req.query;
    
    // Build query for sale products (products with salePrice or isSale = true)
    let query = {
      $or: [
        { isSale: true },
        { salePrice: { $exists: true, $ne: null, $gt: 0 } }
      ],
      status: true // Only active products
    };

    // Add search functionality
    if (search.trim()) {
      query.$and = [
        { $or: [
          { isSale: true },
          { salePrice: { $exists: true, $ne: null, $gt: 0 } }
        ]},
        { $or: [
          { name: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } }
        ]},
        { status: true }
      ];
    }

    const skip = (page - 1) * limit;
    
    const saleProducts = await Product.find(query)
      .populate('primaryBrand', 'name')
      .populate('primaryCategory', 'name')
      .select('name image images price salePrice retailPrice createdAt updatedAt isSale')
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Product.countDocuments(query);

    res.status(200).json({
      status: 'success',
      results: saleProducts.length,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / limit),
      data: { products: saleProducts }
    });
  } catch (error) {
    console.error('Error fetching sale products:', error);
    res.status(500).json({ 
      status: 'error', 
      message: error.message 
    });
  }
};

// Get current sale items selection
exports.getSaleItemsSelection = async (req, res) => {
  try {
    const selection = await SaleItemsSelection.findOne()
      .populate({
        path: 'selectedProducts.productId',
        select: 'name image images price salePrice retailPrice createdAt updatedAt isSale',
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
    console.error('Error fetching sale items selection:', error);
    res.status(500).json({ 
      status: 'error', 
      message: error.message 
    });
  }
};

// Update sale items selection
exports.updateSaleItemsSelection = async (req, res) => {
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

    // Verify that all products exist and are sale products
    const products = await Product.find({
      _id: { $in: selectedProductIds },
      $or: [
        { isSale: true },
        { salePrice: { $exists: true, $ne: null, $gt: 0 } }
      ],
      status: true
    });

    if (products.length !== selectedProductIds.length) {
      return res.status(400).json({
        status: 'fail',
        message: 'Some products are not found or not sale products'
      });
    }

    // Prepare selected products array with order
    const selectedProducts = selectedProductIds.map((productId, index) => ({
      productId,
      isSelected: true,
      order: index
    }));

    // Update or create sale items selection
    const selection = await SaleItemsSelection.findOneAndUpdate(
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
      select: 'name image images price salePrice retailPrice createdAt updatedAt isSale',
      populate: [
        { path: 'primaryBrand', select: 'name' },
        { path: 'primaryCategory', select: 'name' }
      ]
    }).populate('updatedBy', 'name email');

    res.status(200).json({
      status: 'success',
      message: 'Sale items selection updated successfully',
      data: selection
    });
  } catch (error) {
    console.error('Error updating sale items selection:', error);
    res.status(500).json({ 
      status: 'error', 
      message: error.message 
    });
  }
};

// Toggle sale items active status
exports.toggleSaleItemsSelection = async (req, res) => {
  try {
    const { isActive } = req.body;
    const userId = req.user._id;

    if (typeof isActive !== 'boolean') {
      return res.status(400).json({
        status: 'fail',
        message: 'isActive must be a boolean'
      });
    }

    const selection = await SaleItemsSelection.findOneAndUpdate(
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
      select: 'name image images price salePrice retailPrice createdAt updatedAt isSale'
    }).populate('updatedBy', 'name email');

    res.status(200).json({
      status: 'success',
      message: `Sale items ${isActive ? 'enabled' : 'disabled'} successfully`,
      data: selection
    });
  } catch (error) {
    console.error('Error toggling sale items selection:', error);
    res.status(500).json({ 
      status: 'error', 
      message: error.message 
    });
  }
};

// Get selected products for sale items page (public endpoint)
exports.getSelectedProductsForSaleItems = async (req, res) => {
  try {
    const selection = await SaleItemsSelection.findOne({ isActive: true })
      .populate({
        path: 'selectedProducts.productId',
        select: 'name image images price salePrice retailPrice createdAt updatedAt isSale slug',
        match: { 
          $or: [
            { isSale: true },
            { salePrice: { $exists: true, $ne: null, $gt: 0 } }
          ],
          status: true
        },
        populate: [
          { path: 'primaryBrand', select: 'name' },
          { path: 'primaryCategory', select: 'name' }
        ]
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
    console.error('Error fetching selected products for sale items:', error);
    res.status(500).json({ 
      status: 'error', 
      message: error.message 
    });
  }
};