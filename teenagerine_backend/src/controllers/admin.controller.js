const User = require("../models/user.model");
const Product = require("../models/product.model");
const Order = require("../models/order.model");
const CourierConfig = require('../services/courierConfig');

exports.getDashboardStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalProducts = await Product.countDocuments();
    const totalOrders = await Order.countDocuments();

    // Total Revenue 
    const totalRevenueAgg = await Order.aggregate([
      { $group: { _id: null, total: { $sum: "$totalAmount" } } }
    ]);
    const totalRevenue = totalRevenueAgg[0]?.total || 0;

    // Recent Orders (last 5)
    const recentOrders = await Order.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate("user")
      .populate({
        path: "items.productId",
        strictPopulate: false
      });

    // Low Stock Products (stockQuantity <= 5 or any variant with low stock)
    const lowStockProducts = await Product.find({
      $or: [
        { stockQuantity: { $lte: 5 } },
        { 'sizes.stockQuantity': { $lte: 5 } },
        { 'colors.stockQuantity': { $lte: 5 } }
      ],
      'inventory.trackQuantity': true
    });

    // Monthly Revenue (last 12 months)
    const monthlyRevenue = await Order.aggregate([
      {
        $group: {
          _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } },
          total: { $sum: "$totalAmount" }
        }
      },
      { $sort: { "_id.year": -1, "_id.month": -1 } },
      { $limit: 12 }
    ]);

    // Format monthly revenue
    const formattedMonthlyRevenue = monthlyRevenue
      .map(item => ({
        year: item._id.year,
        month: item._id.month,
        total: item.total
      }))
      .reverse();

    res.status(200).json({
      status: "success", 
      data: {
        totalUsers,
        totalProducts,
        totalOrders,
        totalRevenue,
        recentOrders,
        lowStockProducts,
        monthlyRevenue: formattedMonthlyRevenue
      }
    });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
};

exports.getLowStockProducts = async (req, res) => {
  try {
    const threshold = parseInt(req.query.threshold || 5);

    // Find products where:
    // 1. stockQuantity is less than or equal to threshold, OR
    // 2. Any size has stockQuantity <= threshold, OR
    // 3. Any color has stockQuantity <= threshold, OR
    // 4. stockQuantity is less than or equal to inventory.lowStockThreshold
    const lowStock = await Product.find({
      $or: [
        { stockQuantity: { $lte: threshold } },
        { 'sizes.stockQuantity': { $lte: threshold } },
        { 'colors.stockQuantity': { $lte: threshold } },
        {
          $expr: {
            $lte: ['$stockQuantity', '$inventory.lowStockThreshold']
          }
        }
      ],
      // Only include active products that track quantity
      'inventory.trackQuantity': true
    })
    .populate('primaryCategory', 'name')
    .populate('primaryBrand', 'name')
    .sort({ stockQuantity: 1 }); // Sort by lowest stock first

    // Add additional stock information for each product
    const productsWithStockInfo = lowStock.map(product => {
      const productObj = product.toObject();

      // Calculate total stock across all variants
      let totalStock = productObj.stockQuantity || 0;

      // Add stock from sizes
      if (productObj.sizes && productObj.sizes.length > 0) {
        const sizeStock = productObj.sizes.reduce((sum, size) => sum + (size.stockQuantity || 0), 0);
        totalStock += sizeStock;
      }

      // Add stock from colors
      if (productObj.colors && productObj.colors.length > 0) {
        const colorStock = productObj.colors.reduce((sum, color) => sum + (color.stockQuantity || 0), 0);
        totalStock += colorStock;
      }

      // Determine stock status
      let stockStatus = 'low';
      if (totalStock === 0) {
        stockStatus = 'out_of_stock';
      } else if (totalStock <= (productObj.inventory?.lowStockThreshold || threshold)) {
        stockStatus = 'critical';
      }

      return {
        ...productObj,
        totalStock,
        stockStatus,
        threshold: productObj.inventory?.lowStockThreshold || threshold
      };
    });

    res.status(200).json({
      status: "success",
      count: productsWithStockInfo.length,
      products: productsWithStockInfo
    });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
};

// Get out of stock products (products with exactly 0 stock) with pagination and search
exports.getOutOfStockProducts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;
    const searchQuery = req.query.search ? req.query.search.trim() : '';

    // Base query for out of stock products
    const baseStockConditions = [
      { stockQuantity: 0 },
      {
        $or: [
          { sizes: { $exists: false } },
          { sizes: { $size: 0 } },
          {
            $and: [
              { sizes: { $exists: true } },
              { 'sizes.0': { $exists: true } },
              {
                sizes: {
                  $not: {
                    $elemMatch: { stockQuantity: { $gt: 0 } }
                  }
                }
              }
            ]
          }
        ]
      },
      {
        $or: [
          { colors: { $exists: false } },
          { colors: { $size: 0 } },
          {
            $and: [
              { colors: { $exists: true } },
              { 'colors.0': { $exists: true } },
              {
                colors: {
                  $not: {
                    $elemMatch: { stockQuantity: { $gt: 0 } }
                  }
                }
              }
            ]
          }
        ]
      },
      { 'inventory.trackQuantity': true }
    ];

    // Build final query with search if provided
    const query = searchQuery ? {
      $and: [
        ...baseStockConditions,
        {
          $or: [
            { name: { $regex: searchQuery, $options: 'i' } },
            { sku: { $regex: searchQuery, $options: 'i' } },
            { description: { $regex: searchQuery, $options: 'i' } }
          ]
        }
      ]
    } : { $and: baseStockConditions };

    // Get total count for pagination
    const totalCount = await Product.countDocuments(query);

    // Get paginated products
    const outOfStockProducts = await Product.find(query)
      .populate('primaryCategory', 'name')
      .populate('primaryBrand', 'name')
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // Calculate pagination info
    const totalPages = Math.ceil(totalCount / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    res.status(200).json({
      status: "success",
      data: {
        products: outOfStockProducts,
        pagination: {
          currentPage: page,
          totalPages,
          totalProducts: totalCount,
          productsPerPage: limit,
          hasNextPage,
          hasPrevPage
        }
      }
    });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
};

exports.getSalesByProduct = async (req, res) => {
  const sales = await Order.aggregate([
    { $unwind: "$items" },
    {
      $group: {
        _id: "$items.product",
        totalSold: { $sum: "$items.quantity" },
      }
    },
    {
      $lookup: {
        from: "products",
        localField: "_id",
        foreignField: "_id",
        as: "product"
      }
    },
    { $unwind: "$product" },
    {
      $project: {
        name: "$product.name",
        totalSold: 1,
        stock: "$product.stock"
      }
    },
    { $sort: { totalSold: -1 } }
  ]);

  res.status(200).json({ status: "success", sales });
};


exports.getAllProduct=async (req,res)=>{

}

/**
 * Get courier service configuration and status
 */
exports.getCourierServiceStatus = async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        status: "fail",
        message: "Access denied. Admin only."
      });
    }

    // Check environment variables for courier configuration
    const courierStatus = {
      bluedart: {
        name: 'BlueDart',
        configured: !!(
          process.env.BLUEDART_LICENSE_KEY &&
          process.env.BLUEDART_LOGIN &&
          process.env.BLUEDART_CUSTOMER_CODE
        ),
        credentials: {
          hasLicenseKey: !!process.env.BLUEDART_LICENSE_KEY,
          hasLogin: !!process.env.BLUEDART_LOGIN,
          hasCustomerCode: !!process.env.BLUEDART_CUSTOMER_CODE,
          hasPassword: !!process.env.BLUEDART_PASSWORD
        },
        apiUrl: process.env.BLUEDART_API_URL || 'Not configured',
        status: 'Available for domestic India orders',
        type: 'domestic'
      },
      dhl: {
        name: 'DHL Express',
        configured: !!(
          process.env.DHL_API_KEY &&
          process.env.DHL_API_SECRET
        ),
        credentials: {
          hasApiKey: !!process.env.DHL_API_KEY,
          hasApiSecret: !!process.env.DHL_API_SECRET
        },
        apiUrl: process.env.DHL_API_BASE_URL || 'https://api-eu.dhl.com',
        status: 'Available for international orders',
        type: 'international'
      }
    };

    // Get current configuration
    const currentConfig = CourierConfig.getCurrentConfig();

    // Get recent orders statistics
    const recentOrders = await Order.countDocuments({
      createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
    });

    const ordersWithTracking = await Order.countDocuments({
      'tracking.trackingNumber': { $exists: true, $ne: null },
      createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
    });

    res.status(200).json({
      status: "success",
      data: {
        courierStatus,
        configuration: currentConfig,
        statistics: {
          recentOrders,
          ordersWithTracking,
          trackingRate: recentOrders ? Math.round((ordersWithTracking / recentOrders) * 100) : 0
        },
        recommendations: generateRecommendations(courierStatus)
      }
    });

  } catch (error) {
    console.error('Error getting courier status:', error);
    res.status(500).json({
      status: "error",
      message: error.message
    });
  }
};

/**
 * Test courier service connectivity
 */
exports.testCourierServices = async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        status: "fail",
        message: "Access denied. Admin only."
      });
    }

    const testResults = {};

    // Test BlueDart
    try {
      const blueDartService = require('../services/blueDartService');
      const blueDartHealth = await blueDartService.checkAPIHealth();
      testResults.bluedart = {
        name: 'BlueDart',
        status: blueDartHealth ? 'healthy' : 'unhealthy',
        message: blueDartHealth ? 'Service is operational' : 'Service unavailable or credentials invalid',
        configured: !!(process.env.BLUEDART_LICENSE_KEY && process.env.BLUEDART_LOGIN)
      };
    } catch (error) {
      testResults.bluedart = {
        name: 'BlueDart',
        status: 'error',
        message: error.message,
        configured: false
      };
    }

    // Test DHL
    try {
      const dhlService = require('../services/dhlTrackingService');
      const dhlHealth = await dhlService.checkAPIHealth();
      testResults.dhl = {
        name: 'DHL',
        status: dhlHealth ? 'healthy' : 'unhealthy',
        message: dhlHealth ? 'Service is operational' : 'Service unavailable or credentials invalid',
        configured: !!(process.env.DHL_API_KEY && process.env.DHL_API_SECRET)
      };
    } catch (error) {
      testResults.dhl = {
        name: 'DHL',
        status: 'error',
        message: error.message,
        configured: false
      };
    }

    res.status(200).json({
      status: "success",
      data: {
        testResults,
        summary: {
          totalServices: Object.keys(testResults).length,
          healthyServices: Object.values(testResults).filter(s => s.status === 'healthy').length,
          configuredServices: Object.values(testResults).filter(s => s.configured).length
        },
        timestamp: new Date()
      }
    });

  } catch (error) {
    console.error('Error testing courier services:', error);
    res.status(500).json({
      status: "error",
      message: error.message
    });
  }
};

/**
 * Generate recommendations for courier configuration
 */
function generateRecommendations(courierStatus) {
  const recommendations = [];

  if (!courierStatus.bluedart.configured) {
    recommendations.push({
      type: 'warning',
      service: 'BlueDart',
      message: 'BlueDart credentials not configured. Domestic India orders may have limited tracking.',
      action: 'Configure BLUEDART_LICENSE_KEY, BLUEDART_LOGIN, and BLUEDART_CUSTOMER_CODE in environment variables.'
    });
  }

  if (!courierStatus.dhl.configured) {
    recommendations.push({
      type: 'error',
      service: 'DHL',
      message: 'DHL credentials not configured. International tracking will not work.',
      action: 'Configure DHL_API_KEY and DHL_API_SECRET in environment variables.'
    });
  }

  if (!courierStatus.bluedart.configured && !courierStatus.dhl.configured) {
    recommendations.push({
      type: 'critical',
      service: 'System',
      message: 'No courier services are properly configured. All tracking will use fallback mode.',
      action: 'Configure at least one courier service to enable real-time tracking.'
    });
  }

  if (courierStatus.bluedart.configured && courierStatus.dhl.configured) {
    recommendations.push({
      type: 'success',
      service: 'System',
      message: 'All courier services are configured. Full tracking capabilities available.',
      action: 'System is optimally configured.'
    });
  }

  return recommendations;
}