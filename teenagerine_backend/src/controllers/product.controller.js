const brandModel = require("../models/brand.model");
const categoryModel = require("../models/category.model");
const Product = require("../models/product.model");
const mongoose = require("mongoose");
const CategoryAI = require("../utils/categoryAI");
const FilterCleaner = require("../utils/filterCleaner");
const CategoryMapper = require("../utils/categoryMapper");
const fs = require("fs");
const path = require("path");
const {
  detectGenderFromQuery,
  parseGenderCategory,
  findBaseCategoryMatches,
  getTotalWithGenderFiltering,
  applyStrictGenderFilter,
} = require("../utils/productFinderHelper");
const {
  generateUniqueSku,
  extractColorFromDescription,
  extractSizeFromDescription,
  getColorHex,
  cleanDescription,
  extractDimensions,
  generateUniqueSlug,
  defaultUser,
  generateProductSku,
} = require("../utils/productSeedHelper");
const { CategoriesProcess } = require("../utils/CategoriesProcess");
const { BrandProcess } = require("../utils/BrandProccess");
const { GenderProcess } = require("../utils/GendorProccess");
const Logger = require("../utils/logger.helper");



exports.createProduct = async (req, res) => {
  try {
    // Process categories and brands arrays if provided
    const productData = { ...req.body, post_by: req.user._id };

    // FIX: Force backend generation of SKU to avoid incorrect/duplicate SKUs from frontend
    delete productData.sku;

    // FIX: Ensure slug exists
    if (!productData.slug && productData.name) {
      // Import generateUniqueSlug if not already imported or use the one from utils
      const { generateUniqueSlug } = require("../utils/productSeedHelper");
      productData.slug = await generateUniqueSlug(productData.name);
    }

    // Handle multiple categories
    if (req.body.categories && Array.isArray(req.body.categories)) {
      productData.categories = req.body.categories.map((cat) => ({
        categoryId: cat.categoryId || cat,
        isPrimary: cat.isPrimary || false,
      }));

      // Set primary category from the first primary or first category
      const primaryCat =
        productData.categories.find((cat) => cat.isPrimary) ||
        productData.categories[0];
      if (primaryCat) {
        productData.primaryCategory = primaryCat.categoryId;
      }
    } else if (req.body.category) {
      // Backward compatibility: single category
      productData.categories = [
        { categoryId: req.body.category, isPrimary: true },
      ];
      productData.primaryCategory = req.body.category;
    }

    // Handle multiple brands
    if (req.body.brands && Array.isArray(req.body.brands)) {
      productData.brands = req.body.brands.map((brand) => ({
        brandId: brand.brandId || brand,
        isPrimary: brand.isPrimary || false,
      }));

      // Set primary brand from the first primary or first brand
      const primaryBrand =
        productData.brands.find((brand) => brand.isPrimary) ||
        productData.brands[0];
      if (primaryBrand) {
        productData.primaryBrand = primaryBrand.brandId;
      }
    } else if (req.body.brand) {
      // Backward compatibility: single brand
      productData.brands = [{ brandId: req.body.brand, isPrimary: true }];
      productData.primaryBrand = req.body.brand;
    }

    // Handle combo products
    if (req.body.comboProductIds && Array.isArray(req.body.comboProductIds)) {
      // Validate minimum combo products requirement
      if (req.body.comboProductIds.length > 0 && req.body.comboProductIds.length < 4) {
        return res.status(400).json({
          status: "fail",
          message: "Minimum 4 combo products required"
        });
      }

      // Verify all combo products exist and are active
      if (req.body.comboProductIds.length > 0) {
        const existingProducts = await Product.find({
          _id: { $in: req.body.comboProductIds },
          status: true
        });

        if (existingProducts.length !== req.body.comboProductIds.length) {
          return res.status(400).json({
            status: "fail",
            message: "One or more combo products not found or inactive"
          });
        }
      }

      productData.comboProducts = req.body.comboProductIds;
    } else if (req.body.comboProducts && Array.isArray(req.body.comboProducts)) {
      // Handle case where frontend sends full objects (extract IDs)
      const comboProductIds = req.body.comboProducts
        .map(p => typeof p === 'object' ? p._id : p)
        .filter(Boolean);

      if (comboProductIds.length > 0 && comboProductIds.length < 4) {
        return res.status(400).json({
          status: "fail",
          message: "Minimum 4 combo products required"
        });
      }

      if (comboProductIds.length > 0) {
        const existingProducts = await Product.find({
          _id: { $in: comboProductIds },
          status: true
        });

        if (existingProducts.length !== comboProductIds.length) {
          return res.status(400).json({
            status: "fail",
            message: "One or more combo products not found or inactive"
          });
        }
      }

      productData.comboProducts = comboProductIds;
    }

    // Auto-increment position
    const highestPositionProduct = await Product.findOne().sort({ position: -1 }).select('position');
    const nextPosition = highestPositionProduct ? (highestPositionProduct.position + 1) : 1;
    productData.position = nextPosition;

    const newProduct = await Product.create(productData);

    if (!newProduct) {
      throw Error("Product not created");
    }

    // Auto-select combo products if none were manually selected
    if (!productData.comboProducts || productData.comboProducts.length === 0) {
      try {
        const autoComboProducts = await autoSelectComboProducts(newProduct._id, 4);
        if (autoComboProducts.length >= 4) {
          newProduct.comboProducts = autoComboProducts.map(p => p._id);
          await newProduct.save();
          // console.log(`Auto-selected ${autoComboProducts.length} combo products for product: ${newProduct.name}`);
        }
      } catch (error) {
        console.error('Error auto-selecting combo products:', error);
        // Continue without auto combo products - not a critical error
      }
    }

    // Populate combo products for response
    await newProduct.populate({
      path: 'comboProducts',
      select: 'name slug image price salePrice primaryBrand primaryCategory',
      populate: [
        { path: 'primaryBrand', select: 'name' },
        { path: 'primaryCategory', select: 'name' }
      ]
    });

    res.status(201).json({
      status: "success",
      data: {
        product: {
          id: newProduct._id,
          name: newProduct.name,
          price: newProduct.price,
          description: newProduct.description,
          comboProducts: newProduct.comboProducts || []
        },
      },
    });
  } catch (err) {
    console.log(err);
    await Logger.error({
      message: "Failed to create Product",
      error: err.message,
      req,
      severity: "high",
    })
    res.status(500).json({ status: "fail", message: err.message });
  }
};

// Enhanced category processing for AI-organized categories
const processAICategoriesFilter = async (categoryParam) => {
  try {
    const categoryMapper = new CategoryMapper();
    await categoryMapper.updateMappingFromDatabase(categoryModel, CategoryAI);

    const categoryNames = categoryParam.split(",").map((cat) => cat.trim());

    // Check if these are AI-organized categories  
    const isAICategories = categoryNames.some(name => {
      const hasHyphen = name.includes('-');
      const startsWithGender = ['men', 'women', 'kids', 'accessories'].some(gender =>
        name.toLowerCase().startsWith(gender)
      );

      return hasHyphen && startsWithGender;
    });

    if (!isAICategories) {
      return null;
    }

    const categoryFilter = categoryMapper.createAdvancedCategoryFilter(categoryNames, categoryModel);

    if (categoryFilter.dbCategories.length === 0) {
      return {
        isEmpty: true,
        message: "No products found for selected categories"
      };
    }

    // Return the MongoDB query directly instead of trying to find categories first
    return {
      mongoQuery: categoryFilter.mongoQuery,
      genderFilter: categoryFilter.genderFilters[0],
      dbCategories: categoryFilter.dbCategories,
      debug: categoryFilter.debug
    };

  } catch (error) {
    console.error('❌ Error in AI category processing:', error);
    await Logger.error({
      message: "Failed to process AI category",
      error: error.message,
      req,
      severity: "medium",
    })
    return null;
  }
};

exports.getAllProducts = async (req, res) => {

  try {
    const {
      keyword,
      category,
      categories,
      brand,
      brands,
      condition,
      conditions,
      colors,
      sizes,
      includeSoldOut,
      minPrice,
      maxPrice,
      status,
      sort = "position_asc",
      page = 1,
      limit = 2000,
    } = req.query;

    let query = {};
    let detectedGender = null;
    let baseCategoryFound = false;

    // ===============================
    // STEP 1: PROCESS CATEGORIES WITH TWO-STEP APPROACH
    // ===============================
    const categoryParam = categories || category;
    if (categoryParam) {
      // Try AI category processing first
      const aiCategoryResult = await processAICategoriesFilter(categoryParam);

      if (aiCategoryResult) {
        if (aiCategoryResult.isEmpty) {
          return res.status(200).json({
            status: "success",
            results: 0,

            total: 0,
            page: Number(page),
            totalPages: 0,
            data: { products: [] },
            message: aiCategoryResult.message,
            metadata: { aiCategoryProcessing: true }
          });
        }

        // Apply AI category filtering using MongoDB query
        if (aiCategoryResult.mongoQuery && Object.keys(aiCategoryResult.mongoQuery).length > 0) {
          // Merge the AI-generated query with existing query
          if (aiCategoryResult.mongoQuery.$and) {
            if (!query.$and) query.$and = [];
            query.$and.push(...aiCategoryResult.mongoQuery.$and);
          } else {
            Object.assign(query, aiCategoryResult.mongoQuery);
          }
          baseCategoryFound = true;

          // Add gender filtering
          if (aiCategoryResult.genderFilter) {
            detectedGender = aiCategoryResult.genderFilter;
          }

        }
      } else {
        // Fallback to legacy category processing
        const categoryNames = categoryParam.split(",").map((cat) => cat.trim());


        const allCategoryIds = [];

        for (const categoryName of categoryNames) {
          // Parse gender and base category (e.g., "men-bags" → "men" + "bags")
          const { baseCategory, gender } = parseGenderCategory(categoryName);

          if (gender && !detectedGender) {
            detectedGender = gender;
          }

          // Find all categories matching the base category
          const baseCategoryIds = await findBaseCategoryMatches(baseCategory);

          if (baseCategoryIds.length > 0) {
            baseCategoryFound = true;
            allCategoryIds.push(...baseCategoryIds);
          } else {
            console.log(`❌ No categories found for base "${baseCategory}"`);
          }
        }

        // Apply legacy category filter if categories found
        if (baseCategoryFound && allCategoryIds.length > 0) {
          query["categories.categoryId"] = { $in: [...new Set(allCategoryIds)] };

        }
      }

      // If NO base categories found, return empty result
      if (!baseCategoryFound) {
        console.log(
          `❌ No base categories found for: ${categoryNames.join(", ")}`
        );
        return res.status(200).json({
          status: "success",
          results: 0,
          total: 0,
          page: Number(page),
          totalPages: 0,
          data: { products: [] },
          metadata: {
            appliedFilters: {
              genderDetected: detectedGender,
              baseCategoryFound: false,
              message: `No categories found matching: ${categoryNames.join(
                ", "
              )}`,
            },
          },
        });
      }

      // Category filter application is now handled above in AI/legacy processing
    }

    // ===============================
    // STEP 2: APPLY OTHER FILTERS
    // ===============================

    // Keyword search
    if (keyword) {
      if (!detectedGender) {
        detectedGender = detectGenderFromQuery(keyword);
        console.log(
          `🎯 Gender detected from keyword "${keyword}": ${detectedGender}`
        );
      }

      query.$or = [
        { name: { $regex: keyword, $options: "i" } },
        { description: { $regex: keyword, $options: "i" } },
        { tags: { $in: [new RegExp(keyword, "i")] } },
      ];
    }

    // Brand filtering
    const brandParam = brands || brand;
    if (brandParam) {
      const brandNames = brandParam.split(",").map((brand) => brand.trim());
      const brandDocs = await brandModel.find({
        name: { $in: brandNames.map((name) => new RegExp(name, "i")) },
      });

      if (brandDocs.length > 0) {
        const brandIds = brandDocs.map((brand) => brand._id);
        query["brands.brandId"] = { $in: brandIds };
      }
    }

    // Condition filtering (with label mapping)
    const conditionParam = conditions || condition;
    if (conditionParam) {
      // Map condition IDs to their labels
      const conditionLabelMap = {
        'newwithtags': 'New With Tags',
        'new with tags': 'New With Tags',
        'preowned': 'Pre-Owned',
        'pre-owned': 'Pre-Owned',
        'pre owned': 'Pre-Owned',
        'gently used': 'Gently Used',
        'gentlyused': 'Gently Used',
        'vintage': 'Vintage',
        'likenew': 'Like New',
        'like new': 'Like New'
      };

      const conditionValues = conditionParam
        .split(",")
        .map((cond) => {
          const trimmed = cond.trim();
          const lowerCase = trimmed.toLowerCase();
          // Return the mapped label if exists, otherwise use the original value
          return conditionLabelMap[lowerCase] || trimmed;
        });

      // Use case-insensitive regex for matching
      query.condition = {
        $in: conditionValues.map((cond) => new RegExp(`^${cond}$`, "i"))
      };
    }

    // Color filtering
    if (colors) {
      const colorValues = colors.split(",").map((color) => color.trim());
      query["colors.color"] = {
        $in: colorValues.map((color) => new RegExp(color, "i")),
      };
    }

    // Size filtering
    if (sizes) {
      const sizeValues = sizes.split(",").map((size) => size.trim());
      query["sizes.size"] = {
        $in: sizeValues.map((size) => new RegExp(size, "i")),
      };
    }

    // Sold out filtering
    if (includeSoldOut !== "true") {
      query.soldOut = { $ne: true };
      query.stockQuantity = { $gt: 0 };
    }

    // Price range filtering
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }

    // Status filtering - if status parameter provided, use it; otherwise show only active for non-admin routes
    if (status !== undefined) {
      query.status = status === 'true';
    } else {
      query.status = true; // Default: only active products
    }

    const skip = (Number(page) - 1) * Number(limit);
    const sortOptions = {
      price_asc: { price: 1 },
      price_desc: { price: -1 },
      name_asc: { name: 1 },
      name_desc: { name: -1 },
      created_asc: { createdAt: 1 },
      created_desc: { createdAt: -1 },
      position_asc: { position: 1 },
      position_desc: { position: -1 },
    };
    const sortBy = sortOptions[sort] || sortOptions["position_desc"];

    let products = await Product.find(query)
      .populate("categories.categoryId", "name slug description")
      .populate("brands.brandId", "name slug description image")
      .populate("primaryCategory", "name slug description")
      .populate("primaryBrand", "name slug description image")
      .sort(sortBy)
      .skip(skip)
      .limit(Number(limit))
      .lean();

    if (detectedGender && products.length > 0) {
      const beforeGenderFilter = products.length;
      products = await applyStrictGenderFilter(products, detectedGender);
      const afterGenderFilter = products.length;

      if (products.length === 0) {
        return res.status(200).json({
          status: "success",
          results: 0,
          total: 0,
          page: Number(page),
          totalPages: 0,
          data: { products: [] },
          metadata: {
            appliedFilters: {
              genderDetected: detectedGender,
              baseCategoryFound: true,
              genderFilterApplied: true,
              message: `No ${detectedGender}'s products found in the specified categories`,
              originalCategoryResults: beforeGenderFilter,
              genderFilteredResults: 0,
            },
          },
        });
      }
    }

    // Calculate total with same filtering logic
    let total;
    if (detectedGender && baseCategoryFound) {
      total = await getTotalWithGenderFiltering(query, detectedGender);
    } else {
      total = await Product.countDocuments(query);
    }

    // ===============================
    // RESPONSE WITH METADATA
    // ===============================
    const responseMetadata = {
      appliedFilters: {
        genderDetected: detectedGender,
        baseCategoryFound: baseCategoryFound,
        genderFilterApplied: !!detectedGender,
        categoryCount: query["categories.categoryId"]
          ? Array.isArray(query["categories.categoryId"].$in)
            ? query["categories.categoryId"].$in.length
            : 1
          : 0,
        filteringSteps: {
          step1_baseCategorySearch: baseCategoryFound,
          step2_genderDetection: !!detectedGender,
          step3_genderFiltering: !!(detectedGender && products.length >= 0),
          step4_finalResults: products.length,
        },
      },
    };




    res.status(200).json({
      status: "success",
      results: products.length,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / limit),
      data: { products },
      metadata: responseMetadata,
    });
  } catch (err) {
    console.error("❌ Error in getAllProducts:", err);
    await Logger.error(
      {
        message: "Get all products",
        error: err,
        req,
        severity: "medium"
      }
    )
    res.status(500).json({
      status: "error",
      message: err.message,
    });
  }
};

// Admin-specific endpoint - returns ALL products (active and inactive) without complex filtering
exports.getAllProductsForAdmin = async (req, res) => {
  try {
    const {
      keyword,
      category,
      brand,
      status,
      startsWith,
      sort = "createdAt",
      page = 1,
      limit = 50, // Default limit for admin
    } = req.query;

    let query = {};

    // Keyword search
    if (keyword) {
      query.$or = [
        { name: { $regex: keyword, $options: "i" } },
        { description: { $regex: keyword, $options: "i" } },
        { sku: { $regex: keyword, $options: "i" } },
      ];
    }

    // Alphabet filter - products starting with a specific letter
    if (startsWith) {
      query.name = { $regex: new RegExp(`^${startsWith}`, 'i') };
    }

    // Category filter
    if (category) {
      const categoryDoc = await Category.findOne({ name: { $regex: new RegExp(`^${category}$`, 'i') } });
      if (categoryDoc) {
        query["categories.categoryId"] = categoryDoc._id;
      }
    }

    // Brand filter
    if (brand) {
      const brandDoc = await Brand.findOne({ name: { $regex: new RegExp(`^${brand}$`, 'i') } });
      if (brandDoc) {
        query["brands.brandId"] = brandDoc._id;
      }
    }

    // Status filter - for admin, no default filter (show all)
    // Only apply if explicitly requested
    if (status !== undefined && status !== '') {
      query.status = status === 'true';
    }
    // If status is not provided, admin sees ALL products (both active and inactive)

    const skip = (Number(page) - 1) * Number(limit);

    const sortOptions = {
      price: { price: 1 },
      "-price": { price: -1 },
      name: { name: 1 },
      "-name": { name: -1 },
      createdAt: { createdAt: -1 },
      "-createdAt": { createdAt: 1 },
      updatedAt: { updatedAt: -1 },
      "-updatedAt": { updatedAt: 1 },
    };
    const sortBy = sortOptions[sort] || { createdAt: -1 };

    const products = await Product.find(query)
      .populate("categories.categoryId", "name slug")
      .populate("brands.brandId", "name slug image")
      .populate("primaryCategory", "name slug")
      .populate("primaryBrand", "name slug image")
      .sort(sortBy)
      .skip(skip)
      .limit(Number(limit))
      .lean();

    const total = await Product.countDocuments(query);



    res.status(200).json({
      status: "success",
      results: products.length,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / Number(limit)),
      data: { products },
    });
  } catch (err) {
    console.error("❌ Error in getAllProductsForAdmin:", err);
    await Logger.error({
      message: "Get all products for admin",
      error: err,
      req,
      severity: "medium"
    });
    res.status(500).json({
      status: "error",
      message: err.message,
    });
  }
};

exports.getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate("categories.categoryId", "name slug description")
      .populate("brands.brandId", "name slug description image")
      .populate("primaryCategory", "name slug description")
      .populate("primaryBrand", "name slug description image")
      .populate("post_by", "name email")
      .populate({
        path: 'comboProducts',
        select: 'name slug image price salePrice primaryBrand primaryCategory rating reviews',
        match: { status: true }, // Only populate active combo products
        populate: [
          { path: 'primaryBrand', select: 'name' },
          { path: 'primaryCategory', select: 'name' }
        ]
      });

    if (!product) {
      return res
        .status(404)
        .json({ status: "fail", message: "Product not found" });
    }

    // Ensure minimum combo products for display (always show at least 4)
    const enhancedComboProducts = await ensureMinimumComboProducts(product, 4);

    // Update the product object with enhanced combo products
    const productWithCombo = product.toObject();
    productWithCombo.comboProducts = enhancedComboProducts;

    res.status(200).json({
      status: "success",
      data: {
        product: productWithCombo,
      },
    });
  } catch (err) {
    await Logger.error(
      {
        message: "Get product by id",
        error: err,
        req,
        severity: "medium"
      }
    )
    res.status(500).json({ status: "error", message: err.message });
  }
};

exports.updateProduct = async (req, res) => {
  try {


    const updates = { ...req.body, post_by: req.user._id };


    // Handle categories update
    if (req.body.categories && Array.isArray(req.body.categories)) {
      updates.categories = req.body.categories.map((cat) => ({
        categoryId: cat.categoryId || cat,
        isPrimary: cat.isPrimary || false,
      }));

      const primaryCat =
        updates.categories.find((cat) => cat.isPrimary) ||
        updates.categories[0];
      if (primaryCat) {
        updates.primaryCategory = primaryCat.categoryId;
      }
    }

    // Handle brands update
    if (req.body.brands && Array.isArray(req.body.brands)) {
      updates.brands = req.body.brands.map((brand) => ({
        brandId: brand.brandId || brand,
        isPrimary: brand.isPrimary || false,
      }));

      const primaryBrand =
        updates.brands.find((brand) => brand.isPrimary) || updates.brands[0];
      if (primaryBrand) {
        updates.primaryBrand = primaryBrand.brandId;
      }
    }

    // Handle combo products update
    if (req.body.comboProductIds && Array.isArray(req.body.comboProductIds)) {
      // Validate minimum combo products requirement
      if (req.body.comboProductIds.length > 0 && req.body.comboProductIds.length < 4) {
        return res.status(400).json({
          status: "fail",
          message: "Minimum 4 combo products required"
        });
      }

      // Prevent self-reference
      if (req.body.comboProductIds.includes(req.params.id)) {
        return res.status(400).json({
          status: "fail",
          message: "A product cannot be its own combo product"
        });
      }

      // Verify all combo products exist and are active
      if (req.body.comboProductIds.length > 0) {
        const existingProducts = await Product.find({
          _id: { $in: req.body.comboProductIds },
          status: true
        });

        if (existingProducts.length !== req.body.comboProductIds.length) {
          return res.status(400).json({
            status: "fail",
            message: "One or more combo products not found or inactive"
          });
        }
      }

      updates.comboProducts = req.body.comboProductIds;
    } else if (req.body.comboProducts && Array.isArray(req.body.comboProducts)) {
      // Handle case where frontend sends full objects (extract IDs)
      const comboProductIds = req.body.comboProducts
        .map(p => typeof p === 'object' ? p._id : p)
        .filter(Boolean);

      if (comboProductIds.length > 0 && comboProductIds.length < 4) {
        return res.status(400).json({
          status: "fail",
          message: "Minimum 4 combo products required"
        });
      }

      // Prevent self-reference
      if (comboProductIds.includes(req.params.id)) {
        return res.status(400).json({
          status: "fail",
          message: "A product cannot be its own combo product"
        });
      }

      if (comboProductIds.length > 0) {
        const existingProducts = await Product.find({
          _id: { $in: comboProductIds },
          status: true
        });

        if (existingProducts.length !== comboProductIds.length) {
          return res.status(400).json({
            status: "fail",
            message: "One or more combo products not found or inactive"
          });
        }
      }

      updates.comboProducts = comboProductIds;
    }

    const product = await Product.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    })
      .populate("categories.categoryId", "name slug description")
      .populate("brands.brandId", "name slug description image")
      .populate("primaryCategory", "name slug description")
      .populate("primaryBrand", "name slug description image");

    if (!product) {
      return res
        .status(404)
        .json({ status: "fail", message: "Product not found" });
    }

    // console.log('Product after update - stockQuantity:', product.stockQuantity);
    // console.log('Product after update - inventory:', product.inventory);

    // Auto-select combo products if none were manually selected and none exist
    if ((!updates.comboProducts || updates.comboProducts.length === 0) && (!product.comboProducts || product.comboProducts.length === 0)) {
      try {
        const autoComboProducts = await autoSelectComboProducts(product._id, 4);
        if (autoComboProducts.length >= 4) {
          product.comboProducts = autoComboProducts.map(p => p._id);
          await product.save();
          // console.log(`Auto-selected ${autoComboProducts.length} combo products for updated product: ${product.name}`);
        }
      } catch (error) {
        console.error('Error auto-selecting combo products during update:', error);
        // Continue without auto combo products - not a critical error
      }
    }

    // Populate combo products for response
    await product.populate({
      path: 'comboProducts',
      select: 'name slug image price salePrice primaryBrand primaryCategory',
      populate: [
        { path: 'primaryBrand', select: 'name' },
        { path: 'primaryCategory', select: 'name' }
      ]
    });

    res.status(200).json({
      status: "success",
      data: { product },
    });
  } catch (err) {
    console.error(err);
    await Logger.error(
      {
        message: "Update product",
        error: err,
        req,
        severity: "high"
      }
    )
    res.status(400).json({ status: "fail", message: err.message });
  }
};

exports.deleteProduct = async (req, res) => {
  try {
    if (!req.params.id) {
      res.status(404).json("Product id required");
    }
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) {
      return res
        .status(404)
        .json({ status: "fail", message: "Product not found" });
    }
    res.status(204).json({
      status: "success",
      data: null,
    });
  } catch (err) {
    await Logger.error({
      message: "Delete product",
      error: err,
      req,
      severity: "high"
    })
    res.status(500).json({ status: "error", message: err.message });
  }
};

exports.getProductBySlug = async (req, res) => {
  try {
    const product = await Product.findOne({ slug: req.params.slug })
      .populate("categories.categoryId", "name slug description")
      .populate("brands.brandId", "name slug description image")
      .populate("primaryCategory", "name slug description")
      .populate("primaryBrand", "name slug description image")
      .populate({
        path: 'comboProducts',
        select: 'name slug image price salePrice primaryBrand primaryCategory rating reviews',
        match: { status: true },
        populate: [
          { path: 'primaryBrand', select: 'name' },
          { path: 'primaryCategory', select: 'name' }
        ]
      });

    if (!product) {
      return res
        .status(404)
        .json({ status: "fail", message: "Product not found" });
    }

    // Ensure minimum combo products for display (always show at least 4)
    const enhancedComboProducts = await ensureMinimumComboProducts(product, 10);

    // Update the product object with enhanced combo products
    const productWithCombo = product.toObject();
    productWithCombo.comboProducts = enhancedComboProducts;

    res.status(200).json({
      status: "success",
      data: { product: productWithCombo },
    });
  } catch (err) {
    console.log(err);
    await Logger.error({
      message: "Get product by slug",
      error: err,
      req,
      severity: "medium"
    })
    res.status(500).json({ status: "error", message: err.message });
  }
};

exports.searchProducts = async (req, res) => {
  try {
    const { query, limit = 50 } = req.query;
    if (!query) {
      return res.status(400).json({ message: "Search query is required" });
    }

    const cleanQuery = query.trim();
    const limitNumber = parseInt(limit) || 50;

    // Find matching brands - UPDATED for new schema
    const regex = new RegExp(cleanQuery, "i");
    const matchingBrands = await brandModel.find({ name: regex }).select("_id");
    const brandIds = matchingBrands.map((brand) => brand._id);

    // Find matching categories
    const matchingCategories = await categoryModel
      .find({ name: regex })
      .select("_id");
    const categoryIds = matchingCategories.map((cat) => cat._id);

    // Use MongoDB text search for multi-word queries
    // Text search splits the query into words and searches across indexed fields
    const textSearchQuery = {
      $text: {
        $search: cleanQuery,
        $caseSensitive: false
      },
      status: true
    };

    // First try text search (best for multi-word queries like "louis bags")
    let products = await Product.find(textSearchQuery)
      .select("name slug price salePrice retailPrice image images description brand category condition stockQuantity colors size tags isFeatured isSale status scheduledVisibility stock isSoldOut")
      .sort({ score: { $meta: "textScore" } }) // Sort by relevance
      .limit(limitNumber);

    // If text search returns no results, fall back to regex + brand/category search
    if (products.length === 0) {
      products = await Product.find({
        $or: [
          { name: regex },
          { description: regex },
          { tags: { $in: [regex] } },
          { "brands.brandId": { $in: brandIds } },
          { "categories.categoryId": { $in: categoryIds } },
        ],
        status: true,
      })
        .select("name slug price salePrice retailPrice image images description brand category condition stockQuantity colors size tags isFeatured isSale status scheduledVisibility stock isSoldOut")
        .limit(limitNumber);
    }

    res.status(200).json(products);
  } catch (error) {
    console.error("Error searching products:", error);
    await Logger.error({
      message: "Search products",
      error: error,
      req,
      severity: "medium"
    })
    res.status(500).json({ message: "Server error" });
  }
};


exports.updateProductStock = async (req, res) => {
  try {
    const { updates } = req.body;

    if (!updates || !Array.isArray(updates)) {
      return res.status(400).json({
        status: "fail",
        message: "Invalid request format. Expected an array of updates.",
      });
    }

    const results = [];
    const errors = [];

    for (const update of updates) {
      const { productId, quantity, size, color } = update;

      if (!productId || typeof quantity !== "number") {
        errors.push({ productId, error: "Invalid product ID or quantity" });
        continue;
      }

      try {
        const product = await Product.findById(productId);

        if (!product) {
          errors.push({ productId, error: "Product not found" });
          continue;
        }

        let updateQuery = {};
        let newStockQuantity;

        // Handle size-specific stock updates
        if (size && product.sizes.length > 0) {
          const sizeIndex = product.sizes.findIndex((s) => s.size === size);
          if (sizeIndex !== -1) {
            newStockQuantity = Math.max(
              0,
              product.sizes[sizeIndex].stockQuantity - quantity
            );
            updateQuery[`sizes.${sizeIndex}.stockQuantity`] = newStockQuantity;
          } else {
            errors.push({ productId, error: `Size "${size}" not found` });
            continue;
          }
        }
        // Handle color-specific stock updates
        else if (color && product.colors.length > 0) {
          const colorIndex = product.colors.findIndex((c) => c.color === color);
          if (colorIndex !== -1) {
            newStockQuantity = Math.max(
              0,
              product.colors[colorIndex].stockQuantity - quantity
            );
            updateQuery[`colors.${colorIndex}.stockQuantity`] =
              newStockQuantity;
          } else {
            errors.push({ productId, error: `Color "${color}" not found` });
            continue;
          }
        }
        // Handle general stock update
        else {
          newStockQuantity = Math.max(0, product.stockQuantity - quantity);
          updateQuery.stockQuantity = newStockQuantity;
          updateQuery.soldOut = newStockQuantity === 0;
        }

        const updatedProduct = await Product.findByIdAndUpdate(
          productId,
          updateQuery,
          { new: true }
        );

        results.push({
          productId,
          previousStock: size
            ? product.sizes.find((s) => s.size === size)?.stockQuantity
            : color
              ? product.colors.find((c) => c.color === color)?.stockQuantity
              : product.stockQuantity,
          newStock: newStockQuantity,
          soldOut: updatedProduct.soldOut,
          size: size || null,
          color: color || null,
        });
      } catch (err) {
        errors.push({ productId, error: err.message });
      }
    }

    res.status(200).json({
      status: "success",
      results,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (err) {
    console.error("Error updating product stock:", err);
    await Logger.error({
      message: "Update product stock",
      error: err,
      req,
      severity: "high"
    })
    res.status(500).json({ status: "error", message: err.message });
  }
};

// NEW: Get products by multiple categories
exports.getProductsByCategories = async (req, res) => {
  try {
    let { category, subCategory } = req.params;
    const {
      keyword,
      brands,
      conditions,
      colors,
      sizes,
      includeSoldOut,
      minPrice = 0,
      maxPrice = 100000,
      sort = "position_asc",
      page = 1,
      limit = 2000,
    } = req.query;
    // console.log("Query 🙌")
    // console.log(req.query);

    if (!category) {
      return res.status(400).json({
        status: "fail",
        message: "Category name is required",
      });
    }
    // console.log('🔍 Backend Category Debug:', {
    //   rawParams: req.params,
    //   originalCategory: category,
    //   originalSubCategory: subCategory
    // });

    // Decode URL encoding (for spaces, %20, etc.) and normalize
    category = decodeURIComponent(category).trim();
    if (subCategory) {
      subCategory = decodeURIComponent(subCategory).trim();
    }

    // console.log('🔍 Processed Category:', {
    //   processedCategory: category,
    //   processedSubCategory: subCategory
    // });

    const categoryRegex = new RegExp(`^${category}$`, "i");
    const subCategoryRegex = subCategory
      ? new RegExp(`^${subCategory}$`, "i")
      : null;

    // Find main category - try multiple matching strategies
    let matchedCategories = await categoryModel.find({ name: categoryRegex });

    // If exact match fails, try slug-based match
    if (matchedCategories.length === 0) {
      // console.log('🔍 Exact match failed, trying slug-based match...');
      const categorySlug = category.toLowerCase().replace(/\s+/g, '-');
      matchedCategories = await categoryModel.find({
        slug: { $regex: `^${categorySlug}$`, $options: "i" }
      });
    }

    // If slug match fails, try converting slug to spaced format and match name
    if (matchedCategories.length === 0 && category.includes('-')) {
      // console.log('🔍 Slug match failed, trying spaced name match...');
      const spacedCategory = category.replace(/-/g, ' ');
      matchedCategories = await categoryModel.find({
        name: { $regex: `^${spacedCategory}$`, $options: "i" }
      });
    }

    // If still no match, try partial/contains match
    if (matchedCategories.length === 0) {
      // console.log('🔍 Name match failed, trying partial match...');
      const searchTerm = category.replace(/-/g, ' ');
      matchedCategories = await categoryModel.find({
        name: { $regex: searchTerm, $options: "i" }
      });
    }

    // If still no match, try matching individual words
    if (matchedCategories.length === 0) {
      // console.log('🔍 Partial match failed, trying word-based match...');
      const categoryWords = category.replace(/-/g, ' ').split(' ').filter(word => word.length > 2);
      if (categoryWords.length > 0) {
        const wordRegex = categoryWords.map(word => `(?=.*\\b${word})`).join('');
        matchedCategories = await categoryModel.find({
          name: { $regex: wordRegex, $options: "i" }
        });
      }
    }

    // console.log('🔍 Category Match Results:', {
    //   searchPattern: categoryRegex.source,
    //   matchedCount: matchedCategories.length,
    //   matchedCategories: matchedCategories.map(c => ({ _id: c._id, name: c.name }))
    // });

    if (!matchedCategories.length) {
      // Let's also check what categories exist in the database for debugging
      const allCategories = await categoryModel.find({}).select('name').limit(10);
      // console.log('🔍 Available categories (sample):', allCategories.map(c => c.name));

      return res.status(404).json({
        status: "fail",
        message: "No matching category found",
        debug: {
          searchedFor: category,
          availableCategories: allCategories.map(c => c.name)
        }
      });
    }

    // Find subcategory if provided
    let validCategoryIds;
    if (subCategoryRegex) {
      const matchedSubCategories = await categoryModel.find({
        name: subCategoryRegex,
      });
      validCategoryIds = matchedSubCategories.map((c) => c._id);
    } else {
      validCategoryIds = matchedCategories.map((c) => c._id);
    }

    const filter = {
      "categories.categoryId": { $in: validCategoryIds },
      status: true, // Only active products
    };

    // Keyword search with multiple fields
    if (keyword) {
      filter.$or = [
        { name: { $regex: keyword, $options: "i" } },
        { description: { $regex: keyword, $options: "i" } },
        { tags: { $in: [new RegExp(keyword, "i")] } },
      ];
    }

    // Brand filtering
    if (brands) {
      const brandNames = brands.split(",").map((brand) => brand.trim());
      const brandDocs = await brandModel.find({
        name: { $in: brandNames.map((name) => new RegExp(name, "i")) },
      });

      if (brandDocs.length > 0) {
        const brandIds = brandDocs.map((brand) => brand._id);
        filter["brands.brandId"] = { $in: brandIds };
      }
    }

    // Condition filtering (case-insensitive)
    if (conditions) {
      const conditionValues = conditions.split(",").map((cond) => cond.trim());
      filter.condition = {
        $in: conditionValues.map((cond) => new RegExp(`^${cond}$`, "i"))
      };
    }

    // Color filtering
    if (colors) {
      const colorValues = colors.split(",").map((color) => color.trim());
      filter["colors.color"] = {
        $in: colorValues.map((color) => new RegExp(color, "i")),
      };
    }

    // Size filtering
    if (sizes) {
      const sizeValues = sizes.split(",").map((size) => size.trim());
      filter["sizes.size"] = {
        $in: sizeValues.map((size) => new RegExp(size, "i")),
      };
    }

    // Sold out filtering
    if (includeSoldOut !== "true") {
      filter.soldOut = { $ne: true };
      filter.stockQuantity = { $gt: 0 };
    }

    // Price range filtering
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number(minPrice);
      if (maxPrice) filter.price.$lte = Number(maxPrice);
    }

    const pageNumber = parseInt(page) || 1;
    const limitNumber = parseInt(limit) || 10;

    // Sort options - same as getAllProducts
    const sortOptions = {
      price_asc: { price: 1 },
      price_desc: { price: -1 },
      name_asc: { name: 1 },
      name_desc: { name: -1 },
      created_asc: { createdAt: 1 },
      created_desc: { createdAt: -1 },
      position_asc: { position: 1 },
      position_desc: { position: -1 },
    };
    const sortBy = sortOptions[sort] || sortOptions["position_desc"];

    const totalCount = await Product.countDocuments(filter);
    const products = await Product.find(filter)
      .populate("categories.categoryId", "name slug description")
      .populate("brands.brandId", "name slug description image")
      .populate("primaryCategory", "name slug description")
      .populate("primaryBrand", "name slug description image")
      .sort(sortBy)
      .skip((pageNumber - 1) * limitNumber)
      .limit(limitNumber);

    res.status(200).json({
      status: "success",
      results: products.length,
      total: totalCount, // Changed from totalCount to total for consistency
      page: pageNumber,
      totalPages: Math.ceil(totalCount / limitNumber),
      data: { products },
    });
  } catch (err) {
    await Logger.error({
      message: "Get products by category",
      error: err,
      req,
      severity: "high"
    });
    res.status(500).json({ status: "error", message: err.message });
  }
};

exports.getProductsByBrands = async (req, res) => {
  try {
    let { brandName } = req.params;

    const {
      keyword,
      categories,
      conditions,
      colors,
      sizes,
      includeSoldOut,
      minPrice = 0,
      maxPrice = 100000,
      sort = "position_asc",
      page = 1,
      limit = 2000,
    } = req.query;

    if (!brandName) {
      return res.status(400).json({
        status: "fail",
        message: "Brand name is required",
      });
    }

    // Decode URL encoding (for spaces, %20, etc.) and normalize
    brandName = decodeURIComponent(brandName).trim();

    // Convert hyphens back to spaces for matching brand names
    // e.g., "ray-ban" -> "ray ban" to match "Ray-Ban" or "Ray Ban" in database
    const brandNameForMatching = brandName.replace(/-/g, ' ');

    const brandRegex = new RegExp(`^${brandNameForMatching.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, "i");

    // Find matching brand
    const matchedBrands = await brandModel.find({ name: brandRegex });
    if (!matchedBrands.length) {
      return res.status(404).json({
        status: "fail",
        message: "No matching brand found",
      });
    }

    const validBrandIds = matchedBrands.map((b) => b._id);

    const filter = {
      "brands.brandId": { $in: validBrandIds },
      status: true, // Only active products
    };

    // Apply additional filters
    if (categories) {
      const categoryNames = categories.split(",").map((cat) => cat.trim());
      const matchedCategories = await categoryModel.find({
        name: { $in: categoryNames.map((name) => new RegExp(name, "i")) },
      });

      if (matchedCategories.length > 0) {
        const categoryIds = matchedCategories.map((cat) => cat._id);
        filter["categories.categoryId"] = { $in: categoryIds };
      }
    }

    // Condition filtering (case-insensitive)
    if (conditions) {
      const conditionValues = conditions.split(",").map((cond) => cond.trim());
      filter.condition = {
        $in: conditionValues.map((cond) => new RegExp(`^${cond}$`, "i"))
      };
    }

    // Color filtering
    if (colors) {
      const colorValues = colors.split(",").map((color) => color.trim());
      filter["colors.color"] = {
        $in: colorValues.map((color) => new RegExp(color, "i")),
      };
    }

    // Size filtering
    if (sizes) {
      const sizeValues = sizes.split(",").map((size) => size.trim());
      filter["sizes.size"] = {
        $in: sizeValues.map((size) => new RegExp(size, "i")),
      };
    }

    // Sold out filtering
    if (includeSoldOut !== "true") {
      filter.soldOut = { $ne: true };
      filter.stockQuantity = { $gt: 0 };
    }

    // Keyword search
    if (keyword) {
      filter.$or = [
        { name: { $regex: keyword, $options: "i" } },
        { description: { $regex: keyword, $options: "i" } },
        { tags: { $in: [new RegExp(keyword, "i")] } },
      ];
    }

    // Price range filtering
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number(minPrice);
      if (maxPrice) filter.price.$lte = Number(maxPrice);
    }

    const pageNumber = parseInt(page) || 1;
    const limitNumber = parseInt(limit) || 10;

    // Sort options
    const sortOptions = {
      price_asc: { price: 1 },
      price_desc: { price: -1 },
      name_asc: { name: 1 },
      name_desc: { name: -1 },
      created_asc: { createdAt: 1 },
      created_desc: { createdAt: -1 },
      position_asc: { position: 1 },
      position_desc: { position: -1 },
    };
    const sortBy = sortOptions[sort] || sortOptions["position_desc"];

    const totalCount = await Product.countDocuments(filter);
    const products = await Product.find(filter)
      .populate("categories.categoryId", "name slug description")
      .populate("brands.brandId", "name slug description image")
      .populate("primaryCategory", "name slug description")
      .populate("primaryBrand", "name slug description image")
      .sort(sortBy)
      .skip((pageNumber - 1) * limitNumber)
      .limit(limitNumber);

    res.status(200).json({
      status: "success",
      results: products.length,
      total: totalCount,
      page: pageNumber,
      totalPages: Math.ceil(totalCount / limitNumber),
      data: { products },
    });
  } catch (err) {
    console.error("Error in getProductsByBrands:", err);
    await Logger.error({
      message: "Get products by brand",
      error: err,
      req,
      severity: "high"
    });
    res.status(500).json({ status: "error", message: err.message });
  }
};

exports.seedProducts = async (req, res) => {
  const userId = await defaultUser();
  const importedProducts = [];
  const errors = [];

  try {
    // Optional: Uncomment to clear existing products
    await Product.deleteMany({});
    console.log("🗑️ All existing products deleted.");

    // Cache to avoid duplicate DB lookups
    const categoryCache = {};
    const brandCache = {};

    for (let index = 0; index < oldProducts.length; index++) {
      const old = oldProducts[index];

      try {
        console.log(
          `\n🔄 Processing ${index + 1}/${oldProducts.length}: ${old.Name} (Sync time: ${old["Meta: _wc_gla_synced_at"] ? new Date(old["Meta: _wc_gla_synced_at"] * 1000).toISOString() : 'N/A'})`
        );

        // Skip if product name is missing
        if (!old.Name || old.Name.trim() === "") {
          console.log(`⏭️ Skipping product due to missing name.`);
          errors.push({
            productId: old.ID,
            name: old.Name || "Unknown",
            error: "Missing product name",
          });
          continue;
        }

        // ===============================
        // CATEGORIES PROCESSING
        // ===============================
        const categoriesStr = old.Categories;
        const categoriesResult = await CategoriesProcess(categoriesStr);

        let primaryCategoryId = categoriesResult.primaryCategoryId;
        let processedCategoryIds = categoriesResult.categoryIds || [];

        // Format categories for product model
        const categoryIds = processedCategoryIds.map((catId, index) => ({
          categoryId: catId,
          isPrimary: catId.toString() === primaryCategoryId?.toString()
        }));

        // If no categories found, create a default one
        if (categoryIds.length === 0) {
          let defaultCategory = categoryCache["Uncategorized"];
          if (!defaultCategory) {
            let category = await categoryModel.findOne({
              name: "Uncategorized",
            });
            if (!category) {
              category = await categoryModel.create({
                name: "Uncategorized",
                description: "Default category for uncategorized products",
                slug: "uncategorized",
                post_by: userId,
              });
            }
            defaultCategory = category._id;
            categoryCache["Uncategorized"] = defaultCategory;
          }

          categoryIds.push({
            categoryId: defaultCategory,
            isPrimary: true,
          });
          primaryCategoryId = defaultCategory;
        }

        // ===============================
        // BRANDS PROCESSING
        // ===============================
        const brandsData = old.Brands;
        const brandIds = [];
        let primaryBrandId = null;

        if (brandsData && Array.isArray(brandsData)) {
          // Filter out empty strings and process brands
          const validBrands = brandsData.filter(
            (brand) => brand && brand.trim() !== ""
          );

          for (let i = 0; i < validBrands.length; i++) {
            const brandName = validBrands[i].trim();

            if (brandName !== "") {
              // Use our BrandProcess function
              let brandId = brandCache[brandName];

              if (!brandId) {
                brandId = await BrandProcess(brandName);
                if (brandId) {
                  brandCache[brandName] = brandId;
                  console.log(`🏷️ Processed brand: ${brandName}`);
                }
              }

              if (brandId) {
                // Add to brands array
                brandIds.push({
                  brandId: brandId,
                  isPrimary: i === 0, // First brand is primary
                });

                if (i === 0) {
                  primaryBrandId = brandId;
                }
              }
            }
          }
        }

        // If no brands found, create a default one
        if (brandIds.length === 0) {
          let defaultBrand = brandCache["No Brand"];
          if (!defaultBrand) {
            defaultBrand = await BrandProcess("No Brand");
            if (defaultBrand) {
              brandCache["No Brand"] = defaultBrand;
              console.log(`🏷️ Created default brand: No Brand`);
            }
          }

          if (defaultBrand) {
            brandIds.push({
              brandId: defaultBrand,
              isPrimary: true,
            });
            primaryBrandId = defaultBrand;
          }
        }

        // ===============================
        // SIZES PROCESSING
        // ===============================
        const sizes = [];
        const sizeFromAttribute1 =
          old["Attribute 1 name"] === "SIZE"
            ? old["Attribute 1 value(s)"]
            : null;
        const sizeFromAttribute2 =
          old["Attribute 2 name"] === "SIZE"
            ? old["Attribute 2 value(s)"]
            : null;
        const sizeFromDescription =
          old.Description && old.Description.toLowerCase().includes("size")
            ? extractSizeFromDescription(old.Description)
            : null;

        const detectedSize =
          sizeFromAttribute1 ||
          sizeFromAttribute2 ||
          sizeFromDescription ||
          "One Size";

        sizes.push({
          size: detectedSize,
          stockQuantity: old.Stock
            ? parseInt(old.Stock)
            : old["In stock?"]
              ? 1
              : 0,
          price: parseFloat(old["Regular price"]) || 0,
          sku: old.SKU ? `${old.SKU}-${detectedSize}` : undefined,
        });

        // ===============================
        // COLORS PROCESSING
        // ===============================
        const colors = [];
        const colorFromAttribute1 =
          old["Attribute 1 name"] === "COLOR"
            ? old["Attribute 1 value(s)"]
            : null;
        const colorFromAttribute2 =
          old["Attribute 2 name"] === "COLOR"
            ? old["Attribute 2 value(s)"]
            : null;
        const colorFromDescription = extractColorFromDescription(
          old.Description
        );

        const detectedColor =
          colorFromAttribute1 ||
          colorFromAttribute2 ||
          colorFromDescription ||
          "Default";

        colors.push({
          color: detectedColor,
          stockQuantity: old.Stock
            ? parseInt(old.Stock)
            : old["In stock?"]
              ? 1
              : 0,
          hexCode: getColorHex(detectedColor),
        });

        // ===============================
        // GENDER PROCESSING
        // ===============================
        // Use our GenderProcess function to detect gender
        const genderData = old.Gender || old.gender || ''; // Check if there's a gender field in the data
        const detectedGender = await GenderProcess(
          genderData,
          old.Name || '',
          old.Categories || '' // Pass categories as the primary source for gender detection
        );

        console.log(`👤 Detected gender for "${old.Name}" from categories "${old.Categories}": ${detectedGender}`);

        // ===============================
        // PRODUCT CREATION
        // ===============================
        let productSlug = old.Name.toLowerCase()
          .replace(/[^a-z0-9\s-]/g, "")
          .replace(/\s+/g, "-")
          .replace(/-+/g, "-")
          .trim("-");

        // Handle duplicate slugs
        productSlug = await generateUniqueSlug(productSlug);

        // Handle images
        const imageUrls = old.Images
          ? old.Images.split(",")
            .map((img) => img.trim())
            .filter((img) => img !== "")
          : [];

        // Extract dimensions from description
        const dimensions = extractDimensions(old.Description);
        let productSku;

        // Handle SKU - ensure it's unique even if duplicates exist in source data
        if (old.SKU && old.SKU.trim() !== "") {
          // Check if this exact SKU already exists in database
          const existingProduct = await Product.findOne({ sku: old.SKU.trim() });
          if (existingProduct) {
            // SKU collision - generate a unique SKU by appending index
            productSku = `${old.SKU.trim()}-${index}`;
            console.log(`⚠️ SKU collision detected. Using: ${productSku}`);
          } else {
            productSku = old.SKU.trim();
          }
        } else {
          // Generate new SKU using the new format (already includes counter)
          productSku = await generateProductSku({
            categories: old.Categories,
            brands: old.Brands
          });
        }

        // Set createdAt based on reverse index to maintain order
        // Higher index (products added later) get newer timestamps
        const baseTime = new Date('2024-01-01').getTime();
        const createdAtDate = new Date(baseTime + (index * 1000)); // Add 1 second per product

        // If product has sync timestamp, use it instead
        if (old["Meta: _wc_gla_synced_at"]) {
          const syncDate = new Date(old["Meta: _wc_gla_synced_at"] * 1000);
          createdAtDate.setTime(syncDate.getTime());
          console.log(`📅 Using sync timestamp as createdAt: ${createdAtDate.toISOString()}`);
        }

        const productData = {
          name: old.Name.trim(),
          description:
            cleanDescription(old.Description) || "No description provided",
          retailPrice:
            parseFloat(old["Meta: _custom_product_text_field"]) ||
            parseFloat(old["Regular price"]) ||
            0,
          price: parseFloat(old["Regular price"]) || 0,
          salePrice: old["Sale price"]
            ? parseFloat(old["Sale price"])
            : undefined,

          // Multiple categories and brands support
          categories: categoryIds,
          primaryCategory: primaryCategoryId,
          brands: brandIds,
          primaryBrand: primaryBrandId,

          image: imageUrls[0] || "./default.jpg",
          images: imageUrls,
          stockQuantity: old.Stock
            ? parseInt(old.Stock)
            : old["In stock?"]
              ? 1
              : 0,
          sku: productSku,
          sizes: sizes,
          colors: colors,
          status: !!old.Published,
          tags: old.Tags
            ? old.Tags.split(",")
              .map((t) => t.trim())
              .filter((t) => t !== "")
            : [],
          isFeatured: !!old["Is featured?"],
          slug: productSlug,
          soldOut: !old["In stock?"],
          isSale: !!old["Sale price"],
          views: parseInt(old["Meta: post_views_count"]) || 0,
          position: parseInt(old.ID) || 0,
          gender: detectedGender,
          seo: {
            metaTitle: old.Name,
            metaDescription: old["Short description"] || old.Name,
            keywords: old.Tags ? old.Tags.split(",").map((t) => t.trim()) : [],
          },
          inventory: {
            trackQuantity: true,
            allowBackorders: !!old["Backorders allowed?"],
            lowStockThreshold: parseInt(old["Low stock amount"]) || 5,
          },
          shipping: {
            weight: parseFloat(old["Weight (kg)"]) || 0,
            dimensions: dimensions,
          },

          post_by: userId,
          createdAt: createdAtDate,
          updatedAt: createdAtDate,
        };
        console.log("Position was" + old["ID"]);
        console.log("And Position was" + old.ID);
        // Use insertOne with error handling for duplicates
        try {
          const product = new Product(productData);
          await product.save();

          console.log(
            `✅ Successfully imported: ${product.name} (slug: ${product.slug})`
          );
          importedProducts.push({
            id: product._id,
            name: product.name,
            sku: product.sku,
            slug: product.slug,
            categories: categoryIds.length,
            brands: brandIds.length,
          });
        } catch (saveError) {
          // If it's a duplicate key error, try with a modified slug/SKU
          if (saveError.code === 11000) {
            console.log(`⚠️ Duplicate detected for ${old.Name}, attempting with modified identifiers...`);

            // Try with modified slug and SKU
            productData.slug = `${productSlug}-${Date.now()}`;
            productData.sku = `${productSku}-DUP-${index}`;

            const retryProduct = new Product(productData);
            await retryProduct.save();

            console.log(
              `✅ Imported with modified identifiers: ${retryProduct.name} (slug: ${retryProduct.slug})`
            );
            importedProducts.push({
              id: retryProduct._id,
              name: retryProduct.name,
              sku: retryProduct.sku,
              slug: retryProduct.slug,
              categories: categoryIds.length,
              brands: brandIds.length,
            });
          } else {
            throw saveError; // Re-throw if it's not a duplicate error
          }
        }
      } catch (error) {
        console.error(`❌ Failed to import ${old.Name}:`, error.message);
        if (error.code === 11000) {
          console.error(`   🔍 Duplicate key error details:`, error.keyValue);
        }
        errors.push({
          productId: old.ID,
          name: old.Name || "Unknown",
          error: error.message,
          errorCode: error.code || "Unknown",
        });
      }
    }

    console.log(`\n🎉 Import completed!`);
    console.log(
      `✅ Successfully imported: ${importedProducts.length} products`
    );
    console.log(`❌ Failed to import: ${errors.length} products`);

    res.status(200).json({
      success: true,
      message: `Import completed. ${importedProducts.length} products imported successfully.`,
      imported: importedProducts.length,
      failed: errors.length,
      products: importedProducts,
      errors: errors.length > 0 ? errors : undefined,
      summary: {
        totalProcessed: oldProducts.length,
        successful: importedProducts.length,
        failed: errors.length,
        categories: Object.keys(categoryCache).length,
        brands: Object.keys(brandCache).length,
      },
    });
  } catch (error) {
    console.error("❌ Critical error in seedProducts:", error);
    res.status(500).json({
      success: false,
      message: "Server error during seeding.",
      error: error.message,
      imported: importedProducts.length,
      errors: errors,
    });
  }
};


exports.soldOutProduct = async (req, res) => {
  try {
    const product = await Product.find({ where: { soldOut: true } }).limit(50);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.status(200).json(product);
  } catch (error) {
    await Logger.error({
      message: "Sold out Products",
      error: error.message,
      req: req.body,
      severity: "medium"
    })
    res.status(500).json({ message: 'Server error', error: error.message });
  }
}

// Get available filter options from the database with AI-powered categorization and navbar structure
exports.getFilterOptions = async (req, res) => {
  try {
    const Navbar = require('../models/navbar.model');

    // Initialize AI systems
    const categoryAI = new CategoryAI();
    const filterCleaner = new FilterCleaner();

    // === NAVBAR STRUCTURE INTEGRATION ===
    console.log('🧭 Getting navbar structure for hierarchical categories...');
    const navbar = await Navbar.findOne().lean();

    // Create hierarchical category structure from navbar
    const hierarchicalCategories = [];
    if (navbar && navbar.megaMenus) {
      for (const megaMenu of navbar.megaMenus) {
        // Find the corresponding menu item
        const menuItem = navbar.menuItems.find(item =>
          item._id.toString() === megaMenu.menuItemId.toString()
        );

        if (menuItem && !megaMenu.isServiceMenu && megaMenu.categories.length > 0) {
          const genderCategory = {
            id: menuItem.name.toLowerCase(),
            name: menuItem.name,
            label: menuItem.name,
            slug: menuItem.name.toLowerCase(),
            type: 'gender',
            subcategories: []
          };

          // Add subcategories from mega menu
          for (const category of megaMenu.categories) {
            if (category.isActive) {
              genderCategory.subcategories.push({
                id: category.slug,
                name: category.name,
                label: category.name,
                slug: category.slug,
                type: 'category',
                parent: menuItem.name.toLowerCase()
              });
            }
          }

          hierarchicalCategories.push(genderCategory);
        }
      }
    }

    // === COLORS PROCESSING ===
    const colorsAggregation = await Product.aggregate([
      { $match: { status: true, 'colors.0': { $exists: true } } },
      { $unwind: '$colors' },
      { $match: { 'colors.color': { $ne: null, $ne: '' } } },
      { $group: { _id: '$colors.color' } },
      { $sort: { _id: 1 } }
    ]);

    const rawColors = colorsAggregation.map(item => item._id).filter(Boolean);
    const cleanedColorsResult = filterCleaner.cleanColors(rawColors);

    // === SIZES PROCESSING ===
    const sizesAggregation = await Product.aggregate([
      { $match: { status: true, 'sizes.0': { $exists: true } } },
      { $unwind: '$sizes' },
      { $match: { 'sizes.size': { $ne: null, $ne: '' } } },
      { $group: { _id: '$sizes.size' } },
      { $sort: { _id: 1 } }
    ]);

    const rawSizes = sizesAggregation.map(item => item._id).filter(Boolean);
    const cleanedSizesResult = filterCleaner.cleanSizes(rawSizes);

    // === BRANDS PROCESSING ===
    console.log('🏷️ Processing brands...');
    const brandsFromDB = await brandModel.find({ status: true }).select('name');
    const cleanedBrandsResult = filterCleaner.cleanBrands(brandsFromDB);

    // === CONDITIONS PROCESSING ===
    console.log('⭐ Processing conditions...');
    const conditionsAggregation = await Product.aggregate([
      { $match: { status: true, condition: { $ne: null, $ne: '' } } },
      { $group: { _id: '$condition' } },
      { $sort: { _id: 1 } }
    ]);

    const rawConditions = conditionsAggregation.map(item => item._id).filter(Boolean);
    const cleanedConditionsResult = filterCleaner.cleanConditions(rawConditions);

    // === TRADITIONAL CATEGORIES PROCESSING WITH AI ===
    console.log('🧠 Processing traditional categories with AI...');
    const categoriesFromDB = await categoryModel.find({
      status: true,
      name: { $ne: null, $ne: '', $ne: '.' }
    }).select('name subCategories');

    // Use AI to organize categories
    const organizedCategoriesResult = categoryAI.organizeCategories(categoriesFromDB);

    // Add any extra sizes found in categories to sizes list
    if (organizedCategoriesResult.extraSizes.length > 0) {
      const extraSizesResult = filterCleaner.cleanSizes(organizedCategoriesResult.extraSizes);
      // Merge with existing sizes (avoid duplicates)
      const allSizes = new Map();

      // Add existing sizes
      cleanedSizesResult.sizes.forEach(size => {
        allSizes.set(size.id, size);
      });

      // Add extra sizes
      extraSizesResult.sizes.forEach(size => {
        if (!allSizes.has(size.id)) {
          allSizes.set(size.id, size);
        }
      });

      cleanedSizesResult.sizes = Array.from(allSizes.values())
        .sort((a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label));
    }

    // === GENDER OPTIONS ===
    const genderOptions = [
      { id: 'women', name: 'Women', label: 'Women', slug: 'women', type: 'gender' },
      { id: 'men', name: 'Men', label: 'Men', slug: 'men', type: 'gender' },
      { id: 'kids', name: 'Kids', label: 'Kids', slug: 'kids', type: 'gender' },
      { id: 'unisex', name: 'Unisex', label: 'Unisex', slug: 'unisex', type: 'gender' }
    ];

    // Prepare final response with comprehensive stats
    const response = {
      colors: cleanedColorsResult.colors,
      sizes: cleanedSizesResult.sizes,
      brands: cleanedBrandsResult.brands,
      conditions: cleanedConditionsResult.conditions,
      gender: genderOptions,

      // Traditional categories (flat structure)
      categories: organizedCategoriesResult.categories,

      // NEW: Hierarchical categories from navbar (structured like navbar dropdowns)
      hierarchicalCategories: hierarchicalCategories,

      // Include processing stats for debugging (remove in production)
      _metadata: {
        processing: {
          colors: cleanedColorsResult.stats,
          sizes: cleanedSizesResult.stats,
          brands: cleanedBrandsResult.stats,
          conditions: cleanedConditionsResult.stats,
          categories: organizedCategoriesResult.stats,
          hierarchicalCategories: hierarchicalCategories.length
        },
        excluded: {
          categories: organizedCategoriesResult.excludedCategories,
          colors: cleanedColorsResult.excluded,
          sizes: cleanedSizesResult.excluded,
          brands: cleanedBrandsResult.excluded,
          conditions: cleanedConditionsResult.excluded
        },
        aiProcessing: {
          extraSizes: organizedCategoriesResult.extraSizes,
          totalProcessed: Object.values(organizedCategoriesResult.stats).reduce((a, b) => a + b, 0)
        }
      }
    };

    // Remove metadata in production
    if (process.env.NODE_ENV === 'production') {
      delete response._metadata;
    }

    res.status(200).json(response);

  } catch (error) {
    console.error('❌ Error in enhanced filter processing:', error);
    res.status(500).json({
      message: 'Error fetching filter options',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// Auto-select combo products based on conditions and category preferences
const autoSelectComboProducts = async (excludeId, limit = 4) => {
  try {
    // Preferred conditions for combo products
    const preferredConditions = ['New With Tags', 'New Without Tags', 'Pristine'];

    // Try to get products with preferred conditions, prioritizing bags
    let products = await Product.aggregate([
      {
        $match: {
          status: true,
          condition: { $in: preferredConditions },
          _id: { $ne: new mongoose.Types.ObjectId(excludeId) }
        }
      },
      {
        $lookup: {
          from: 'categories',
          localField: 'primaryCategory',
          foreignField: '_id',
          as: 'categoryInfo'
        }
      },
      {
        $addFields: {
          categoryName: { $arrayElemAt: ['$categoryInfo.name', 0] },
          // Prioritize bags and similar accessories
          isBag: {
            $cond: {
              if: {
                $regexMatch: {
                  input: { $toLower: { $arrayElemAt: ['$categoryInfo.name', 0] } },
                  regex: /(bag|purse|handbag|backpack|tote|clutch|wallet|pouch)/i
                }
              },
              then: 1,
              else: 0
            }
          }
        }
      },
      // Sort by bags first, then randomly
      { $sort: { isBag: -1 } },
      { $sample: { size: Math.min(limit * 2, 20) } }, // Get more to ensure variety
      {
        $lookup: {
          from: 'brands',
          localField: 'primaryBrand',
          foreignField: '_id',
          as: 'brandInfo'
        }
      },
      {
        $project: {
          name: 1,
          slug: 1,
          image: 1,
          price: 1,
          salePrice: 1,
          condition: 1,
          isBag: 1,
          brand: { $arrayElemAt: ['$brandInfo.name', 0] },
          category: '$categoryName'
        }
      }
    ]);

    // If we don't have enough products, try with relaxed conditions
    if (products.length < limit) {
      const additionalProducts = await Product.aggregate([
        {
          $match: {
            status: true,
            _id: {
              $ne: new mongoose.Types.ObjectId(excludeId),
              $nin: products.map(p => p._id)
            }
          }
        },
        { $sample: { size: limit - products.length } },
        {
          $lookup: {
            from: 'brands',
            localField: 'primaryBrand',
            foreignField: '_id',
            as: 'brandInfo'
          }
        },
        {
          $lookup: {
            from: 'categories',
            localField: 'primaryCategory',
            foreignField: '_id',
            as: 'categoryInfo'
          }
        },
        {
          $project: {
            name: 1,
            slug: 1,
            image: 1,
            price: 1,
            salePrice: 1,
            condition: 1,
            brand: { $arrayElemAt: ['$brandInfo.name', 0] },
            category: { $arrayElemAt: ['$categoryInfo.name', 0] }
          }
        }
      ]);

      products = products.concat(additionalProducts);
    }

    // Return exactly the requested number of products
    return products.slice(0, limit);
  } catch (error) {
    console.error('Error auto-selecting combo products:', error);
    return [];
  }
};

// Ensure minimum combo products for display (used in product detail pages)
const ensureMinimumComboProducts = async (product, minRequired = 4) => {
  try {
    // Get current combo products (filter out any null/inactive ones)
    const currentComboProducts = product.comboProducts?.filter(cp => cp && cp._id) || [];

    // If we already have enough, return as is
    if (currentComboProducts.length >= minRequired) {
      return currentComboProducts;
    }

    // Calculate how many more we need
    const needed = minRequired - currentComboProducts.length;
    const currentIds = currentComboProducts.map(cp => cp._id.toString());

    // Get additional products using the same logic as autoSelectComboProducts
    const preferredConditions = ['New With Tags', 'New Without Tags', 'Pristine'];

    let additionalProducts = await Product.aggregate([
      {
        $match: {
          status: true,
          condition: { $in: preferredConditions },
          _id: {
            $ne: product._id,
            $nin: currentIds.map(id => new mongoose.Types.ObjectId(id))
          }
        }
      },
      {
        $lookup: {
          from: 'categories',
          localField: 'primaryCategory',
          foreignField: '_id',
          as: 'categoryInfo'
        }
      },
      {
        $addFields: {
          categoryName: { $arrayElemAt: ['$categoryInfo.name', 0] },
          // Prioritize bags and similar accessories
          isBag: {
            $cond: {
              if: {
                $regexMatch: {
                  input: { $toLower: { $arrayElemAt: ['$categoryInfo.name', 0] } },
                  regex: /(bag|purse|handbag|backpack|tote|clutch|wallet|pouch)/i
                }
              },
              then: 1,
              else: 0
            }
          }
        }
      },
      // Sort by bags first, then randomly
      { $sort: { isBag: -1 } },
      { $sample: { size: Math.min(needed * 2, 20) } },
      {
        $lookup: {
          from: 'brands',
          localField: 'primaryBrand',
          foreignField: '_id',
          as: 'brandInfo'
        }
      },
      {
        $project: {
          name: 1,
          slug: 1,
          image: 1,
          price: 1,
          condition: 1,
          salePrice: 1,
          rating: 1,
          reviews: 1,
          primaryBrand: 1,
          primaryCategory: 1
        }
      }
    ]);

    // If still not enough, get any active products
    if (additionalProducts.length < needed) {
      const fallbackProducts = await Product.aggregate([
        {
          $match: {
            status: true,
            _id: {
              $ne: product._id,
              $nin: [...currentIds, ...additionalProducts.map(p => p._id)].map(id => new mongoose.Types.ObjectId(id))
            }
          }
        },
        { $sample: { size: needed - additionalProducts.length } },
        {
          $lookup: {
            from: 'brands',
            localField: 'primaryBrand',
            foreignField: '_id',
            as: 'brandInfo'
          }
        },
        {
          $lookup: {
            from: 'categories',
            localField: 'primaryCategory',
            foreignField: '_id',
            as: 'categoryInfo'
          }
        },
        {
          $project: {
            name: 1,
            slug: 1,
            image: 1,
            condition: 1,
            price: 1,
            salePrice: 1,
            rating: 1,
            reviews: 1,
            condition: 1,
            primaryBrand: 1,
            primaryCategory: 1
          }
        }
      ]);

      additionalProducts = additionalProducts.concat(fallbackProducts);
    }

    // Populate brand and category info for additional products
    const populatedAdditional = await Product.populate(additionalProducts.slice(0, needed), [
      { path: 'primaryBrand', select: 'name' },
      { path: 'primaryCategory', select: 'name' }
    ]);

    // Combine current and additional products
    const finalComboProducts = [...currentComboProducts, ...populatedAdditional];

    console.log(`Ensured minimum combo products: ${currentComboProducts.length} existing + ${populatedAdditional.length} additional = ${finalComboProducts.length} total`);

    return finalComboProducts;
  } catch (error) {
    console.error('Error ensuring minimum combo products:', error);
    return product.comboProducts || [];
  }
};

// Get random products for combo fallback
exports.getRandomProducts = async (req, res) => {
  try {
    const { exclude, limit = 8 } = req.query;

    const matchConditions = { status: true };
    if (exclude) {
      matchConditions._id = { $ne: exclude };
    }

    const products = await Product.aggregate([
      { $match: matchConditions },
      { $sample: { size: parseInt(limit) } },
      {
        $lookup: {
          from: 'brands',
          localField: 'primaryBrand',
          foreignField: '_id',
          as: 'brandInfo'
        }
      },
      {
        $lookup: {
          from: 'categories',
          localField: 'primaryCategory',
          foreignField: '_id',
          as: 'categoryInfo'
        }
      },
      {
        $addFields: {
          brandName: { $arrayElemAt: ['$brandInfo.name', 0] },
          categoryName: { $arrayElemAt: ['$categoryInfo.name', 0] }
        }
      },
      {
        $project: {
          name: 1,
          slug: 1,
          condition: 1,
          image: 1,
          price: 1,
          salePrice: 1,
          brandName: 1,
          categoryName: 1,
          isSale: 1,
          rating: 1
        }
      }
    ]);

    res.status(200).json({
      status: "success",
      results: products.length,
      data: { products }
    });
  } catch (error) {
    console.error('Error fetching random products:', error);
    res.status(500).json({
      status: "error",
      message: error.message || 'Error fetching random products'
    });
  }
};

// Get detailed subcategories for a specific gender and category combination
exports.getSubCategories = async (req, res) => {
  try {
    const { gender, category } = req.params;

    console.log(`🔍 Getting subcategories for ${gender}-${category}`);

    // Build the search pattern for this gender-category combination
    const searchPattern = `${gender.toLowerCase()}-${category.toLowerCase()}`;

    // Find all categories that match this pattern
    const matchingCategories = await categoryModel.find({
      status: true,
      $or: [
        { name: { $regex: searchPattern, $options: "i" } },
        { name: { $regex: `${gender}.*${category}`, $options: "i" } },
        { name: { $regex: `${category}.*${gender}`, $options: "i" } }
      ]
    }).select('name slug description').lean();

    // Also search by slug patterns
    const slugCategories = await categoryModel.find({
      status: true,
      slug: { $regex: searchPattern, $options: "i" }
    }).select('name slug description').lean();

    // Combine and deduplicate
    const allCategories = [...matchingCategories, ...slugCategories];
    const uniqueCategories = allCategories.filter((category, index, self) =>
      index === self.findIndex(c => c._id.toString() === category._id.toString())
    );

    // Get product counts for each subcategory
    const subcategoriesWithCounts = await Promise.all(
      uniqueCategories.map(async (cat) => {
        const count = await Product.countDocuments({
          'categories.categoryId': cat._id,
          status: true
        });

        return {
          id: cat._id,
          name: cat.name,
          slug: cat.slug,
          description: cat.description,
          productCount: count,
          parent: gender.toLowerCase(),
          mainCategory: category.toLowerCase()
        };
      })
    );

    // Filter out categories with no products and sort by product count
    const activeSubcategories = subcategoriesWithCounts
      .filter(cat => cat.productCount > 0)
      .sort((a, b) => b.productCount - a.productCount);

    res.status(200).json({
      status: 'success',
      data: {
        gender: gender,
        category: category,
        subcategories: activeSubcategories,
        total: activeSubcategories.length
      }
    });

  } catch (error) {
    console.error(`❌ Error getting subcategories for ${gender}-${category}:`, error);
    res.status(500).json({
      status: 'error',
      message: 'Error fetching subcategories',
      error: error.message
    });
  }
};

// Old getColorClass function removed - now handled by FilterCleaner utility

// DEDICATED SALES PRODUCTS ENDPOINT
// Only returns products that have salePrice and are active
exports.getSaleProducts = async (req, res) => {
  try {
    const {
      keyword,
      category,
      categories,
      brand,
      brands,
      condition,
      conditions,
      colors,
      sizes,
      includeSoldOut,
      minPrice,
      maxPrice,
      sort = "position_asc",
      page = 1,
      limit = 2000,
    } = req.query;

    // DEBUG: Log incoming request
    console.log("🔍 SALE PRODUCTS API REQUEST:");
    console.log("  Categories param:", categories);
    console.log("  Category param:", category);

    // BASE QUERY: Only products on sale (with salePrice) and active
    let query = {
      status: true,
      isSale: true,
      salePrice: { $exists: true, $ne: null, $gt: 0 }
    };

    let detectedGender = null;
    let baseCategoryFound = false;

    // ===============================
    // CATEGORY FILTERING
    // ===============================
    const categoryParam = categories || category;
    if (categoryParam) {
      // Try AI category processing first
      const aiCategoryResult = await processAICategoriesFilter(categoryParam);

      if (aiCategoryResult) {
        if (aiCategoryResult.isEmpty) {
          return res.status(200).json({
            status: "success",
            results: 0,
            total: 0,
            page: Number(page),
            totalPages: 0,
            data: { products: [] },
            message: "No sale products found for selected categories",
            metadata: { aiCategoryProcessing: true, salesOnly: true }
          });
        }

        if (aiCategoryResult.mongoQuery && Object.keys(aiCategoryResult.mongoQuery).length > 0) {
          if (aiCategoryResult.mongoQuery.$and) {
            if (!query.$and) query.$and = [];
            query.$and.push(...aiCategoryResult.mongoQuery.$and);
          } else {
            Object.assign(query, aiCategoryResult.mongoQuery);
          }
          baseCategoryFound = true;

          if (aiCategoryResult.genderFilter) {
            detectedGender = aiCategoryResult.genderFilter;
          }
        }
      } else {
        // Fallback to legacy category processing
        const categoryNames = categoryParam.split(",").map((cat) => cat.trim());
        const allCategoryIds = [];

        for (const categoryName of categoryNames) {
          const { baseCategory, gender } = parseGenderCategory(categoryName);

          if (gender && !detectedGender) {
            detectedGender = gender;
          }

          const baseCategoryIds = await findBaseCategoryMatches(baseCategory);

          if (baseCategoryIds.length > 0) {
            baseCategoryFound = true;
            allCategoryIds.push(...baseCategoryIds);
          }
        }

        if (baseCategoryFound && allCategoryIds.length > 0) {
          query["categories.categoryId"] = { $in: [...new Set(allCategoryIds)] };
        }
      }

      if (!baseCategoryFound) {
        return res.status(200).json({
          status: "success",
          results: 0,
          total: 0,
          page: Number(page),
          totalPages: 0,
          data: { products: [] },
          metadata: {
            appliedFilters: {
              salesOnly: true,
              genderDetected: detectedGender,
              baseCategoryFound: false,
              message: `No sale products found for: ${categoryParam}`,
            },
          },
        });
      }
    }

    // ===============================
    // OTHER FILTERS
    // ===============================

    // Keyword search
    if (keyword) {
      if (!detectedGender) {
        detectedGender = detectGenderFromQuery(keyword);
      }

      query.$or = [
        { name: { $regex: keyword, $options: "i" } },
        { description: { $regex: keyword, $options: "i" } },
        { tags: { $in: [new RegExp(keyword, "i")] } },
      ];
    }

    // Brand filtering
    const brandParam = brands || brand;
    if (brandParam) {
      const brandNames = brandParam.split(",").map((brand) => brand.trim());
      const brandDocs = await brandModel.find({
        name: { $in: brandNames.map((name) => new RegExp(name, "i")) },
      });

      if (brandDocs.length > 0) {
        const brandIds = brandDocs.map((brand) => brand._id);
        query["brands.brandId"] = { $in: brandIds };
      }
    }

    // Condition filtering (with label mapping)
    const conditionParam = conditions || condition;
    if (conditionParam) {
      // Map condition IDs to their labels
      const conditionLabelMap = {
        'newwithtags': 'New With Tags',
        'new with tags': 'New With Tags',
        'preowned': 'Pre-Owned',
        'pre-owned': 'Pre-Owned',
        'pre owned': 'Pre-Owned',
        'gently used': 'Gently Used',
        'gentlyused': 'Gently Used',
        'vintage': 'Vintage',
        'likenew': 'Like New',
        'like new': 'Like New'
      };

      const conditionValues = conditionParam
        .split(",")
        .map((cond) => {
          const trimmed = cond.trim();
          const lowerCase = trimmed.toLowerCase();
          // Return the mapped label if exists, otherwise use the original value
          return conditionLabelMap[lowerCase] || trimmed;
        });

      // Use case-insensitive regex for matching
      query.condition = {
        $in: conditionValues.map((cond) => new RegExp(`^${cond}$`, "i"))
      };
    }

    // Color filtering
    if (colors) {
      const colorValues = colors.split(",").map((color) => color.trim());
      query["colors.color"] = {
        $in: colorValues.map((color) => new RegExp(color, "i")),
      };
    }

    // Size filtering
    if (sizes) {
      const sizeValues = sizes.split(",").map((size) => size.trim());
      query["sizes.size"] = {
        $in: sizeValues.map((size) => new RegExp(size, "i")),
      };
    }

    // Sold out filtering
    if (includeSoldOut !== "true") {
      query.soldOut = { $ne: true };
      query.stockQuantity = { $gt: 0 };
    }

    // Price range filtering (based on salePrice for sale products)
    if (minPrice || maxPrice) {
      query.salePrice = {};
      if (minPrice) query.salePrice.$gte = Number(minPrice);
      if (maxPrice) query.salePrice.$lte = Number(maxPrice);
    }

    const skip = (Number(page) - 1) * Number(limit);

    // Check if discount sorting is requested
    const isDiscountSort = sort === 'discount_asc' || sort === 'discount_desc';

    const sortOptions = {
      price_asc: { salePrice: 1 },
      price_desc: { salePrice: -1 },
      name_asc: { name: 1 },
      name_desc: { name: -1 },
      created_asc: { createdAt: 1 },
      created_desc: { createdAt: -1 },
      position_asc: { position: 1 },
      position_desc: { position: -1 },
    };

    // Use default sort for discount sorting (will sort in JS after fetching)
    const sortBy = isDiscountSort ? sortOptions["position_desc"] : (sortOptions[sort] || sortOptions["position_desc"]);

    let products = await Product.find(query)
      .populate("categories.categoryId", "name slug description")
      .populate("brands.brandId", "name slug description image")
      .populate("primaryCategory", "name slug description")
      .populate("primaryBrand", "name slug description image")
      .sort(sortBy)
      .skip(isDiscountSort ? 0 : skip) // Don't skip if discount sorting (need all for sorting)
      .limit(isDiscountSort ? 0 : Number(limit)) // No limit if discount sorting
      .lean();

    // Calculate discount for each product
    products = products.map(product => ({
      ...product,
      discountPercentage: product.price && product.salePrice
        ? Math.round(((product.price - product.salePrice) / product.price) * 100)
        : 0,
      discountAmount: product.price && product.salePrice
        ? product.price - product.salePrice
        : 0
    }));

    // Sort by discount if requested
    if (isDiscountSort) {
      products.sort((a, b) => {
        const discountA = a.discountAmount;
        const discountB = b.discountAmount;
        return sort === 'discount_desc' ? discountB - discountA : discountA - discountB;
      });

      // Apply pagination after sorting
      const startIndex = skip;
      const endIndex = skip + Number(limit);
      products = products.slice(startIndex, endIndex);
    }

    // Apply gender filtering if detected
    if (detectedGender && products.length > 0) {
      const beforeGenderFilter = products.length;
      products = await applyStrictGenderFilter(products, detectedGender);

      if (products.length === 0) {
        return res.status(200).json({
          status: "success",
          results: 0,
          total: 0,
          page: Number(page),
          totalPages: 0,
          data: { products: [] },
          metadata: {
            appliedFilters: {
              salesOnly: true,
              genderDetected: detectedGender,
              baseCategoryFound: true,
              genderFilterApplied: true,
              message: `No ${detectedGender}'s sale products found`,
              originalCategoryResults: beforeGenderFilter,
              genderFilteredResults: 0,
            },
          },
        });
      }
    }

    // Calculate total with same filtering logic
    let total;
    if (detectedGender && baseCategoryFound) {
      total = await getTotalWithGenderFiltering(query, detectedGender);
    } else {
      total = await Product.countDocuments(query);
    }

    // Products already have discount calculated above
    const responseMetadata = {
      salesOnly: true,
      appliedFilters: {
        genderDetected: detectedGender,
        baseCategoryFound: baseCategoryFound,
        genderFilterApplied: !!detectedGender,
        categoryCount: query["categories.categoryId"]
          ? Array.isArray(query["categories.categoryId"].$in)
            ? query["categories.categoryId"].$in.length
            : 1
          : 0,
      },
    };

    res.status(200).json({
      status: "success",
      results: products.length,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / limit),
      data: { products },
      metadata: responseMetadata,
    });
  } catch (err) {
    console.error("❌ Error in getSaleProducts:", err);
    res.status(500).json({
      status: "error",
      message: err.message,
    });
  }
};

// Get product name letter counts for alphabet filter
exports.getProductLetterCounts = async (req, res) => {
  try {
    const {
      keyword,
      category,
      brand,
      status,
    } = req.query;

    let query = {};

    // Apply same filters as getAllProductsForAdmin to get accurate counts
    if (keyword) {
      query.$or = [
        { name: { $regex: keyword, $options: "i" } },
        { description: { $regex: keyword, $options: "i" } },
        { sku: { $regex: keyword, $options: "i" } },
      ];
    }

    if (category && category !== 'all') {
      const categoryDoc = await categoryModel.findById(category);
      if (categoryDoc) {
        query["categories.categoryId"] = categoryDoc._id;
      }
    }

    if (brand && brand !== 'all') {
      const brandDoc = await brandModel.findById(brand);
      if (brandDoc) {
        query["brands.brandId"] = brandDoc._id;
      }
    }

    if (status !== undefined && status !== '' && status !== 'all') {
      query.status = status === 'active' || status === 'true';
    }

    // Use MongoDB aggregation to count by first letter
    const letterCounts = await Product.aggregate([
      { $match: query },
      {
        $project: {
          firstLetter: { $toUpper: { $substr: ["$name", 0, 1] } }
        }
      },
      {
        $match: {
          firstLetter: { $regex: /^[A-Z]$/ }
        }
      },
      {
        $group: {
          _id: "$firstLetter",
          count: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    // Convert to object format { A: 5, B: 10, ... }
    const counts = {};
    letterCounts.forEach(item => {
      counts[item._id] = item.count;
    });

    res.status(200).json({
      status: "success",
      data: { letterCounts: counts }
    });
  } catch (err) {
    console.error("❌ Error in getProductLetterCounts:", err);
    await Logger.error({
      message: "Get product letter counts",
      error: err,
      req,
      severity: "low"
    });
    res.status(500).json({
      status: "error",
      message: err.message,
    });
  }
};