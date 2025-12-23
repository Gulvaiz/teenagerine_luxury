const Category = require("../../models/category.model");
const Brand = require("../../models/brand.model");

/**
 * Builds comprehensive search query that searches across all product fields
 * including categories, brands, and product fields
 * @param {string} searchTerm - The search term
 * @returns {Object} MongoDB query object
 */
exports.buildSearchQuery = async (searchTerm) => {
  if (!searchTerm || searchTerm.trim() === "") {
    return {};
  }

  const normalizedSearchTerm = searchTerm.trim().toLowerCase();
  const searchRegex = new RegExp(normalizedSearchTerm, 'i');

  // Search in categories and get their IDs
  const matchingCategories = await Category.find({
    $or: [
      { name: { $regex: searchRegex } },
      { description: { $regex: searchRegex } },
      { slug: { $regex: searchRegex } }
    ]
  }).select("_id");

  const categoryIds = matchingCategories.map(cat => cat._id);

  // Search in brands and get their IDs  
  const matchingBrands = await Brand.find({
    $or: [
      { name: { $regex: searchRegex } },
      { description: { $regex: searchRegex } },
      { slug: { $regex: searchRegex } }
    ]
  }).select("_id");

  const brandIds = matchingBrands.map(brand => brand._id);

  // Build comprehensive search query
  const searchQuery = {
    $or: [
      // Direct product field searches
      { name: { $regex: searchRegex } },
      { description: { $regex: searchRegex } },
      { sku: { $regex: searchRegex } },
      { slug: { $regex: searchRegex } },
      { "seo.metaTitle": { $regex: searchRegex } },
      { "seo.metaDescription": { $regex: searchRegex } },
      
      // Array field searches
      { tags: { $in: [searchRegex] } },
      { "colors.color": { $regex: searchRegex } },
      { "sizes.size": { $regex: searchRegex } },
      
      // Category searches (both primary and categories array)
      ...(categoryIds.length > 0 ? [
        { "categories.categoryId": { $in: categoryIds } },
        { "primaryCategory": { $in: categoryIds } }
      ] : []),
      
      // Brand searches (both primary and brands array)
      ...(brandIds.length > 0 ? [
        { "brands.brandId": { $in: brandIds } },
        { "primaryBrand": { $in: brandIds } }
      ] : []),

      // Gender search (if search term matches gender)
      ...(isGenderSearchTerm(normalizedSearchTerm) ? [
        { gender: normalizeGenderSearchTerm(normalizedSearchTerm) }
      ] : []),

      // Condition search (if search term matches condition)
      ...(isConditionSearchTerm(normalizedSearchTerm) ? [
        { condition: normalizeConditionSearchTerm(normalizedSearchTerm) }
      ] : [])
    ]
  };

  return searchQuery;
};

/**
 * Builds text search query for MongoDB text index (if available)
 * @param {string} searchTerm - The search term
 * @returns {Object} MongoDB text search query
 */
exports.buildTextSearchQuery = (searchTerm) => {
  if (!searchTerm || searchTerm.trim() === "") {
    return {};
  }

  return {
    $text: { 
      $search: searchTerm.trim(),
      $caseSensitive: false,
      $diacriticSensitive: false
    }
  };
};

/**
 * Builds search suggestions based on partial matches
 * @param {string} searchTerm - The search term
 * @param {number} limit - Number of suggestions to return
 * @returns {Object} Search suggestions
 */
exports.buildSearchSuggestions = async (searchTerm, limit = 5) => {
  if (!searchTerm || searchTerm.trim() === "" || searchTerm.length < 2) {
    return { categories: [], brands: [], tags: [] };
  }

  const searchRegex = new RegExp(`^${searchTerm.trim()}`, 'i');

  const [categories, brands] = await Promise.all([
    Category.find({ name: { $regex: searchRegex } })
      .select("name")
      .limit(limit)
      .lean(),
    Brand.find({ name: { $regex: searchRegex } })
      .select("name") 
      .limit(limit)
      .lean()
  ]);

  return {
    categories: categories.map(c => c.name),
    brands: brands.map(b => b.name),
    suggestions: [
      ...categories.map(c => ({ type: 'category', value: c.name })),
      ...brands.map(b => ({ type: 'brand', value: b.name }))
    ].slice(0, limit)
  };
};

/**
 * Check if search term is a gender keyword
 * @param {string} term - Search term
 * @returns {boolean}
 */
function isGenderSearchTerm(term) {
  const genderKeywords = ['men', 'women', 'kids', 'unisex', 'male', 'female', 'children'];
  return genderKeywords.includes(term.toLowerCase());
}

/**
 * Normalize gender search term to match database values
 * @param {string} term - Search term
 * @returns {string}
 */
function normalizeGenderSearchTerm(term) {
  const genderMappings = {
    'male': 'men',
    'female': 'women', 
    'children': 'kids',
    'child': 'kids'
  };
  
  return genderMappings[term.toLowerCase()] || term.toLowerCase();
}

/**
 * Check if search term is a condition keyword
 * @param {string} term - Search term
 * @returns {boolean}
 */
function isConditionSearchTerm(term) {
  const conditionKeywords = [
    'new', 'pristine', 'good', 'used', 'gently', 'fairly',
    'new with tags', 'new without tags', 'good condition',
    'gently used', 'used fairly well'
  ];
  
  return conditionKeywords.some(keyword => 
    term.toLowerCase().includes(keyword.toLowerCase())
  );
}

/**
 * Normalize condition search term to match database enum values
 * @param {string} term - Search term
 * @returns {string}
 */
function normalizeConditionSearchTerm(term) {
  const lowerTerm = term.toLowerCase();
  
  if (lowerTerm.includes('new with tags')) return 'New With Tags';
  if (lowerTerm.includes('new without tags')) return 'New Without Tags';
  if (lowerTerm.includes('pristine')) return 'Pristine';
  if (lowerTerm.includes('good condition') || lowerTerm === 'good') return 'Good Condition';
  if (lowerTerm.includes('gently used')) return 'Gently Used';
  if (lowerTerm.includes('used fairly well') || lowerTerm.includes('fairly')) return 'Used Fairly Well';
  
  return term;
}