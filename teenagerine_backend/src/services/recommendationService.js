const Product = require('../models/product.model');

class RecommendationService {
  // Complementary products mapping for intelligent suggestions
  static COMPLEMENTARY_PRODUCTS = {
    // Men's category complementary items
    'men-jeans': ['men-tshirt', 'men-shirt', 'men-belt', 'men-shoes', 'men-jacket'],
    'men-tshirt': ['men-jeans', 'men-shorts', 'men-jacket', 'men-shoes', 'men-watch'],
    'men-shirt': ['men-jeans', 'men-trousers', 'men-belt', 'men-shoes', 'men-blazer'],
    'men-jacket': ['men-jeans', 'men-tshirt', 'men-shirt', 'men-shoes'],
    'men-shoes': ['men-jeans', 'men-tshirt', 'men-shirt', 'men-socks'],
    'men-belt': ['men-jeans', 'men-trousers', 'men-shirt'],
    'men-watch': ['men-shirt', 'men-blazer', 'men-tshirt'],
    
    // Women's category complementary items
    'women-dress': ['women-heels', 'women-handbag', 'women-jewelry', 'women-cardigan'],
    'women-top': ['women-jeans', 'women-skirt', 'women-jacket', 'women-handbag'],
    'women-jeans': ['women-top', 'women-tshirt', 'women-heels', 'women-handbag'],
    'women-handbag': ['women-dress', 'women-top', 'women-heels', 'women-jewelry'],
    'women-heels': ['women-dress', 'women-jeans', 'women-handbag'],
    'women-jewelry': ['women-dress', 'women-top', 'women-handbag'],
    
    // Accessories
    'accessories-belt': ['men-jeans', 'men-trousers', 'women-jeans', 'women-skirt'],
    'accessories-bag': ['women-dress', 'women-top', 'men-shirt'],
    'accessories-watch': ['men-shirt', 'women-dress', 'men-blazer'],
    'accessories-jewelry': ['women-dress', 'women-top'],
  };

  // Style compatibility matrix
  static STYLE_COMPATIBILITY = {
    'casual': ['streetwear', 'sporty', 'bohemian'],
    'formal': ['business', 'elegant', 'classic'],
    'streetwear': ['casual', 'sporty', 'urban'],
    'sporty': ['casual', 'streetwear', 'athletic'],
    'elegant': ['formal', 'classic', 'sophisticated'],
    'vintage': ['retro', 'classic', 'bohemian'],
  };

  // Color compatibility
  static COLOR_COMPATIBILITY = {
    'black': ['white', 'gray', 'red', 'blue', 'yellow'],
    'white': ['black', 'blue', 'red', 'green', 'pink'],
    'blue': ['white', 'black', 'gray', 'brown', 'yellow'],
    'red': ['black', 'white', 'gray', 'blue'],
    'gray': ['black', 'white', 'blue', 'red', 'yellow'],
    'brown': ['white', 'blue', 'green', 'beige'],
    'green': ['white', 'brown', 'black', 'beige'],
  };

  /**
   * Get intelligent product recommendations
   * @param {Object} baseProduct - The product being viewed
   * @param {Object} options - Recommendation options
   * @returns {Array} Array of recommended products
   */
  static async getRecommendations(baseProduct, options = {}) {
    const {
      limit = 8,
      includeComplementary = true,
      includeSimilar = true,
      includePopular = true,
      excludeOutOfStock = false
    } = options;

    try {
      const recommendations = new Map();
      
      // 1. Get complementary products (40% weight)
      if (includeComplementary) {
        const complementary = await this.getComplementaryProducts(baseProduct, Math.ceil(limit * 0.4));
        complementary.forEach(product => {
          // Convert to plain object - handle both Mongoose docs and plain objects
          const plainProduct = product.toObject ? product.toObject() : { ...product };
          recommendations.set(product._id.toString(), {
            ...plainProduct,
            recommendationType: 'complementary',
            score: this.calculateComplementaryScore(baseProduct, product)
          });
        });
      }

      // 2. Get similar products (30% weight)
      if (includeSimilar) {
        const similar = await this.getSimilarProducts(baseProduct, Math.ceil(limit * 0.3));
        similar.forEach(product => {
          const id = product._id.toString();
          if (!recommendations.has(id)) {
            // Convert to plain object - handle both Mongoose docs and plain objects
            const plainProduct = product.toObject ? product.toObject() : { ...product };
            recommendations.set(id, {
              ...plainProduct,
              recommendationType: 'similar',
              score: this.calculateSimilarityScore(baseProduct, product)
            });
          }
        });
      }

      // 3. Get popular products in same category (30% weight)
      if (includePopular) {
        const popular = await this.getPopularProducts(baseProduct, Math.ceil(limit * 0.3));
        popular.forEach(product => {
          const id = product._id.toString();
          if (!recommendations.has(id)) {
            // Convert to plain object - handle both Mongoose docs and plain objects
            const plainProduct = product.toObject ? product.toObject() : { ...product };
            recommendations.set(id, {
              ...plainProduct,
              recommendationType: 'popular',
              score: this.calculatePopularityScore(product)
            });
          }
        });
      }

      // Convert to array and sort by score
      let recommendedProducts = Array.from(recommendations.values())
        .filter(product => product._id.toString() !== baseProduct._id.toString())
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);

      // Filter out out-of-stock if requested
      if (excludeOutOfStock) {
        recommendedProducts = recommendedProducts.filter(product => product.stockQuantity > 0);
      }

      return recommendedProducts;
    } catch (error) {
      console.error('Error getting recommendations:', error);
      return [];
    }
  }

  /**
   * Get complementary products based on product type and style
   */
  static async getComplementaryProducts(baseProduct, limit = 4) {
    try {
      const baseCategory = this.extractCategoryKey(baseProduct);
      const complementaryCategories = this.COMPLEMENTARY_PRODUCTS[baseCategory] || [];
      
      if (complementaryCategories.length === 0) {
        return [];
      }

      const query = {
        _id: { $ne: baseProduct._id },
        status: true,
        $or: [
          // Direct category matches
          ...complementaryCategories.map(cat => ({
            $or: [
              { 'primaryCategory.name': new RegExp(cat.split('-')[1], 'i') },
              { 'categories.categoryId.name': new RegExp(cat.split('-')[1], 'i') },
              { tags: new RegExp(cat.split('-')[1], 'i') }
            ]
          })),
          // Gender match for cross-category suggestions
          {
            gender: baseProduct.gender,
            'primaryCategory.name': { $ne: baseProduct.primaryCategory?.name }
          }
        ]
      };

      // Add style compatibility if available
      if (baseProduct.style) {
        const compatibleStyles = this.STYLE_COMPATIBILITY[baseProduct.style.toLowerCase()] || [];
        if (compatibleStyles.length > 0) {
          query.$or.push({
            style: { $in: compatibleStyles }
          });
        }
      }

      return await Product.find(query)
        .populate('primaryCategory', 'name')
        .populate('categories.categoryId', 'name')
        .populate('primaryBrand', 'name')
        .populate('brands.brandId', 'name')
        .limit(limit * 2) // Get more to filter later
        .lean();
    } catch (error) {
      console.error('Error getting complementary products:', error);
      return [];
    }
  }

  /**
   * Get similar products based on category, brand, style, price range
   */
  static async getSimilarProducts(baseProduct, limit = 3) {
    try {
      const basePrice = baseProduct.salePrice || baseProduct.price;
      const priceRange = {
        min: basePrice * 0.7,
        max: basePrice * 1.5
      };

      const query = {
        _id: { $ne: baseProduct._id },
        status: true,
        $or: [
          // Same category
          { 'primaryCategory._id': baseProduct.primaryCategory?._id },
          // Same brand with similar price
          {
            'primaryBrand._id': baseProduct.primaryBrand?._id,
            $or: [
              { salePrice: { $gte: priceRange.min, $lte: priceRange.max } },
              { price: { $gte: priceRange.min, $lte: priceRange.max } }
            ]
          },
          // Similar price range in same gender
          {
            gender: baseProduct.gender,
            $or: [
              { salePrice: { $gte: priceRange.min, $lte: priceRange.max } },
              { price: { $gte: priceRange.min, $lte: priceRange.max } }
            ]
          }
        ]
      };

      // Add style match if available
      if (baseProduct.style) {
        query.$or.push({ style: baseProduct.style });
      }

      // Add color compatibility
      if (baseProduct.colors && baseProduct.colors.length > 0) {
        const compatibleColors = [];
        baseProduct.colors.forEach(color => {
          // Handle both string and object formats for colors
          const colorName = typeof color === 'string' ? color : color.color || color.name;
          if (colorName) {
            const compatible = this.COLOR_COMPATIBILITY[colorName.toLowerCase()] || [];
            compatibleColors.push(...compatible);
          }
        });
        if (compatibleColors.length > 0) {
          // Query based on color structure - handle both string arrays and object arrays
          query.$or.push({
            $or: [
              // If colors is an array of strings
              { colors: { $in: compatibleColors } },
              // If colors is an array of objects with 'color' field
              { 'colors.color': { $in: compatibleColors } },
              // If colors is an array of objects with 'name' field
              { 'colors.name': { $in: compatibleColors } }
            ]
          });
        }
      }

      return await Product.find(query)
        .populate('primaryCategory', 'name')
        .populate('categories.categoryId', 'name')
        .populate('primaryBrand', 'name')
        .populate('brands.brandId', 'name')
        .limit(limit * 2)
        .lean();
    } catch (error) {
      console.error('Error getting similar products:', error);
      return [];
    }
  }

  /**
   * Get popular products in the same category
   */
  static async getPopularProducts(baseProduct, limit = 3) {
    try {
      const query = {
        _id: { $ne: baseProduct._id },
        status: true,
        gender: baseProduct.gender
      };

      // Prefer same category
      if (baseProduct.primaryCategory) {
        query['primaryCategory._id'] = baseProduct.primaryCategory._id;
      }

      return await Product.find(query)
        .populate('primaryCategory', 'name')
        .populate('categories.categoryId', 'name')
        .populate('primaryBrand', 'name')
        .populate('brands.brandId', 'name')
        .sort({ 
          views: -1, // Most viewed
          rating: -1, // Highest rated
          createdAt: -1 // Newest
        })
        .limit(limit)
        .lean();
    } catch (error) {
      console.error('Error getting popular products:', error);
      return [];
    }
  }

  /**
   * Calculate complementary score based on product attributes
   */
  static calculateComplementaryScore(baseProduct, product) {
    let score = 0;
    
    // Base complementary score
    score += 50;
    
    // Gender match bonus
    if (product.gender === baseProduct.gender) {
      score += 20;
    }
    
    // Style compatibility bonus
    if (baseProduct.style && product.style) {
      const compatibleStyles = this.STYLE_COMPATIBILITY[baseProduct.style.toLowerCase()] || [];
      if (compatibleStyles.includes(product.style.toLowerCase())) {
        score += 15;
      }
    }
    
    // Color compatibility bonus
    if (baseProduct.colors && product.colors) {
      const hasCompatibleColor = baseProduct.colors.some(baseColor => {
        // Handle both string and object formats for colors
        const baseColorName = typeof baseColor === 'string' ? baseColor : baseColor.color || baseColor.name;
        if (!baseColorName) return false;
        
        const compatible = this.COLOR_COMPATIBILITY[baseColorName.toLowerCase()] || [];
        return product.colors.some(productColor => {
          const productColorName = typeof productColor === 'string' ? productColor : productColor.color || productColor.name;
          return productColorName && compatible.includes(productColorName.toLowerCase());
        });
      });
      if (hasCompatibleColor) {
        score += 10;
      }
    }
    
    // Brand diversity bonus (different brands are often more interesting)
    if (product.primaryBrand?._id !== baseProduct.primaryBrand?._id) {
      score += 5;
    }
    
    return score;
  }

  /**
   * Calculate similarity score
   */
  static calculateSimilarityScore(baseProduct, product) {
    let score = 0;
    
    // Category match
    if (product.primaryCategory?._id?.toString() === baseProduct.primaryCategory?._id?.toString()) {
      score += 30;
    }
    
    // Brand match
    if (product.primaryBrand?._id?.toString() === baseProduct.primaryBrand?._id?.toString()) {
      score += 20;
    }
    
    // Price similarity (closer prices get higher scores)
    const productPrice = product.salePrice || product.price;
    const basePrice = baseProduct.salePrice || baseProduct.price;
    const priceDifference = Math.abs(productPrice - basePrice);
    const priceScore = Math.max(0, 15 - (priceDifference / basePrice) * 15);
    score += priceScore;
    
    // Style match
    if (product.style === baseProduct.style) {
      score += 10;
    }
    
    return score;
  }

  /**
   * Calculate popularity score
   */
  static calculatePopularityScore(product) {
    let score = 0;
    
    // Views
    score += Math.min(product.views || 0, 100) * 0.3;
    
    // Rating
    score += (product.rating || 0) * 10;
    
    // Stock availability
    if (product.stockQuantity > 0) {
      score += 20;
    }
    
    // Newness (products from last 30 days get bonus)
    const daysSinceCreated = (Date.now() - new Date(product.createdAt)) / (1000 * 60 * 60 * 24);
    if (daysSinceCreated <= 30) {
      score += 10;
    }
    
    return score;
  }

  /**
   * Extract category key for complementary product lookup
   */
  static extractCategoryKey(product) {
    const gender = product.gender?.toLowerCase() || '';
    const category = product.primaryCategory?.name?.toLowerCase() || '';
    const firstCategory = product.categories?.[0]?.categoryId?.name?.toLowerCase() || '';
    
    // Try to create a meaningful key
    let key = '';
    if (gender && category) {
      key = `${gender}-${category}`;
    } else if (gender && firstCategory) {
      key = `${gender}-${firstCategory}`;
    } else if (category) {
      key = category;
    } else if (firstCategory) {
      key = firstCategory;
    }
    
    // Handle common variations
    const keyMappings = {
      'men-pants': 'men-jeans',
      'men-trouser': 'men-jeans',
      'women-pants': 'women-jeans',
      'women-trouser': 'women-jeans',
      'men-sneakers': 'men-shoes',
      'women-sneakers': 'women-heels',
      'men-t-shirt': 'men-tshirt',
      'women-t-shirt': 'women-top',
      'men-polo': 'men-tshirt',
      'women-blouse': 'women-top'
    };
    
    return keyMappings[key] || key;
  }
}

module.exports = RecommendationService;