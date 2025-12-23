const Category = require("../../models/category.model");
const Brand = require("../../models/brand.model");

/**
 * Main filter builder class
 */
class FilterBuilder {
  constructor() {
    this.query = {};
    this.andConditions = [];
    this.debug = {}; // Store debug info
  }

  /**
   * Build all filters at once (handles async operations properly)
   * @param {Object} params - All filter parameters
   * @returns {Promise<Object>} Built query
   */
  async buildAllFilters(params) {
    // Add synchronous filters first
    this.addGenderFilter(params.gender);
    this.addColorsFilter(params.colors);
    this.addSizesFilter(params.sizes);
    this.addConditionsFilter(params.conditions);
    this.addPriceRangeFilter(params.minPrice, params.maxPrice);
    this.addPricePresetFilter(params.priceRange);
    this.addStockFilter(params.includeSoldOut, params.inStock);
    this.addSaleFilter(params.isSale);
    this.addNewItemsFilter(params.isNew);
    this.addViewsFilter(params.minViews, params.maxViews);
    this.addDateRangeFilter(params.dateRange);
    this.addTagsFilter(params.tags);
    this.addStatusFilter();

    // Handle async filters separately - only apply if filter has values
    // If categories is an empty array, don't filter by categories (show all categories)
    if (params.categories && params.categories.length > 0) {
      await this.addCategoriesFilter(params.categories);
    }
    
    // If brands is an empty array, don't filter by brands (show all brands)
    if (params.brands && params.brands.length > 0) {
      await this.addBrandsFilter(params.brands);
    }

    return this.build();
  }

  /**
   * Add gender filter - empty array means show all genders
   * @param {string|Array} gender - Gender filter
   * @returns {FilterBuilder}
   */
  addGenderFilter(gender) {
    // Only apply gender filter if there are valid gender values
    if (Array.isArray(gender)) {
      const validGenders = gender.filter(g => g && typeof g === 'string').map(g => g.toLowerCase());
      if (validGenders.length > 0) {
        this.query.gender = { $in: validGenders };
      }
      // If empty array, don't add gender filter (show all genders)
    } else if (typeof gender === 'string' && gender.trim()) {
      this.query.gender = gender.toLowerCase();
    }
    return this;
  }

  /**
   * Add categories filter
   * @param {Array} categories - Category names
   * @returns {FilterBuilder}
   */
  async addCategoriesFilter(categories) {
    if (Array.isArray(categories) && categories.length > 0) {
      const validCategories = categories.filter(c => c && typeof c === 'string');
      if (validCategories.length > 0) {
        // Normalize category names: convert hyphens to spaces and handle URL encoding
        const normalizedCategories = validCategories.map(c => {
          // Replace hyphens with spaces and trim
          return c.replace(/-/g, ' ').toLowerCase().trim();
        });

        // Build regex patterns with smart matching
        const searchQueries = normalizedCategories.map(cat => {
          // Special case: "shirts" should match "Shirts" exactly, not "T Shirts"
          if (cat === 'shirts' || cat === 'shirt') {
            // Use word boundary and negative lookbehind to exclude "T Shirts"
            // Match "Shirts" or "shirt" but NOT when preceded by "T" or "t"
            return {
              name: new RegExp(`^(?!.*\\bt[\\s-])shirts?$`, 'i')
            };
          }
          // Special case: "tshirt" should match "T Shirts", "T-Shirts", "Tshirt" etc
          else if (cat === 'tshirt' || cat === 't shirt') {
            return {
              name: new RegExp(`t[\\s-]?shirts?`, 'i')
            };
          }
          // For all other categories, use flexible matching (as before)
          else {
            return {
              name: new RegExp(cat, 'i')
            };
          }
        });

        // Find categories using the smart queries
        const foundCategories = await Category.find({
          $or: searchQueries
        }).select("_id name");

        if (foundCategories.length > 0) {
          // Use OR logic for all categories - show products that have ANY of the selected categories
          const categoryIds = foundCategories.map((c) => c._id);
          this.query["categories.categoryId"] = { $in: categoryIds };
        } else {
          // If no category found, ensure NO products are returned
          // Use a non-existent ObjectId to match nothing
          const mongoose = require('mongoose');
          this.query["categories.categoryId"] = { $in: [new mongoose.Types.ObjectId()] };
          console.warn(`⚠️ No categories found in database for: ${validCategories.join(', ')}`);
        }
      }
    }
    return this;
  }

  /**
   * Add brands filter
   * @param {Array} brands - Brand names
   * @returns {FilterBuilder}
   */
  async addBrandsFilter(brands) {
    if (Array.isArray(brands) && brands.length > 0) {
      const validBrands = brands.filter(b => b && typeof b === 'string');
      if (validBrands.length > 0) {
        // Normalize brand names: convert hyphens to spaces and handle URL encoding
        const normalizedBrands = validBrands.map(b => {
          // Replace hyphens with spaces and trim
          return b.replace(/-/g, ' ').toLowerCase().trim();
        });

        const foundBrands = await Brand.find({
          name: { $regex: new RegExp(normalizedBrands.join('|'), 'i') }
        }).select("_id");

        const brandIds = foundBrands.map((b) => b._id);
        if (brandIds.length > 0) {
          // Search in both brands.brandId array AND primaryBrand field
          // Use $or to check either location
          this.andConditions.push({
            $or: [
              { "brands.brandId": { $in: brandIds } },
              { "primaryBrand": { $in: brandIds } }
            ]
          });
        }
      }
    }
    return this;
  }

  /**
   * Add colors filter
   * @param {Array} colors - Color names
   * @returns {FilterBuilder}
   */
  addColorsFilter(colors) {
    if (Array.isArray(colors) && colors.length > 0) {
      const validColors = colors.filter(c => c && typeof c === 'string');
      if (validColors.length > 0) {
        const lowerCaseColors = validColors.map(c => c.toLowerCase());
        this.query["colors.color"] = {
          $regex: new RegExp(lowerCaseColors.join('|'), 'i')
        };
      }
    }
    return this;
  }

  /**
   * Add sizes filter
   * @param {Array} sizes - Size names
   * @returns {FilterBuilder}
   */
  addSizesFilter(sizes) {
    if (Array.isArray(sizes) && sizes.length > 0) {
      const validSizes = sizes.filter(s => s && typeof s === 'string');
      if (validSizes.length > 0) {
        const lowerCaseSizes = validSizes.map(s => s.toLowerCase());
        this.query["sizes.size"] = {
          $regex: new RegExp(lowerCaseSizes.join('|'), 'i')
        };
      }
    }
    return this;
  }

  /**
   * Add conditions filter
   * @param {Array} conditions - Condition names
   * @returns {FilterBuilder}
   */
  addConditionsFilter(conditions) {
    if (Array.isArray(conditions) && conditions.length > 0) {
      const validConditions = conditions.filter(c => c && typeof c === 'string');
      if (validConditions.length > 0) {
        const conditionMappings = {
          'newwithtags': 'New With Tags',
          'new with tags': 'New With Tags',
          'newwithouttags': 'New Without Tags',
          'new without tags': 'New Without Tags',
          'pristine': 'Pristine',
          'goodcondition': 'Good Condition',
          'good condition': 'Good Condition',
          'gentlyused': 'Gently Used',
          'gently used': 'Gently Used',
          'usedfairlywell': 'Used Fairly Well',
          'used fairly well': 'Used Fairly Well',
          'preowned': 'Pre-Owned',
          'pre-owned': 'Pre-Owned',
          'pre owned': 'Pre-Owned',
          'vintage': 'Vintage',
          'likenew': 'Like New',
          'like new': 'Like New'
        };
        
        const mappedConditions = validConditions.map(c => {
          const lower = c.toLowerCase();
          return conditionMappings[lower] || c;
        });

        // Use case-insensitive regex for matching
        this.query.condition = {
          $in: mappedConditions.map(cond => new RegExp(`^${cond}$`, 'i'))
        };
      }
    }
    return this;
  }

  /**
   * Add price range filter
   * @param {number} minPrice - Minimum price
   * @param {number} maxPrice - Maximum price
   * @returns {FilterBuilder}
   */
  addPriceRangeFilter(minPrice, maxPrice) {
    if (minPrice !== undefined || maxPrice !== undefined) {
      this.query.price = {};
      if (minPrice !== undefined && !isNaN(minPrice)) {
        this.query.price.$gte = parseFloat(minPrice);
      }
      if (maxPrice !== undefined && !isNaN(maxPrice)) {
        this.query.price.$lte = parseFloat(maxPrice);
      }
    }
    return this;
  }

  /**
   * Add price preset filter
   * @param {string} priceRange - Price range preset
   * @returns {FilterBuilder}
   */
  addPricePresetFilter(priceRange) {
    if (priceRange && priceRange !== 'all') {
      const ranges = {
        'under-25': { max: 25 },
        '25-50': { min: 25, max: 50 },
        '50-100': { min: 50, max: 100 },
        '100-200': { min: 100, max: 200 },
        'over-200': { min: 200 }
      };
      
      if (ranges[priceRange]) {
        this.query.price = {};
        if (ranges[priceRange].min) this.query.price.$gte = ranges[priceRange].min;
        if (ranges[priceRange].max) this.query.price.$lte = ranges[priceRange].max;
      }
    }
    return this;
  }

  /**
   * Add stock filter
   * @param {boolean} includeSoldOut - Include sold out products
   * @param {boolean} inStock - Only in stock products
   * @returns {FilterBuilder}
   */
  addStockFilter(includeSoldOut, inStock) {
    if (!includeSoldOut) {
      this.andConditions.push({
        $or: [
          { soldOut: { $ne: true } },
          { soldOut: { $exists: false } },
          { stockQuantity: { $gt: 0 } }
        ]
      });
    }

    if (inStock === true || inStock === 'true') {
      this.andConditions.push({
        $or: [
          { stockQuantity: { $gt: 0 } },
          { stockQuantity: { $exists: false } }
        ]
      });
    }
    return this;
  }

  /**
   * Add sale filter
   * @param {boolean} isSale - Only sale items
   * @returns {FilterBuilder}
   */
  addSaleFilter(isSale) {
    if (isSale === true || isSale === 'true') {
      this.query.isSale = true;
    }
    return this;
  }

  /**
   * Add new items filter
   * @param {boolean} isNew - Only new items (within 30 days)
   * @returns {FilterBuilder}
   */
  addNewItemsFilter(isNew) {
    if (isNew === true || isNew === 'true') {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      this.query.createdAt = { $gte: thirtyDaysAgo };
    }
    return this;
  }

  /**
   * Add views filter
   * @param {number} minViews - Minimum views
   * @param {number} maxViews - Maximum views
   * @returns {FilterBuilder}
   */
  addViewsFilter(minViews, maxViews) {
    if (minViews !== undefined || maxViews !== undefined) {
      this.query.views = {};
      if (minViews !== undefined && !isNaN(minViews)) {
        this.query.views.$gte = parseInt(minViews);
      }
      if (maxViews !== undefined && !isNaN(maxViews)) {
        this.query.views.$lte = parseInt(maxViews);
      }
    }
    return this;
  }

  /**
   * Add date range filter
   * @param {Object} dateRange - Date range object
   * @returns {FilterBuilder}
   */
  addDateRangeFilter(dateRange) {
    if (dateRange && (dateRange.startDate || dateRange.endDate)) {
      this.query.createdAt = {};
      if (dateRange.startDate) {
        this.query.createdAt.$gte = new Date(dateRange.startDate);
      }
      if (dateRange.endDate) {
        const endDate = new Date(dateRange.endDate);
        endDate.setHours(23, 59, 59, 999);
        this.query.createdAt.$lte = endDate;
      }
    }
    return this;
  }

  /**
   * Add tags filter
   * @param {Array} tags - Tag names
   * @returns {FilterBuilder}
   */
  addTagsFilter(tags) {
    if (Array.isArray(tags) && tags.length > 0) {
      const validTags = tags.filter(t => t && typeof t === 'string');
      if (validTags.length > 0) {
        this.query.tags = { $in: validTags.map(t => new RegExp(t, 'i')) };
      }
    }
    return this;
  }

  /**
   * Add status filter (only active products)
   * @returns {FilterBuilder}
   */
  addStatusFilter() {
    this.query.status = true;
    return this;
  }

  /**
   * Build final query
   * @returns {Object} MongoDB query
   */
  build() {
    if (this.andConditions.length > 0) {
      this.query.$and = this.andConditions;
    }
    return { query: this.query, debug: this.debug };
  }

  /**
   * Reset builder
   * @returns {FilterBuilder}
   */
  reset() {
    this.query = {};
    this.andConditions = [];
    return this;
  }
}

module.exports = FilterBuilder;