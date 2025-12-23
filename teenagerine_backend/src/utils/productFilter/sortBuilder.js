/**
 * Sort Builder for ProductFilter
 * Handles all sorting logic and options
 */
class SortBuilder {
  constructor() {
    this.sortOptions = this.getAllSortOptions();
  }

  /**
   * Get all available sort options
   * @returns {Object} Sort options mapping
   */
  getAllSortOptions() {
    return {
      // Position based
      "position_asc": { position: 1, createdAt: -1 },
      "position_desc": { position: -1, createdAt: -1 },
      
      // Price based
      "price_asc": { price: 1, createdAt: -1 },
      "price_desc": { price: -1, createdAt: -1 },
      "low_to_high": { price: 1, createdAt: -1 },
      "high_to_low": { price: -1, createdAt: -1 },
      
      // Date based
      "latest": { createdAt: -1 },
      "newest": { createdAt: -1 },
      "createdAt_desc": { createdAt: -1 },
      "oldest": { createdAt: 1 },
      "createdAt_asc": { createdAt: 1 },
      
      // Popularity based
      "popular": { views: -1, createdAt: -1 },
      "most_viewed": { views: -1, createdAt: -1 },
      "trending": { views: -1, createdAt: -1, isSale: -1 },
      "bestselling": { soldCount: -1, views: -1 },
      "best_selling": { soldCount: -1, views: -1 },
      
      // Rating based
      "rating_desc": { averageRating: -1, createdAt: -1 },
      "rating_asc": { averageRating: 1, createdAt: -1 },
      "highest_rated": { averageRating: -1, createdAt: -1 },
      "lowest_rated": { averageRating: 1, createdAt: -1 },
      
      // Name based
      "name_asc": { name: 1 },
      "name_desc": { name: -1 },
      "a_to_z": { name: 1 },
      "z_to_a": { name: -1 },
      
      // Relevance (for search)
      "relevance": null, // Special handling needed
      
      // Sale based
      "sale_first": { isSale: -1, createdAt: -1 },
      "discount_high": { "discountPercentage": -1, createdAt: -1 },
      
      // Stock based
      "in_stock_first": { stockQuantity: -1, createdAt: -1 },
      
      // Featured/Random
      "featured": { isFeatured: -1, createdAt: -1 },
      "random": null // Special handling needed
    };
  }

  /**
   * Build sort query based on sort type and search term
   * @param {string} sort - Sort type
   * @param {string} searchTerm - Search term for relevance sorting
   * @returns {Object} MongoDB sort query
   */
  buildSortQuery(sort, searchTerm = '') {
    const normalizedSort = sort ? sort.toLowerCase().trim() : 'latest';
    
    // Handle special cases first
    if (normalizedSort === 'relevance') {
      return this.buildRelevanceSort(searchTerm);
    }
    
    if (normalizedSort === 'random') {
      return this.buildRandomSort();
    }
    
    // Get predefined sort or default to latest
    const sortQuery = this.sortOptions[normalizedSort] || this.sortOptions['latest'];
    
    return sortQuery;
  }

  /**
   * Build relevance sort for search results
   * @param {string} searchTerm - Search term
   * @returns {Object} Sort query with text score
   */
  buildRelevanceSort(searchTerm) {
    if (searchTerm && searchTerm.trim()) {
      return { 
        score: { $meta: "textScore" }, 
        createdAt: -1 
      };
    } else {
      // No search term, fallback to latest
      return this.sortOptions['latest'];
    }
  }

  /**
   * Build random sort
   * Note: For random sorting, you would typically use aggregation with $sample
   * @returns {Object} Sort query
   */
  buildRandomSort() {
    // Return a sort that can be used with aggregation $sample
    return { _id: 1 }; // Placeholder, actual random sorting needs aggregation pipeline
  }

  /**
   * Validate sort option
   * @param {string} sort - Sort option to validate
   * @returns {boolean} Is valid sort option
   */
  isValidSortOption(sort) {
    if (!sort || typeof sort !== 'string') {
      return false;
    }
    
    const normalizedSort = sort.toLowerCase().trim();
    return Object.keys(this.sortOptions).includes(normalizedSort);
  }

  /**
   * Get available sort options for frontend
   * @returns {Array} Array of sort option objects
   */
  getAvailableSortOptions() {
    return [
      { value: 'relevance', label: 'Most Relevant', category: 'search' },
      { value: 'latest', label: 'Latest', category: 'date' },
      { value: 'popular', label: 'Most Popular', category: 'popularity' },
      { value: 'price_asc', label: 'Price: Low to High', category: 'price' },
      { value: 'price_desc', label: 'Price: High to Low', category: 'price' },
      { value: 'highest_rated', label: 'Highest Rated', category: 'rating' },
      { value: 'bestselling', label: 'Best Selling', category: 'sales' },
      { value: 'trending', label: 'Trending', category: 'popularity' },
      { value: 'a_to_z', label: 'Name: A to Z', category: 'alphabetical' },
      { value: 'z_to_a', label: 'Name: Z to A', category: 'alphabetical' },
      { value: 'newest', label: 'Newest First', category: 'date' },
      { value: 'oldest', label: 'Oldest First', category: 'date' },
      { value: 'sale_first', label: 'Sale Items First', category: 'sale' },
      { value: 'in_stock_first', label: 'In Stock First', category: 'availability' },
      { value: 'featured', label: 'Featured Products', category: 'special' }
    ];
  }

  /**
   * Get sort categories for grouping in frontend
   * @returns {Object} Sort categories
   */
  getSortCategories() {
    return {
      search: 'Search Relevance',
      date: 'Date',
      price: 'Price',
      popularity: 'Popularity',
      rating: 'Rating',
      sales: 'Sales Performance',
      alphabetical: 'Alphabetical',
      sale: 'Sale & Discounts',
      availability: 'Availability',
      special: 'Special'
    };
  }

  /**
   * Build sort query with fallback sorting
   * @param {string} primarySort - Primary sort option
   * @param {string} fallbackSort - Fallback sort option
   * @returns {Object} Combined sort query
   */
  buildCombinedSort(primarySort, fallbackSort = 'createdAt_desc') {
    const primary = this.buildSortQuery(primarySort);
    const fallback = this.buildSortQuery(fallbackSort);
    
    // Merge sort objects, primary takes precedence
    return { ...fallback, ...primary };
  }

  /**
   * Build aggregation pipeline sort stage
   * @param {string} sort - Sort type
   * @param {string} searchTerm - Search term
   * @returns {Object} Aggregation sort stage
   */
  buildAggregationSort(sort, searchTerm = '') {
    const sortQuery = this.buildSortQuery(sort, searchTerm);
    
    if (sort === 'random') {
      // For random sorting, return sample stage instead of sort
      return { $sample: { size: 1000 } }; // Adjust size as needed
    }
    
    return { $sort: sortQuery };
  }
}

module.exports = SortBuilder;