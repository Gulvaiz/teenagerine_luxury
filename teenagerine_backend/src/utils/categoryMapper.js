/**
 * Category Mapper
 * Maps AI-organized categories back to database categories for filtering
 */

class CategoryMapper {
  constructor() {
    // Mapping from AI subcategories to actual database category names
    this.subcategoryToDbCategory = new Map();
    
    // Gender-specific mappings
    this.genderMappings = {
      men: ['men', 'male', 'man', 'mens'],
      women: ['women', 'woman', 'female', 'ladies', 'womens'],
      kids: ['kids', 'kid', 'children', 'child', 'boy', 'girl', 'youth']
    };

    // Initialize the mapping
    this.initializeMapping();
  }

  /**
   * Initialize the mapping from subcategories to database categories
   */
  initializeMapping() {
    // This will be populated dynamically from the database
    // For now, we'll use common mappings
    const commonMappings = {
      // Bags
      'All Bags': ['ALL BAGS', 'BAGS', 'HANDBAGS', 'TOTE BAGS', 'SHOULDER BAGS', 'CROSSBODY BAGS', 'CLUTCH', 'MINI BAGS', 'SATCHEL BAGS', 'SLING BAGS', 'WRISTLET', 'BACKPACK', 'BELTBAG'],
      
      // Footwear
      'Footwear': ['BOOTS', 'HEELS & WEDGES', 'FLATS & SLIPPERS', 'SNEAKERS', 'ESPADRILLES', 'ESPADRILLES & LOAFERS', 'LOAFERS', 'LOAFERS & MOCCASINS', 'SLIDERS & SLIPPERS', 'PEEPTOES'],
      
      // Clothing
      'Clothing': ['DRESSES & GOWNS', 'SHORTS & SKIRTS', 'SKIRTS & SHORTS', 'T SHIRTS', 'T SHIRTS & SHIRTS', 'SHIRTS', 'HOODIES & SWEATSHIRTS', 'HOODIES AND SWEATSHIRTS', 'JACKETS & OUTERWEAR', 'CARDIGANS & JUMPERS', 'DENIMS & TROUSERS', 'TROUSERS & DENIMS', 'JUMPSUITS', 'PLAYSUIT & JUMPSUIT', 'SHORTS', 'CLOTING'],
      
      // Accessories
      'All Accessories': ['ALL ACCESSORIES', 'SMALL ACCESSORIES', 'BELTS', 'SCARVES', 'SHAWLS & SCARVES', 'CAPS', 'SUNGLASSES'],
      
      // Jewelry
      'Fine Jewellery': ['FINE JEWELLERY', 'EARRINGS', 'NECKLACES', 'RINGS', 'CHARMS & BRACELETS'],
      
      // Watches
      'Watches': ['WATCHES'],
      
      // Men specific
      'Accessories': ['TIES & CUFFLINKS', 'WALLET', 'WALLETS/CARD HOLDERS'],
      
      // Co-ord sets
      'Co-ord Sets Womens': ['CO-ORD SETS WOMENS'],
      'Co-ord Sets Mens': ['CO-ORD SETS MENS'],
    };

    // Populate the mapping
    Object.entries(commonMappings).forEach(([subcategory, dbCategories]) => {
      dbCategories.forEach(dbCategory => {
        this.subcategoryToDbCategory.set(dbCategory.toLowerCase(), subcategory);
      });
    });
  }

  /**
   * Update mapping with current database categories
   */
  async updateMappingFromDatabase(categoryModel, CategoryAI) {
    try {
      const categories = await categoryModel.find({ status: true }).select('name');
      const categoryAI = new CategoryAI();
      
      // Create reverse mapping
      const reverseMapping = new Map();
      
      categories.forEach(category => {
        const classification = categoryAI.classifyCategory(category.name);
        if (classification && classification.type === 'category') {
          const key = `${classification.group}-${classification.subcategory || classification.cleanedName}`.toLowerCase();
          
          if (!reverseMapping.has(key)) {
            reverseMapping.set(key, []);
          }
          reverseMapping.get(key).push(category.name);
        }
      });

      this.reverseMapping = reverseMapping;
      console.log('📝 Category mapping updated from database');
    } catch (error) {
      console.error('❌ Error updating category mapping:', error);
    }
  }

  /**
   * Convert AI category selection to database categories for filtering
   */
  convertCategorySelectionToDbCategories(selectedCategories) {
    const dbCategories = [];
    const genderFilters = [];
    
    selectedCategories.forEach(selection => {
      const parsed = this.parseCategorySelection(selection);
      
      if (parsed) {
        // Add gender filter
        if (parsed.gender && !genderFilters.includes(parsed.gender)) {
          genderFilters.push(parsed.gender);
        }
        
        // Find matching database categories
        const matchingCategories = this.findMatchingDbCategories(parsed.gender, parsed.subcategory);
        dbCategories.push(...matchingCategories);
      }
    });

    return {
      categories: [...new Set(dbCategories)], // Remove duplicates
      genderFilters: genderFilters,
      originalSelections: selectedCategories
    };
  }

  /**
   * Parse category selection (e.g., "men-all-bags" -> { gender: "men", subcategory: "all bags" })
   */
  parseCategorySelection(selection) {
    const parts = selection.toLowerCase().split('-');
    
    if (parts.length < 2) return null;
    
    const possibleGender = parts[0];
    const subcategory = parts.slice(1).join(' ');
    
    // Check if first part is a gender
    const gender = this.identifyGender(possibleGender);
    
    if (gender) {
      return {
        gender: gender,
        subcategory: subcategory
      };
    }
    
    return null;
  }

  /**
   * Identify gender from string
   */
  identifyGender(str) {
    const lowerStr = str.toLowerCase();
    
    for (const [gender, variants] of Object.entries(this.genderMappings)) {
      if (variants.includes(lowerStr)) {
        return gender;
      }
    }
    
    return null;
  }

  /**
   * Find database categories that match gender and subcategory
   */
  findMatchingDbCategories(gender, subcategory) {
    const matchingCategories = [];
    
    // Use reverse mapping if available
    if (this.reverseMapping) {
      const key = `${gender}-${subcategory}`;
      if (this.reverseMapping.has(key)) {
        return this.reverseMapping.get(key);
      }
    }
    
    // Common category mappings based on subcategory (using exact database casing)
    const categoryMappings = {
      'all bags': ['All BAGS', 'Handbags', 'Tote Bags', 'Shoulder Bags', 'Crossbody Bags', 'Clutch', 'Mini Bags', 'Satchel Bags', 'Sling Bags', 'Wristlet', 'Backpack', 'Beltbag'],
      'footwear': ['BOOTS', 'HEELS & WEDGES', 'FLATS & SLIPPERS', 'SNEAKERS', 'ESPADRILLES', 'ESPADRILLES & LOAFERS', 'LOAFERS', 'LOAFERS & MOCCASINS', 'SLIDERS & SLIPPERS', 'PEEPTOES'],
      'clothing': ['CLOTHING', 'CLOTING', 'DRESSES & GOWNS', 'SHORTS & SKIRTS', 'SKIRTS & SHORTS', 'T SHIRTS', 'T SHIRTS & SHIRTS', 'SHIRTS', 'HOODIES & SWEATSHIRTS', 'HOODIES AND SWEATSHIRTS', 'JACKETS & OUTERWEAR', 'CARDIGANS & JUMPERS', 'DENIMS & TROUSERS', 'TROUSERS & DENIMS', 'JUMPSUITS', 'PLAYSUIT & JUMPSUIT', 'SHORTS'],
      'all accessories': ['ALL ACCESSORIES', 'SMALL ACCESSORIES', 'BELTS', 'SCARVES', 'SHAWLS & SCARVES', 'CAPS', 'SUNGLASSES'],
      'fine jewellery': ['FINE JEWELLERY', 'EARRINGS', 'NECKLACES', 'RINGS', 'CHARMS & BRACELETS'],
      'watches': ['WATCHES'],
      'accessories': ['TIES & CUFFLINKS', 'WALLET', 'WALLETS/CARD HOLDERS', 'BELTS'], // Men/general accessories
      'co-ord sets womens': ['CO-ORD SETS WOMENS'],
      'co-ord sets mens': ['CO-ORD SETS MENS'],
      'backpack': ['BACKPACK']
    };
    
    // For product-specific categories (bags, footwear, etc.), DON'T include gender category
    // because these products typically don't have explicit gender categories
    if (categoryMappings[subcategory]) {
      matchingCategories.push(...categoryMappings[subcategory]);
    } else {
      // For categories without specific mappings, include gender category
      const genderCategory = gender.toUpperCase();
      matchingCategories.push(genderCategory);
    }
    
    return [...new Set(matchingCategories)]; // Remove duplicates
  }

  /**
   * Create advanced filter query for products based on AI category selection
   */
  createAdvancedCategoryFilter(selectedCategories, categoryModel) {
    const conversion = this.convertCategorySelectionToDbCategories(selectedCategories);
    
    return {
      dbCategories: conversion.categories,
      genderFilters: conversion.genderFilters,
      mongoQuery: this.buildMongoQuery(conversion),
      debug: {
        originalSelections: conversion.originalSelections,
        parsedCategories: conversion.categories,
        genders: conversion.genderFilters
      }
    };
  }

  /**
   * Build MongoDB query for category filtering
   */
  buildMongoQuery(conversion) {
    if (conversion.categories.length === 0) return {};
    
    // For hierarchical filtering, create inclusive OR logic
    // This will match products that have ANY of the specified categories
    const categoryRegexes = conversion.categories.map(cat => new RegExp(cat, 'i'));
    let baseQuery = {
      $or: [
        { 'categories.categoryId.name': { $in: categoryRegexes } },
        { 'primaryCategory.name': { $in: categoryRegexes } }
      ]
    };
    
    // If we have gender filters, add them as additional OR conditions
    // This makes the query more inclusive rather than restrictive
    if (conversion.genderFilters && conversion.genderFilters.length > 0) {
      const genderRegexes = conversion.genderFilters.map(g => new RegExp(g.toUpperCase(), 'i'));
      
      // Add gender matching to the same OR clause to make it more inclusive
      baseQuery.$or.push(
        { 'categories.categoryId.name': { $in: genderRegexes } }
      );
    }
    
    return baseQuery;
  }
}

module.exports = CategoryMapper;