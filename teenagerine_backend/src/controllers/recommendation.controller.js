const Product = require('../models/product.model');
const RecommendationService = require('../services/recommendationService');

// Get product recommendations
exports.getProductRecommendations = async (req, res) => {
  try {
    const { productId } = req.params;
    const { 
      limit = 8, 
      type = 'all', // 'all', 'complementary', 'similar', 'popular'
      excludeOutOfStock = false 
    } = req.query;

    // Find the base product
    const baseProduct = await Product.findById(productId)
      .populate('primaryCategory', 'name')
      .populate('categories.categoryId', 'name')
      .populate('primaryBrand', 'name')
      .populate('brands.brandId', 'name');

    if (!baseProduct) {
      return res.status(404).json({
        status: 'fail',
        message: 'Product not found'
      });
    }

    // Increment views for the product
    await Product.findByIdAndUpdate(productId, { 
      $inc: { views: 1 } 
    });

    // Get recommendations based on type
    let options = {
      limit: parseInt(limit),
      excludeOutOfStock: excludeOutOfStock === 'true',
      includeComplementary: type === 'all' || type === 'complementary',
      includeSimilar: type === 'all' || type === 'similar', 
      includePopular: type === 'all' || type === 'popular'
    };

    const recommendations = await RecommendationService.getRecommendations(baseProduct, options);

    res.status(200).json({
      status: 'success',
      results: recommendations.length,
      data: {
        baseProduct: {
          _id: baseProduct._id,
          name: baseProduct.name,
          category: baseProduct.primaryCategory?.name,
          subcategory: baseProduct.categories?.[0]?.categoryId?.name,
          brand: baseProduct.primaryBrand?.name,
          gender: baseProduct.gender,
          style: baseProduct.style
        },
        recommendations: recommendations.map(product => ({
          _id: product._id,
          name: product.name,
          slug: product.slug,
          sellingPrice: product.salePrice || product.price,
          retailPrice: product.retailPrice,
          salePrice: product.salePrice,
          discount: product.discount,
          images: product.images,
          brand: product.primaryBrand,
          category: product.primaryCategory,
          subcategory: product.categories?.[0]?.categoryId,
          colors: product.colors,
          rating: product.rating,
          views: product.views,
          stockQuantity: product.stockQuantity,
          gender: product.gender,
          style: product.style,
          tags: product.tags,
          isSale: product.isSale,
          isFeatured: product.isFeatured,
          // Recommendation metadata
          recommendationType: product.recommendationType,
          score: Math.round(product.score * 10) / 10
        }))
      }
    });
  } catch (error) {
    console.error('Error getting product recommendations:', error);
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// Get complementary products only
exports.getComplementaryProducts = async (req, res) => {
  try {
    const { productId } = req.params;
    const { limit = 6 } = req.query;

    const baseProduct = await Product.findById(productId)
      .populate('primaryCategory', 'name')
      .populate('categories.categoryId', 'name')
      .populate('primaryBrand', 'name')
      .populate('brands.brandId', 'name');

    if (!baseProduct) {
      return res.status(404).json({
        status: 'fail',
        message: 'Product not found'
      });
    }

    const recommendations = await RecommendationService.getRecommendations(baseProduct, {
      limit: parseInt(limit),
      includeComplementary: true,
      includeSimilar: false,
      includePopular: false
    });

    res.status(200).json({
      status: 'success',
      results: recommendations.length,
      data: {
        recommendations
      }
    });
  } catch (error) {
    console.error('Error getting complementary products:', error);
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// Get similar products only
exports.getSimilarProducts = async (req, res) => {
  try {
    const { productId } = req.params;
    const { limit = 6 } = req.query;

    const baseProduct = await Product.findById(productId)
      .populate('primaryCategory', 'name')
      .populate('categories.categoryId', 'name')
      .populate('primaryBrand', 'name')
      .populate('brands.brandId', 'name');

    if (!baseProduct) {
      return res.status(404).json({
        status: 'fail',
        message: 'Product not found'
      });
    }

    const recommendations = await RecommendationService.getRecommendations(baseProduct, {
      limit: parseInt(limit),
      includeComplementary: false,
      includeSimilar: true,
      includePopular: false
    });

    res.status(200).json({
      status: 'success',
      results: recommendations.length,
      data: {
        recommendations
      }
    });
  } catch (error) {
    console.error('Error getting similar products:', error);
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// Get trending/popular products
exports.getTrendingProducts = async (req, res) => {
  try {
    const { 
      limit = 12, 
      category,
      gender,
      timeframe = '7d' // '1d', '7d', '30d'
    } = req.query;

    let dateFilter = new Date();
    switch (timeframe) {
      case '1d':
        dateFilter.setDate(dateFilter.getDate() - 1);
        break;
      case '7d':
        dateFilter.setDate(dateFilter.getDate() - 7);
        break;
      case '30d':
        dateFilter.setDate(dateFilter.getDate() - 30);
        break;
      default:
        dateFilter.setDate(dateFilter.getDate() - 7);
    }

    const query = {
      status: true,
      createdAt: { $gte: dateFilter }
    };

    if (category) {
      query['primaryCategory.name'] = new RegExp(category, 'i');
    }

    if (gender) {
      query.gender = gender;
    }

    const trendingProducts = await Product.find(query)
      .populate('primaryCategory', 'name')
      .populate('categories.categoryId', 'name')
      .populate('primaryBrand', 'name')
      .populate('brands.brandId', 'name')
      .sort({
        views: -1,
        rating: -1,
        createdAt: -1
      })
      .limit(parseInt(limit))
      .lean();

    res.status(200).json({
      status: 'success',
      results: trendingProducts.length,
      data: {
        products: trendingProducts
      }
    });
  } catch (error) {
    console.error('Error getting trending products:', error);
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

// Get outfit suggestions (complete look recommendations)
exports.getOutfitSuggestions = async (req, res) => {
  try {
    const { productId } = req.params;
    const { budget, occasion = 'casual' } = req.query;

    const baseProduct = await Product.findById(productId)
      .populate('primaryCategory', 'name')
      .populate('categories.categoryId', 'name')
      .populate('primaryBrand', 'name')
      .populate('brands.brandId', 'name');

    if (!baseProduct) {
      return res.status(404).json({
        status: 'fail',
        message: 'Product not found'
      });
    }

    // Get comprehensive outfit recommendations
    const outfitRecommendations = await RecommendationService.getRecommendations(baseProduct, {
      limit: 12,
      includeComplementary: true,
      includeSimilar: false,
      includePopular: true
    });

    // Group by product type for complete outfit
    const outfit = {
      base: baseProduct,
      tops: [],
      bottoms: [],
      shoes: [],
      accessories: [],
      outerwear: []
    };

    outfitRecommendations.forEach(product => {
      const categoryName = product.primaryCategory?.name?.toLowerCase() || '';
      const subcategoryName = product.categories?.[0]?.categoryId?.name?.toLowerCase() || '';
      
      if (categoryName.includes('shirt') || categoryName.includes('top') || categoryName.includes('tshirt')) {
        outfit.tops.push(product);
      } else if (categoryName.includes('jeans') || categoryName.includes('trouser') || categoryName.includes('pant')) {
        outfit.bottoms.push(product);
      } else if (categoryName.includes('shoe') || categoryName.includes('sneaker') || categoryName.includes('boot')) {
        outfit.shoes.push(product);
      } else if (categoryName.includes('accessories') || categoryName.includes('belt') || categoryName.includes('watch')) {
        outfit.accessories.push(product);
      } else if (categoryName.includes('jacket') || categoryName.includes('blazer') || categoryName.includes('coat')) {
        outfit.outerwear.push(product);
      }
    });

    // Calculate total outfit price if budget is specified
    let totalPrice = 0;
    let suggestedOutfit = [];
    
    if (budget) {
      const budgetAmount = parseFloat(budget);
      let remainingBudget = budgetAmount - (baseProduct.salePrice || baseProduct.price);
      
      // Add one item from each category within budget
      [outfit.tops, outfit.bottoms, outfit.shoes, outfit.accessories].forEach(items => {
        const affordableItems = items.filter(item => (item.salePrice || item.price) <= remainingBudget);
        if (affordableItems.length > 0) {
          const selectedItem = affordableItems[0];
          suggestedOutfit.push(selectedItem);
          remainingBudget -= (selectedItem.salePrice || selectedItem.price);
        }
      });
      
      totalPrice = budgetAmount - remainingBudget;
    }

    res.status(200).json({
      status: 'success',
      data: {
        baseProduct,
        outfit: budget ? suggestedOutfit : outfit,
        totalPrice: budget ? totalPrice : null,
        occasion,
        suggestions: {
          message: `Complete your ${occasion} look with these perfectly matched pieces`,
          tips: [
            `This ${baseProduct.primaryCategory?.name} pairs perfectly with ${outfit.tops.length > 0 ? outfit.tops[0].primaryCategory?.name : 'complementary pieces'}`,
            `Add ${outfit.accessories.length > 0 ? outfit.accessories[0].primaryCategory?.name : 'accessories'} to complete the look`,
            `Consider ${outfit.shoes.length > 0 ? outfit.shoes[0].primaryCategory?.name : 'appropriate footwear'} for the perfect finish`
          ]
        }
      }
    });
  } catch (error) {
    console.error('Error getting outfit suggestions:', error);
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};