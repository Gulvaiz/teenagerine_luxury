const Product = require("../models/product.model");

// Import modular utilities
const { buildSearchQuery, buildSearchSuggestions } = require("../utils/productFilter/searchQueryBuilder");
const FilterBuilder = require("../utils/productFilter/filterBuilder");
const SortBuilder = require("../utils/productFilter/sortBuilder");
const { validateFilterParameters } = require("../utils/productFilter/validationUtils");
const {
  sanitizeRequestBody,
  validateProductFilterRequest,
  convertStringArrays
} = require("../utils/productFilter/requestValidator");

/**
 * Advanced Product Filter with modular architecture
 * Searches across all fields including categories, brands, and product data
 */
exports.ProductFilter = async (req, res) => {
  const startTime = Date.now();

  try {
    // Step 1: Validate request structure and handle malformed JSON
    const requestValidation = validateProductFilterRequest(req);

    if (!requestValidation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request parameters',
        errors: requestValidation.errors,
        warnings: requestValidation.warnings,
        timestamp: new Date().toISOString()
      });
    }
    // Log warnings if any
    if (requestValidation.warnings.length > 0) {
      console.warn('⚠️ ProductFilter Warnings:', requestValidation.warnings);
    }

    // Step 2: Sanitize and merge request data
    let rawParams = { ...req.query };

    // Safely handle request body (might be empty or malformed)
    try {
      if (req.body && typeof req.body === 'object') {
        rawParams = { ...rawParams, ...req.body };
      }
    } catch (bodyError) {
      console.warn('⚠️ Issue processing request body:', bodyError.message);
    }

    // Step 3: Sanitize the combined parameters
    const sanitizedParams = sanitizeRequestBody(rawParams);

    // Step 4: Convert string arrays (for query parameters sent as comma-separated)
    const convertedParams = convertStringArrays(sanitizedParams);

    // Step 5: Validate and normalize parameters
    const params = validateFilterParameters(convertedParams);



    // Initialize builders
    const filterBuilder = new FilterBuilder();
    const sortBuilder = new SortBuilder();

    // Build search query (comprehensive search across all fields)
    let searchQuery = {};
    if (params.search) {
      searchQuery = await buildSearchQuery(params.search);

    }

    // Build filters using FilterBuilder (handles async operations properly)
    const filterResult = await filterBuilder.buildAllFilters(params);
    const filterQuery = filterResult.query || filterResult; // Handle both old and new format
    const filterDebug = filterResult.debug || {};

    // Combine search and filter queries
    const finalQuery = Object.keys(searchQuery).length > 0
      ? { $and: [searchQuery, filterQuery] }
      : filterQuery;

    // Build sort query with position priority
    const userSortQuery = sortBuilder.buildSortQuery(params.sort, params.search);

    // Always prioritize position field (descending) first, then apply user sort
    const sortQuery = { position: -1, ...userSortQuery };

    // Build optimized aggregation pipeline

    const pipeline = [
      { $match: finalQuery },
      { $sort: sortQuery },
      { $skip: params.skip },
      { $limit: params.limit },
      {
        $lookup: {
          from: "categories",
          localField: "categories.categoryId",
          foreignField: "_id",
          as: "categoryDetails"
        }
      },
      {
        $lookup: {
          from: "brands",
          localField: "brands.brandId",
          foreignField: "_id",
          as: "brandDetails"
        }
      },
      {
        $lookup: {
          from: "categories",
          localField: "primaryCategory",
          foreignField: "_id",
          as: "primaryCategoryDetails"
        }
      },
      {
        $lookup: {
          from: "brands",
          localField: "primaryBrand",
          foreignField: "_id",
          as: "primaryBrandDetails"
        }
      },
      {
        $addFields: {
          primaryCategoryDetails: { $arrayElemAt: ["$primaryCategoryDetails", 0] },
          primaryBrandDetails: { $arrayElemAt: ["$primaryBrandDetails", 0] }
        }
      }
    ];
    // Execute queries in parallel
    const [products, total] = await Promise.all([
      Product.aggregate(pipeline),
      Product.countDocuments(finalQuery)
    ]);

    // Calculate pagination info
    const totalPages = Math.ceil(total / params.limit);
    const hasNextPage = params.page < totalPages;
    const hasPrevPage = params.page > 1;

    // Build search suggestions if search term provided
    let suggestions = {};
    if (params.search && params.search.length >= 2) {
      suggestions = await buildSearchSuggestions(params.search, 5);
    }

    const executionTime = Date.now() - startTime;

    // Enhanced response
    res.status(200).json({
      success: true,
      data: {
        products,
        pagination: {
          page: params.page,
          limit: params.limit,
          total,
          totalPages,
          hasNextPage,
          hasPrevPage,
        },
        filters: {
          applied: {
            search: params.search,
            gender: params.gender,
            categories: params.categories.length > 0 ? params.categories : null,
            brands: params.brands.length > 0 ? params.brands : null,
            colors: params.colors.length > 0 ? params.colors : null,
            sizes: params.sizes.length > 0 ? params.sizes : null,
            conditions: params.conditions.length > 0 ? params.conditions : null,
            priceRange: {
              minPrice: params.minPrice,
              maxPrice: params.maxPrice,
              preset: params.priceRange
            },
            advanced: {
              isSale: params.isSale,
              isNew: params.isNew,
              inStock: params.inStock,
              viewsRange: {
                minViews: params.minViews,
                maxViews: params.maxViews
              },
              dateRange: params.dateRange,
              tags: params.tags.length > 0 ? params.tags : null
            }
          },
          sort: params.sort,
          includeSoldOut: params.includeSoldOut
        },
        suggestions,
        metadata: {
          totalResults: total,
          resultsPerPage: params.limit,
          currentPage: params.page,
          totalPages,
          executionTimeMs: executionTime,
          queryOptimized: true,
          searchQuery: Object.keys(searchQuery).length > 0 ? searchQuery : null,
          appliedFilters: Object.keys(filterQuery).length

        }
      }
    });

  } catch (error) {
    console.error("🚨 ProductFilter Error:", {
      message: error.message,
      stack: error.stack,
      query: req.query,
      body: req.body,
      timestamp: new Date().toISOString()
    });

    const statusCode = error.name === 'ValidationError' ? 400 :
      error.name === 'CastError' ? 400 : 500;

    res.status(statusCode).json({
      success: false,
      message: statusCode === 400 ? "Invalid request parameters" : "Server Error",
      error: {
        type: error.name,
        message: error.message,
        ...(process.env.NODE_ENV === 'development' && {
          stack: error.stack,
          requestData: { query: req.query, body: req.body }
        })
      },
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Get available filter options for frontend
 */
exports.getFilterOptions = async (req, res) => {
  try {
    const sortBuilder = new SortBuilder();

    const filterOptions = {
      sortOptions: sortBuilder.getAvailableSortOptions(),
      sortCategories: sortBuilder.getSortCategories(),
      genderOptions: [
        { value: 'men', label: 'Men' },
        { value: 'women', label: 'Women' },
        { value: 'kids', label: 'Kids' },
        { value: 'unisex', label: 'Unisex' }
      ],
      // Fetch from DB
      conditionOptions: await Product.distinct('condition'),
      priceRanges: [
        { value: 'all', label: 'All Prices' },
        { value: 'under-25', label: 'Under $25' },
        { value: '25-50', label: '$25 - $50' },
        { value: '50-100', label: '$50 - $100' },
        { value: '100-200', label: '$100 - $200' },
        { value: 'over-200', label: 'Over $200' }
      ]
    };

    // Get unique colors via aggregation to handle array of objects
    const colorResults = await Product.aggregate([
      { $unwind: "$colors" },
      { $group: { _id: "$colors.color" } },
      { $sort: { _id: 1 } }
    ]);
    const colors = colorResults.map(c => ({ value: c._id, label: c._id }));

    // Get Brands
    const brandResults = await require('../models/brand.model').find({
      $or: [{ isActive: true }, { isActive: { $exists: false } }]
    }).select('name _id').sort({ name: 1 });
    const brands = brandResults.map(b => ({ value: b._id, label: b.name }));

    // Override with dynamic data
    filterOptions.colorOptions = colors;
    filterOptions.brandOptions = brands;

    // Normalize conditions
    filterOptions.conditionOptions = filterOptions.conditionOptions.map(c => ({ value: c, label: c }));

    res.status(200).json({
      success: true,
      data: filterOptions
    });

  } catch (error) {
    console.error("Error getting filter options:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get filter options",
      error: error.message
    });
  }
};

/**
 * Get search suggestions
 */
exports.getSearchSuggestions = async (req, res) => {
  try {
    const { q, limit = 5 } = req.query;

    if (!q || q.trim().length < 2) {
      return res.status(200).json({
        success: true,
        data: { suggestions: [] }
      });
    }

    const suggestions = await buildSearchSuggestions(q, parseInt(limit));

    res.status(200).json({
      success: true,
      data: suggestions
    });

  } catch (error) {
    console.error("Error getting search suggestions:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get search suggestions",
      error: error.message
    });
  }
};

/**
 * Debug endpoint to check filter parameter processing
 */
exports.debugFilterParams = async (req, res) => {
  try {
    const startTime = Date.now();

    // Step 1: Raw request data
    const rawQuery = { ...req.query };
    const rawBody = req.body ? { ...req.body } : {};

    // Step 2: Merged raw parameters
    let rawParams = { ...rawQuery, ...rawBody };

    // Step 3: Sanitize the combined parameters
    const sanitizedParams = sanitizeRequestBody(rawParams);

    // Step 4: Convert string arrays
    const convertedParams = convertStringArrays(sanitizedParams);

    // Step 5: Validate and normalize parameters
    const validatedParams = validateFilterParameters(convertedParams);

    // Step 6: Build actual filter query
    const filterBuilder = new FilterBuilder();
    const actualFilterQuery = await filterBuilder.buildAllFilters(validatedParams);

    const executionTime = Date.now() - startTime;

    res.status(200).json({
      success: true,
      debug: {
        step1_rawQuery: rawQuery,
        step2_rawBody: rawBody,
        step3_mergedRaw: rawParams,
        step4_sanitized: sanitizedParams,
        step5_converted: convertedParams,
        step6_validated: validatedParams,
        step7_actualMongoQuery: actualFilterQuery,
        executionTimeMs: executionTime,
        timestamp: new Date().toISOString(),

        // Special focus on gender handling
        genderHandling: {
          originalGender: rawParams.gender,
          sanitizedGender: sanitizedParams.gender,
          convertedGender: convertedParams.gender,
          validatedGender: validatedParams.gender,
          mongoGenderQuery: actualFilterQuery.gender || 'NO_GENDER_FILTER_APPLIED'
        }
      }
    });

  } catch (error) {
    console.error("🚨 Debug Filter Params Error:", error);
    res.status(500).json({
      success: false,
      message: "Debug endpoint failed",
      error: error.message
    });
  }
};