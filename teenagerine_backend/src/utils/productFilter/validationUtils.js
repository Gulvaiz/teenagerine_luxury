/**
 * Validation utilities for ProductFilter
 */

/**
 * Validate and normalize pagination parameters
 * @param {number|string} page - Page number
 * @param {number|string} limit - Items per page
 * @returns {Object} Validated pagination
 */
exports.validatePagination = (page, limit) => {
  const pageNum = Math.max(1, parseInt(page) || 1);
  const limitNum = Math.min(2000, Math.max(1, parseInt(limit) || 20));
  
  return {
    page: pageNum,
    limit: limitNum,
    skip: (pageNum - 1) * limitNum
  };
};

/**
 * Validate price range
 * @param {number|string} minPrice - Minimum price
 * @param {number|string} maxPrice - Maximum price
 * @returns {Object} Validated price range
 */
exports.validatePriceRange = (minPrice, maxPrice) => {
  const result = {};
  
  if (minPrice !== undefined && minPrice !== null && minPrice !== '') {
    const min = parseFloat(minPrice);
    if (!isNaN(min) && min >= 0) {
      result.minPrice = min;
    }
  }
  
  if (maxPrice !== undefined && maxPrice !== null && maxPrice !== '') {
    const max = parseFloat(maxPrice);
    if (!isNaN(max) && max >= 0) {
      result.maxPrice = max;
    }
  }
  
  // Ensure min is not greater than max
  if (result.minPrice && result.maxPrice && result.minPrice > result.maxPrice) {
    [result.minPrice, result.maxPrice] = [result.maxPrice, result.minPrice];
  }
  
  return result;
};

/**
 * Validate and filter array parameters
 * @param {*} input - Input to validate as array
 * @param {string} type - Expected type of array elements
 * @returns {Array} Validated array
 */
exports.validateArrayParameter = (input, type = 'string') => {
  if (!Array.isArray(input)) {
    return [];
  }
  
  return input.filter(item => {
    if (type === 'string') {
      return item && typeof item === 'string' && item.trim() !== '';
    }
    if (type === 'number') {
      return !isNaN(item) && item !== null && item !== '';
    }
    return item !== null && item !== undefined;
  });
};

/**
 * Validate gender parameter - returns empty array for deselection
 * @param {*} gender - Gender input
 * @returns {Array|string|null} Validated gender
 */
exports.validateGender = (gender) => {
  const validGenders = ['men', 'women', 'kids', 'unisex'];
  
  if (Array.isArray(gender)) {
    const filtered = gender.filter(g => 
      g && typeof g === 'string' && validGenders.includes(g.toLowerCase())
    );
    // Return empty array for deselection (allows showing all products)
    return filtered.map(g => g.toLowerCase());
  }
  
  if (typeof gender === 'string' && gender.trim()) {
    const normalized = gender.toLowerCase();
    return validGenders.includes(normalized) ? normalized : null;
  }
  
  // Return empty array instead of null for better filter handling
  return [];
};

/**
 * Validate boolean parameter
 * @param {*} value - Value to validate as boolean
 * @returns {boolean} Validated boolean
 */
exports.validateBoolean = (value) => {
  if (typeof value === 'boolean') {
    return value;
  }
  
  if (typeof value === 'string') {
    return value.toLowerCase() === 'true';
  }
  
  return false;
};

/**
 * Validate date range
 * @param {Object} dateRange - Date range object
 * @returns {Object|null} Validated date range
 */
exports.validateDateRange = (dateRange) => {
  if (!dateRange || typeof dateRange !== 'object') {
    return null;
  }
  
  const result = {};
  
  if (dateRange.startDate) {
    const startDate = new Date(dateRange.startDate);
    if (!isNaN(startDate.getTime())) {
      result.startDate = startDate;
    }
  }
  
  if (dateRange.endDate) {
    const endDate = new Date(dateRange.endDate);
    if (!isNaN(endDate.getTime())) {
      result.endDate = endDate;
    }
  }
  
  // Ensure start date is not after end date
  if (result.startDate && result.endDate && result.startDate > result.endDate) {
    [result.startDate, result.endDate] = [result.endDate, result.startDate];
  }
  
  return Object.keys(result).length > 0 ? result : null;
};

/**
 * Validate search term
 * @param {string} search - Search term
 * @returns {string|null} Validated search term
 */
exports.validateSearchTerm = (search) => {
  if (!search || typeof search !== 'string') {
    return null;
  }
  
  const trimmed = search.trim();
  
  // Must be at least 1 character after trimming
  if (trimmed.length === 0) {
    return null;
  }
  
  // Optional: Limit search term length
  if (trimmed.length > 200) {
    return trimmed.substring(0, 200);
  }
  
  return trimmed;
};

/**
 * Validate views range
 * @param {number|string} minViews - Minimum views
 * @param {number|string} maxViews - Maximum views
 * @returns {Object} Validated views range
 */
exports.validateViewsRange = (minViews, maxViews) => {
  const result = {};
  
  if (minViews !== undefined && !isNaN(minViews)) {
    const min = parseInt(minViews);
    if (min >= 0) {
      result.minViews = min;
    }
  }
  
  if (maxViews !== undefined && !isNaN(maxViews)) {
    const max = parseInt(maxViews);
    if (max >= 0) {
      result.maxViews = max;
    }
  }
  
  // Ensure min is not greater than max
  if (result.minViews && result.maxViews && result.minViews > result.maxViews) {
    [result.minViews, result.maxViews] = [result.maxViews, result.minViews];
  }
  
  return result;
};

/**
 * Sanitize and validate all filter parameters
 * @param {Object} params - Raw parameters from request
 * @returns {Object} Validated and sanitized parameters
 */
exports.validateFilterParameters = (params) => {
  if (!params || typeof params !== 'object') {
    params = {};
  }

  const validated = {};
  
  // Basic parameters
  validated.search = exports.validateSearchTerm(params.search);
  validated.gender = exports.validateGender(params.gender);
  
  // Array parameters
  validated.categories = exports.validateArrayParameter(params.categories);
  validated.brands = exports.validateArrayParameter(params.brands);
  validated.colors = exports.validateArrayParameter(params.colors);
  validated.sizes = exports.validateArrayParameter(params.sizes);
  validated.conditions = exports.validateArrayParameter(params.conditions);
  validated.tags = exports.validateArrayParameter(params.tags);
  
  // Price parameters
  const priceRange = exports.validatePriceRange(params.minPrice, params.maxPrice);
  validated.minPrice = priceRange.minPrice;
  validated.maxPrice = priceRange.maxPrice;
  validated.priceRange = params.priceRange;
  
  // Boolean parameters
  validated.isSale = exports.validateBoolean(params.isSale);
  validated.isNew = exports.validateBoolean(params.isNew);
  validated.inStock = exports.validateBoolean(params.inStock);
  validated.includeSoldOut = exports.validateBoolean(params.includeSoldOut);
  
  // Views range
  const viewsRange = exports.validateViewsRange(params.minViews, params.maxViews);
  validated.minViews = viewsRange.minViews;
  validated.maxViews = viewsRange.maxViews;
  
  // Date range
  validated.dateRange = exports.validateDateRange(params.dateRange);
  
  // Pagination
  const pagination = exports.validatePagination(params.page, params.limit);
  validated.page = pagination.page;
  validated.limit = pagination.limit;
  validated.skip = pagination.skip;
  
  // Sort
  validated.sort = params.sort || 'latest';
  
  return validated;
};