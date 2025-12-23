const Coupon = require("../models/coupon.model");
const Order = require("../models/order.model");
const Category = require("../models/category.model");

// Create a new coupon
exports.createCoupon = async (req, res) => {
  try {
    const coupon = await Coupon.create(req.body);
    res.status(201).json({
      status: "success",
      data: { coupon },
    });
  } catch (error) {
    res.status(400).json({
      status: "fail",
      message: error.message,
    });
  }
};

// Get all coupons (admin)
exports.getAllCoupons = async (req, res) => {
  try {
    const { page = 1, limit = 10, sort = "-createdAt" } = req.query;
    const skip = (page - 1) * limit;

    const coupons = await Coupon.find()
      .populate('applicableCategories', 'name')
      .populate('applicableProducts', 'name slug')
      .sort(sort)
      .skip(skip)
      .limit(Number(limit));

    const total = await Coupon.countDocuments();

    res.status(200).json({
      status: "success",
      results: coupons.length,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / limit),
      data: { coupons },
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
};

// Get coupon by ID
exports.getCouponById = async (req, res) => {
  try {
    const coupon = await Coupon.findById(req.params.id)
      .populate('applicableCategories', 'name')
      .populate('applicableProducts', 'name slug');
    if (!coupon) {
      return res.status(404).json({
        status: "fail",
        message: "Coupon not found",
      });
    }

    res.status(200).json({
      status: "success",
      data: { coupon },
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
};

// Update coupon
exports.updateCoupon = async (req, res) => {
  try {
    const coupon = await Coupon.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!coupon) {
      return res.status(404).json({
        status: "fail",
        message: "Coupon not found",
      });
    }

    res.status(200).json({
      status: "success",
      data: { coupon },
    });
  } catch (error) {
    res.status(400).json({
      status: "fail",
      message: error.message,
    });
  }
};

// Delete coupon
exports.deleteCoupon = async (req, res) => {
  try {
    const coupon = await Coupon.findByIdAndDelete(req.params.id);

    if (!coupon) {
      return res.status(404).json({
        status: "fail",
        message: "Coupon not found",
      });
    }

    res.status(204).json({
      status: "success",
      data: null,
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
};

// Validate coupon
exports.validateCoupon = async (req, res) => {
  try {
    const { code, cartTotal, products, userId } = req.body;
    if (!code) {
      return res.status(400).json({
        status: "fail",
        message: "Coupon code is required",
      });
    }

    // Find the coupon
    const coupon = await Coupon.findOne({
      code: code.toUpperCase(),
      isActive: true,
    }).populate('applicableCategories', 'name');

    if (!coupon) {
      return res.status(404).json({
        status: "fail",
        message: "Invalid coupon code",
      });
    }

    // Check if coupon is expired
    const now = new Date();
    if (now > coupon.endDate || now < coupon.startDate) {
      return res.status(400).json({
        status: "fail",
        message: "Coupon has expired or not yet active",
      });
    }

    // Check usage limit
    if (coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit) {
      return res.status(400).json({
        status: "fail",
        message: "Coupon usage limit reached",
      });
    }

    // Check minimum order value
    if (cartTotal < coupon.minOrderValue) {
      return res.status(400).json({
        status: "fail",
        message: `Minimum order value of ₹${coupon.minOrderValue} required`,
      });
    }

    // Check if first-time user only
    if (coupon.firstTimeOnly && userId) {
      // Check if user has any previous COMPLETED orders (not pending/cancelled)
      const previousOrders = await Order.countDocuments({
        user: userId,
        status: { $in: ['Delivered', 'Shipped', 'Processing', 'Confirmed'] }
      });
      if (previousOrders > 0) {
        return res.status(400).json({
          status: "fail",
          message: "This coupon is for first-time customers only",
        });
      }
    }

    // Check if user has already used this coupon
    if (userId && coupon.userUsage && coupon.userUsage.length > 0) {
      const userUsage = coupon.userUsage.find(
        (usage) => usage.userId && usage.userId.toString() === userId.toString()
      );

      if (userUsage) {
        return res.status(400).json({
          status: "fail",
          message: "You have already used this coupon",
        });
      }
    }

    // Check product/category restrictions if applicable
    if (
      (coupon.applicableProducts && coupon.applicableProducts.length > 0) ||
      (coupon.applicableCategories && coupon.applicableCategories.length > 0)
    ) {
      let isApplicable = false;

      // If we have product IDs in the request
      if (products && products.length > 0) {
        // Fetch full product details from database to get all categories
        const Product = require('../models/product.model');
        const productIds = products.map(p => p.productId);
        const fullProducts = await Product.find({ _id: { $in: productIds } })
          .populate('primaryCategory', 'name')
          .populate('categories.categoryId', 'name')
          .select('_id primaryCategory categories')
          .lean();

        // console.log('Full Products with categories:', JSON.stringify(fullProducts, null, 2));

        // Get applicable category names from coupon (already populated) - convert to lowercase for comparison
        const applicableCategoryNames = coupon.applicableCategories
          ? coupon.applicableCategories.map(cat => cat.name.toLowerCase())
          : [];

        // console.log('Applicable category names from coupon:', applicableCategoryNames);

        for (const product of products) {
          // Check if product is directly applicable
          if (
            coupon.applicableProducts &&
            coupon.applicableProducts.some(
              (id) => id.toString() === product.productId.toString()
            )
          ) {
            isApplicable = true;
            break;
          }

          // Check if product's category is applicable by NAME (case-insensitive)
          // Get full product data from database
          const fullProduct = fullProducts.find(p => p._id.toString() === product.productId.toString());

          if (fullProduct && applicableCategoryNames.length > 0) {
            // Check primary category by name (case-insensitive)
            if (fullProduct.primaryCategory && fullProduct.primaryCategory.name) {
              //console.log('Checking primary category:', fullProduct.primaryCategory.name);
              if (applicableCategoryNames.includes(fullProduct.primaryCategory.name.toLowerCase())) {
                //console.log('✓ Primary category matched!');
                isApplicable = true;
                break;
              }
            }

            // Check all categories in the categories array by name (case-insensitive)
            if (fullProduct.categories && Array.isArray(fullProduct.categories)) {
              for (const cat of fullProduct.categories) {
                const categoryName = cat.categoryId?.name;
                //console.log('Checking category:', categoryName);
                if (categoryName && applicableCategoryNames.includes(categoryName.toLowerCase())) {
                  //console.log('✓ Category matched!');
                  isApplicable = true;
                  break;
                }
              }
              if (isApplicable) break;
            }
          }
        }

        if (!isApplicable) {
          return res.status(400).json({
            status: "fail",
            message: "Coupon not applicable to items in your cart",
          });
        }
      }
    }

    // Calculate discount
    let discount = 0;
    if (coupon.type === "percentage") {
      discount = (cartTotal * coupon.value) / 100;
      // Apply max discount if set
      if (coupon.maxDiscount && discount > coupon.maxDiscount) {
        discount = coupon.maxDiscount;
      }
    } else {
      // Fixed amount discount
      discount = coupon.value;
      // Ensure discount doesn't exceed cart total
      if (discount > cartTotal) {
        discount = cartTotal;
      }
    }

    res.status(200).json({
      status: "success",
      data: {
        coupon,
        discount: parseFloat(discount.toFixed(2)),
        finalTotal: parseFloat((cartTotal - discount).toFixed(2)),
      },
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
};

// Apply coupon to order
exports.applyCoupon = async (req, res) => {
  try {
    const { code, orderId } = req.body;
    const userId = req.user._id;

    // Find the coupon
    const coupon = await Coupon.findOne({
      code: code.toUpperCase(),
      isActive: true,
    });
  //console.log(coupon);
    if (!coupon) {
      return res.status(404).json({
        status: "fail",
        message: "Invalid coupon code",
      });
    }

    // Find the order
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({
        status: "fail",
        message: "Order not found",
      });
    }

    // Update coupon usage
    coupon.usedCount += 1;
    
    // Add to user usage
    coupon.userUsage.push({
      userId,
      usedCount: 1,
      lastUsed: new Date(),
    });

    await coupon.save();

    res.status(200).json({
      status: "success",
      message: "Coupon applied successfully",
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
};

// Get categories for coupon creation
exports.getCategoriesForCoupon = async (req, res) => {
  try {
    // Define valid category names with gender mapping
    const categoryGenderMap = {
      // Women-specific categories
      'Tote bags': 'women',
      'Shoulder Bags': 'women',
      'Clutches': 'women',
      'Sling bags': 'women',
      'Mini bags': 'women',
      'Hand Bags': 'women',
      'Satchels': 'women',
      'Crossbody Bags': 'women',
      'Wristlet': 'women',
      'Flats': 'women',
      'Peeptoes': 'women',
      'Heels': 'women',
      'Dresses & Gowns': 'women',
      'Skirts & Shirts': 'women',
      'Jumpsuits': 'women',
      'Co-Ord Sets Womens': 'women',
      'Swim Suit': 'women',
      'Shawls & Scarves': 'women',
      'Earrings': 'women',
      'Rings': 'women',
      'Charm & Bracelets': 'women',
      'Necklace': 'women',

      // Men-specific categories
      'Espadrilles': 'men',
      'Loafers & Moccasins': 'men',
      'Sliders & Slippers': 'men',
      'Shirts': 'men',
      'Track Suits': 'men',
      'T Shirts': 'men',
      'Shorts': 'men',
      'Caps': 'men',

      // Unisex/Both categories
      'Bags': 'all',
      'Footwear': 'all',
      'Boots': 'all',
      'Espadrilles & Loafers': 'all',
      'Sneakers': 'all',
      'Slippers': 'all',
      'Trainers': 'all',
      'Sandals': 'all',
      'Clothing': 'all',
      'Trousers & Denims': 'all',
      'Jackets & Outerwear': 'all',
      'Accessories': 'all',
      'Belts': 'all',
      'Watches': 'all',
      'Sunglasses': 'all',
      'Scarves': 'all',
      'Never Been Used': 'all'
    };

    const validCategoryNames = Object.keys(categoryGenderMap);

    const categories = await Category.find({
      status: true,
      name: { $in: validCategoryNames }
    })
      .select('name _id')
      .sort('name')
      .lean();

    // Add gender information to each category
    const categoriesWithGender = categories.map(category => ({
      ...category,
      gender: categoryGenderMap[category.name] || 'all'
    }));

    res.status(200).json({
      status: "success",
      data: { categories: categoriesWithGender },
    });
  } catch (error) {
    console.error('Error fetching categories for coupon:', error);
    res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
};

// Get products for coupon creation
exports.getProductsForCoupon = async (req, res) => {
  try {
    const Product = require("../models/product.model");
    
    const { page = 1, limit = 50, search = '' } = req.query;
    const skip = (page - 1) * limit;
    
    // Build search query
    let query = {};
    if (search) {
      query = {
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { slug: { $regex: search, $options: 'i' } }
        ]
      };
    }

    const products = await Product.find(query)
      .select('name slug _id images')
      .sort('name')
      .skip(skip)
      .limit(Number(limit));

    const total = await Product.countDocuments(query);

    res.status(200).json({
      status: "success",
      data: { 
        products,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          totalPages: Math.ceil(total / limit)
        }
      },
    });
  } catch (error) {
    console.error('Error fetching products for coupon:', error);
    res.status(500).json({
      status: "error",
      message: error.message,
    });
  }
};