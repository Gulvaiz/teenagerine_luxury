const Product = require("../models/product.model");
const FilterBuilder = require("../utils/productFilter/filterBuilder");
const SortBuilder = require("../utils/productFilter/sortBuilder");
const { validateFilterParameters } = require("../utils/productFilter/validationUtils");
const {
  sanitizeRequestBody,
  validateProductFilterRequest,
  convertStringArrays
} = require("../utils/productFilter/requestValidator");

/**
 * Enhanced Sales Products Filter API
 * Uses the same FilterBuilder infrastructure as the main product filter
 * Ensures consistent filtering behavior across all product pages
 */
exports.getSaleProductsEnhanced = async (req, res) => {
  const startTime = Date.now();

  try {
    // Step 1: Validate request structure
    const requestValidation = validateProductFilterRequest(req);

    if (!requestValidation.isValid) {
      return res.status(400).json({
        success: false,
        status: "error",
        message: 'Invalid request parameters',
        errors: requestValidation.errors,
        warnings: requestValidation.warnings,
        timestamp: new Date().toISOString()
      });
    }

    // Log warnings if any
    if (requestValidation.warnings.length > 0) {
      console.warn('⚠️ Sales Filter Warnings:', requestValidation.warnings);
    }

    // Step 2: Sanitize and merge request data (support both GET and POST)
    let rawParams = { ...req.query };

    if (req.body && typeof req.body === 'object') {
      rawParams = { ...rawParams, ...req.body };
    }

    // Step 3: Sanitize the combined parameters
    const sanitizedParams = sanitizeRequestBody(rawParams);

    // Step 4: Convert string arrays (for query parameters sent as comma-separated)
    const convertedParams = convertStringArrays(sanitizedParams);

    // Step 5: Validate and normalize parameters
    const params = validateFilterParameters(convertedParams);

    console.log('🔍 ENHANCED SALE PRODUCTS API REQUEST:', {
      categories: params.categories,
      brands: params.brands,
      conditions: params.conditions,
      colors: params.colors,
      sizes: params.sizes,
      minPrice: params.minPrice,
      maxPrice: params.maxPrice,
      page: params.page,
      limit: params.limit,
      sort: params.sort,
      search: params.search
    });

    // Step 6: Detect gender from categories (men/women are both categories and gender values)
    // Also separate gender categories from product categories
    let detectedGender = null;
    let productCategories = params.categories || [];

    if (params.categories && Array.isArray(params.categories)) {
      const genderKeywords = ['men', 'women', 'unisex', 'kids'];

      // Find gender categories
      const genderCategories = params.categories.filter(cat =>
        genderKeywords.includes(cat.toLowerCase())
      );

      if (genderCategories.length > 0) {
        // If user filters by "men" or "women" category, also filter by gender field
        detectedGender = genderCategories[0].toLowerCase();
        console.log(`🎯 Detected gender from category: ${detectedGender}`);

        // Remove gender categories from product categories
        // Only pass actual product categories (bags, footwear, etc.) to FilterBuilder
        productCategories = params.categories.filter(cat =>
          !genderKeywords.includes(cat.toLowerCase())
        );
        console.log(`📦 Product categories (without gender): ${productCategories.join(', ')}`);
      }
    }

    // Step 7: Build filters using FilterBuilder
    // Pass modified params with gender removed from categories
    const filterBuilder = new FilterBuilder();
    const modifiedParams = {
      ...params,
      categories: productCategories  // Only product categories, not gender
    };
    const filterResult = await filterBuilder.buildAllFilters(modifiedParams);
    const filterQuery = filterResult.query || filterResult;
    const filterDebug = filterResult.debug || {};

    // Step 8: Add mandatory SALE filters to the query
    // Override or add sale-specific conditions
    filterQuery.status = true; // Only active products
    filterQuery.isSale = true; // Only sale products

    // Add gender filter if detected from categories
    if (detectedGender) {
      filterQuery.gender = detectedGender;
      console.log(`✅ Applied gender filter: ${detectedGender}`);
    }

    // Ensure salePrice exists and is valid
    if (!filterQuery.$and) {
      filterQuery.$and = [];
    }

    filterQuery.$and.push({
      salePrice: { $exists: true, $ne: null, $gt: 0 }
    });

    // Step 9: Handle price filtering for sale products
    // For sale products, we want to filter by salePrice, not regular price
    if (params.minPrice || params.maxPrice) {
      // Remove regular price filter if it exists
      delete filterQuery.price;

      // Add salePrice filter
      const salePriceFilter = {};
      if (params.minPrice && params.minPrice > 0) {
        salePriceFilter.$gte = params.minPrice;
      }
      if (params.maxPrice && params.maxPrice < 2500000) {
        salePriceFilter.$lte = params.maxPrice;
      }

      if (Object.keys(salePriceFilter).length > 0) {
        filterQuery.salePrice = salePriceFilter;
      }
    }

    // Step 10: Build sort query
    const sortBuilder = new SortBuilder();
    let sortQuery = sortBuilder.buildSortQuery(params.sort);

    // Handle discount-based sorting (specific to sales)
    const isDiscountSort = params.sort === 'discount_asc' || params.sort === 'discount_desc';

    // For discount sorting, we'll need to fetch all results and sort in-memory
    // For other sorts, use position as default secondary sort
    if (!isDiscountSort) {
      sortQuery = { position: -1, ...sortQuery };
    }

    console.log('📊 Final MongoDB Query:', JSON.stringify(filterQuery, null, 2));
    console.log('🔄 Sort Query:', sortQuery);

    // Step 11: Calculate pagination
    const page = params.page || 1;
    const limit = params.limit || 12;
    const skip = (page - 1) * limit;

    // Step 12: Execute query
    let products = await Product.find(filterQuery)
      .populate("categories.categoryId", "name slug description")
      .populate("brands.brandId", "name slug description image")
      .populate("primaryCategory", "name slug description")
      .populate("primaryBrand", "name slug description image")
      .sort(isDiscountSort ? { position: -1 } : sortQuery) // Use position for discount sort initially
      .skip(isDiscountSort ? 0 : skip) // Don't skip if discount sorting
      .limit(isDiscountSort ? 0 : limit) // No limit if discount sorting
      .lean();

    // Step 13: Calculate discount for all products
    products = products.map(product => {
      const price = product.price || 0;
      const salePrice = product.salePrice || 0;
      const discountAmount = price > salePrice ? price - salePrice : 0;
      const discountPercentage = price > 0 ? Math.round((discountAmount / price) * 100) : 0;

      return {
        ...product,
        discountPercentage,
        discountAmount
      };
    });

    // Step 14: Sort by discount if requested
    if (isDiscountSort) {
      products.sort((a, b) => {
        const discountA = a.discountAmount || 0;
        const discountB = b.discountAmount || 0;
        return params.sort === 'discount_desc'
          ? discountB - discountA
          : discountA - discountB;
      });

      // Apply pagination after sorting
      const startIndex = skip;
      const endIndex = skip + limit;
      products = products.slice(startIndex, endIndex);
    }

    // Step 15: Get total count
    const total = await Product.countDocuments(filterQuery);
    const totalPages = Math.ceil(total / limit);

    // Step 16: Calculate execution time
    const executionTime = Date.now() - startTime;

    // Step 17: Build response
    const response = {
      status: "success",
      success: true,
      results: products.length,
      total,
      page,
      limit,
      totalPages,
      data: {
        products
      },
      metadata: {
        salesOnly: true,
        executionTime: `${executionTime}ms`,
        appliedFilters: {
          categories: params.categories?.length || 0,
          brands: params.brands?.length || 0,
          conditions: params.conditions?.length || 0,
          colors: params.colors?.length || 0,
          sizes: params.sizes?.length || 0,
          priceRange: (params.minPrice || params.maxPrice) ? {
            min: params.minPrice || 0,
            max: params.maxPrice || 'unlimited'
          } : null,
          search: params.search || null,
          sort: params.sort || 'position_desc'
        },
        debug: filterDebug
      }
    };

    console.log(`✅ Sales filter completed in ${executionTime}ms - Found ${total} products, returning ${products.length}`);

    res.status(200).json(response);

  } catch (err) {
    console.error("❌ Error in getSaleProductsEnhanced:", err);
    res.status(500).json({
      status: "error",
      success: false,
      message: err.message,
      error: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
};

/**
 * Get filter options specifically for sale products
 * Returns available filter values based on current sale inventory
 */
exports.getSaleFilterOptions = async (req, res) => {
  try {
    const Category = require("../models/category.model");
    const Brand = require("../models/brand.model");

    // Base query for sale products only
    const saleQuery = {
      status: true,
      isSale: true,
      salePrice: { $exists: true, $ne: null, $gt: 0 }
    };

    // Get all sale products to extract unique values
    const saleProducts = await Product.find(saleQuery)
      .populate("categories.categoryId", "name slug")
      .populate("brands.brandId", "name slug")
      .lean();

    // Extract unique values
    const categoryIds = new Set();
    const brandIds = new Set();
    const conditions = new Set();
    const colors = new Set();
    const sizes = new Set();
    let minPrice = Infinity;
    let maxPrice = 0;

    saleProducts.forEach(product => {
      // Categories
      if (product.categories) {
        product.categories.forEach(cat => {
          if (cat.categoryId && cat.categoryId._id) {
            categoryIds.add(cat.categoryId._id.toString());
          }
        });
      }

      // Brands
      if (product.brands) {
        product.brands.forEach(brand => {
          if (brand.brandId && brand.brandId._id) {
            brandIds.add(brand.brandId._id.toString());
          }
        });
      }

      // Conditions
      if (product.condition) {
        conditions.add(product.condition);
      }

      // Colors
      if (product.colors) {
        product.colors.forEach(colorObj => {
          if (colorObj.color) {
            colors.add(colorObj.color);
          }
        });
      }

      // Sizes
      if (product.sizes) {
        product.sizes.forEach(sizeObj => {
          if (sizeObj.size) {
            sizes.add(sizeObj.size);
          }
        });
      }

      // Price range (based on salePrice)
      if (product.salePrice) {
        minPrice = Math.min(minPrice, product.salePrice);
        maxPrice = Math.max(maxPrice, product.salePrice);
      }
    });

    // Get category details
    const categories = await Category.find({
      _id: { $in: Array.from(categoryIds) }
    }).select("name slug").lean();

    // Get brand details
    const brands = await Brand.find({
      _id: { $in: Array.from(brandIds) }
    }).select("name slug image").lean();

    res.status(200).json({
      status: "success",
      data: {
        categories: categories.map(cat => ({
          _id: cat._id,
          name: cat.name,
          slug: cat.slug
        })),
        brands: brands.map(brand => ({
          _id: brand._id,
          name: brand.name,
          slug: brand.slug,
          image: brand.image
        })),
        conditions: Array.from(conditions).sort(),
        colors: Array.from(colors).sort(),
        sizes: Array.from(sizes).sort(),
        priceRange: {
          min: minPrice !== Infinity ? minPrice : 0,
          max: maxPrice || 0
        },
        totalSaleProducts: saleProducts.length
      }
    });

  } catch (err) {
    console.error("❌ Error in getSaleFilterOptions:", err);
    res.status(500).json({
      status: "error",
      message: err.message
    });
  }
};
