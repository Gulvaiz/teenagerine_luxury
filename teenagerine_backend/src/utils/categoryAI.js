/**
 * AI-based Category Classification System
 * Automatically categorizes product categories into proper groups
 */

class CategoryAI {
  constructor() {
    // Define comprehensive category patterns for AI classification
    this.patterns = {
      women: {
        keywords: [
          'women', 'woman', 'ladies', 'lady', 'female', 'feminine',
          'dress', 'gown', 'skirt', 'heels', 'wedges', 'clutch',
          'handbag', 'purse', 'tote', 'shoulder bag', 'crossbody',
          'lingerie', 'bra', 'bikini', 'swimsuit', 'maternity',
          'blouse', 'cardigan', 'jumper', 'playsuit', 'jumpsuit',
          'mini bag', 'satchel', 'wristlet'
        ],
        exclusivePatterns: [
          /women/i, /ladies/i, /dress/i, /gown/i, /skirt/i,
          /heels/i, /wedges/i, /clutch/i, /handbag/i, /purse/i,
          /tote.*bag/i, /shoulder.*bag/i, /crossbody/i, /satchel/i,
          /mini.*bag/i, /wristlet/i, /playsuit/i, /jumpsuit/i
        ]
      },
      men: {
        keywords: [
          'men', 'man', 'male', 'masculine', 'guys', 'gentleman',
          'mens', 'suit', 'blazer', 'tie', 'cufflink', 'wallet',
          'loafer', 'moccasin', 'oxford', 'brogue', 'derby',
          'belt', 'briefcase', 'messenger', 'backpack'
        ],
        exclusivePatterns: [
          /\bmen\b/i, /\bmens\b/i, /\bman\b/i, /male/i,
          /suit/i, /blazer/i, /tie/i, /cufflink/i,
          /loafer/i, /moccasin/i, /oxford/i, /brogue/i,
          /briefcase/i, /messenger/i
        ]
      },
      kids: {
        keywords: [
          'kids', 'kid', 'child', 'children', 'baby', 'infant',
          'toddler', 'youth', 'junior', 'boy', 'girl',
          'school', 'playground', 'nursery'
        ],
        exclusivePatterns: [
          /\bkids\b/i, /\bkid\b/i, /child/i, /children/i,
          /baby/i, /infant/i, /toddler/i, /youth/i,
          /junior/i, /\bboy\b/i, /\bgirl\b/i, /school/i
        ],
        sizePatterns: [
          /\d+[at]/i, // 2A, 3T, etc.
          /\d+\s*yrs/i, // 5 yrs, 6-7 yrs, etc.
          /\d+\s*years/i, // 5 years, etc.
          /\d+cm/i, // height measurements
          /\d+\/\d+/i // 4/4T, etc.
        ]
      },
      accessories: {
        keywords: [
          'accessory', 'accessories', 'jewelry', 'jewellery',
          'watch', 'sunglasses', 'glasses', 'scarf', 'shawl',
          'belt', 'hat', 'cap', 'glove', 'sock', 'tie',
          'cufflink', 'charm', 'bracelet', 'necklace',
          'earring', 'ring', 'brooch', 'pin'
        ],
        exclusivePatterns: [
          /accessor/i, /jewelry/i, /jewellery/i, /watch/i,
          /sunglasses/i, /glasses/i, /scarf/i, /shawl/i,
          /\bbelt/i, /\bhat/i, /\bcap/i, /glove/i,
          /charm/i, /bracelet/i, /necklace/i, /earring/i,
          /\bring/i, /brooch/i, /\bpin\b/i, /cufflink/i
        ]
      }
    };

    // Define items that should be excluded or cleaned up
    this.excludePatterns = [
      /^[a-z]$/i, // Single letters
      /^[a-z]-[a-z]$/i, // Letter ranges like "A-D"
      /^\./i, // Dots
      /^uncategorized$/i,
      /^default$/i,
      /coming soon/i,
      /^sale$/i,
      /^just in$/i
    ];

    // Size-related categories that should be moved to size filters
    this.sizeCategories = [
      /\d+[at]/i,
      /one size/i,
      /small/i,
      /medium/i,
      /large/i,
      /\bxs\b/i,
      /\bs\b$/i,
      /\bm\b$/i,
      /\bl\b$/i,
      /\bxl\b/i
    ];
  }

  /**
   * Main classification method
   */
  classifyCategory(categoryName) {
    if (!categoryName || typeof categoryName !== 'string') {
      return null;
    }

    const cleanName = categoryName.trim();
    
    // Skip excluded categories
    if (this.shouldExclude(cleanName)) {
      return null;
    }

    // Check if it's a size category
    if (this.isSizeCategory(cleanName)) {
      return {
        type: 'size',
        originalName: cleanName
      };
    }

    // Classify into main categories
    const classification = this.performClassification(cleanName);
    
    return {
      type: 'category',
      group: classification.group,
      confidence: classification.confidence,
      originalName: cleanName,
      cleanedName: this.cleanCategoryName(cleanName),
      subcategory: this.determineSubcategory(cleanName, classification.group)
    };
  }

  /**
   * Check if category should be excluded
   */
  shouldExclude(categoryName) {
    return this.excludePatterns.some(pattern => pattern.test(categoryName));
  }

  /**
   * Check if category is actually a size
   */
  isSizeCategory(categoryName) {
    return this.sizeCategories.some(pattern => pattern.test(categoryName));
  }

  /**
   * Perform AI-based classification
   */
  performClassification(categoryName) {
    const scores = {
      women: 0,
      men: 0,
      kids: 0,
      accessories: 0
    };

    const lowerName = categoryName.toLowerCase();

    // Score based on keyword matching
    Object.keys(this.patterns).forEach(group => {
      const pattern = this.patterns[group];
      
      // Keyword scoring
      pattern.keywords.forEach(keyword => {
        if (lowerName.includes(keyword)) {
          scores[group] += 2;
        }
      });

      // Pattern matching (higher weight)
      pattern.exclusivePatterns.forEach(regex => {
        if (regex.test(categoryName)) {
          scores[group] += 5;
        }
      });

      // Special handling for kids size patterns
      if (group === 'kids' && pattern.sizePatterns) {
        pattern.sizePatterns.forEach(regex => {
          if (regex.test(categoryName)) {
            scores[group] += 3;
          }
        });
      }
    });

    // Context-based scoring
    this.applyContextualScoring(categoryName, scores);

    // Find the highest scoring group
    const maxScore = Math.max(...Object.values(scores));
    const bestGroup = Object.keys(scores).find(group => scores[group] === maxScore);

    // Calculate confidence
    const totalScore = Object.values(scores).reduce((a, b) => a + b, 0);
    const confidence = totalScore > 0 ? (maxScore / totalScore) : 0;

    // Default to accessories if no clear classification and confidence is low
    if (maxScore === 0 || confidence < 0.3) {
      return { group: 'accessories', confidence: 0.5 };
    }

    return { group: bestGroup, confidence };
  }

  /**
   * Apply contextual scoring based on category relationships
   */
  applyContextualScoring(categoryName, scores) {
    const lowerName = categoryName.toLowerCase();

    // Bags context
    if (lowerName.includes('bag')) {
      if (lowerName.includes('clutch') || lowerName.includes('handbag') || 
          lowerName.includes('tote') || lowerName.includes('shoulder')) {
        scores.women += 2;
      } else if (lowerName.includes('backpack') || lowerName.includes('messenger')) {
        scores.men += 1;
      }
    }

    // Footwear context
    if (lowerName.includes('shoe') || lowerName.includes('boot') || 
        lowerName.includes('sandal') || lowerName.includes('slipper')) {
      if (lowerName.includes('heel') || lowerName.includes('wedge')) {
        scores.women += 3;
      } else if (lowerName.includes('oxford') || lowerName.includes('brogue')) {
        scores.men += 3;
      }
    }

    // Clothing context
    if (lowerName.includes('clothing') || lowerName.includes('apparel')) {
      // Equal weight for all unless specified
      scores.women += 1;
      scores.men += 1;
    }

    // Jewelry context
    if (lowerName.includes('jewel') || lowerName.includes('fine')) {
      scores.accessories += 2;
      scores.women += 1; // Women typically shop for jewelry more
    }
  }

  /**
   * Clean and normalize category names
   */
  cleanCategoryName(categoryName) {
    return categoryName
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/[&]/g, 'and')
      .replace(/\//g, ' / ')
      .replace(/([a-z])([A-Z])/g, '$1 $2') // Add space before capital letters
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * Determine appropriate subcategory
   */
  determineSubcategory(categoryName, group) {
    const lowerName = categoryName.toLowerCase();
    
    const subcategoryMaps = {
      women: {
        'All Bags': ['bag', 'tote', 'handbag', 'clutch', 'shoulder', 'crossbody', 'satchel', 'mini bag', 'wristlet'],
        'Footwear': ['shoe', 'boot', 'heel', 'wedge', 'flat', 'slipper', 'sandal', 'espadrille', 'peeptoe'],
        'Clothing': ['dress', 'gown', 'skirt', 'short', 'blouse', 'cardigan', 'jumper', 'coat', 'jacket', 'playsuit', 'jumpsuit', 'swimsuit', 'hoodie', 'sweatshirt'],
        'All Accessories': ['scarf', 'shawl', 'belt', 'hat', 'cap', 'sunglasses'],
        'Fine Jewellery': ['necklace', 'earring', 'bracelet', 'ring', 'charm', 'jewelry', 'jewellery']
      },
      men: {
        'Clothing': ['shirt', 'trouser', 'pant', 'suit', 'blazer', 'jacket', 'coat', 'hoodie', 'sweatshirt', 'short'],
        'Footwear': ['shoe', 'boot', 'loafer', 'moccasin', 'oxford', 'brogue', 'sneaker', 'slipper'],
        'Accessories': ['tie', 'cufflink', 'belt', 'wallet', 'watch', 'sunglasses', 'hat', 'cap']
      },
      kids: {
        'Clothing': ['shirt', 'dress', 'short', 'pant', 'trouser', 'hoodie', 'sweatshirt', 'jacket', 'coat']
      },
      accessories: {
        'Jewelry': ['necklace', 'earring', 'bracelet', 'ring', 'charm'],
        'Watches': ['watch'],
        'Eyewear': ['sunglasses', 'glasses'],
        'Small Accessories': ['wallet', 'belt', 'scarf', 'hat', 'cap']
      }
    };

    const groupMap = subcategoryMaps[group];
    if (!groupMap) return null;

    for (const [subcategory, keywords] of Object.entries(groupMap)) {
      if (keywords.some(keyword => lowerName.includes(keyword))) {
        return subcategory;
      }
    }

    return null;
  }

  /**
   * Process and organize all categories
   */
  organizeCategories(categories) {
    const organized = {
      women: { label: 'WOMEN', subcategories: new Set() },
      men: { label: 'MEN', subcategories: new Set() },
      kids: { label: 'KIDS', subcategories: new Set() },
      accessories: { label: 'ACCESSORIES', subcategories: new Set() }
    };

    const extraSizes = new Set();
    const excludedCategories = [];

    categories.forEach(category => {
      const classification = this.classifyCategory(category.name);
      
      if (!classification) {
        excludedCategories.push(category.name);
        return;
      }

      if (classification.type === 'size') {
        extraSizes.add(classification.originalName);
        return;
      }

      if (classification.type === 'category' && classification.group) {
        const group = organized[classification.group];
        if (group) {
          if (classification.subcategory) {
            group.subcategories.add(classification.subcategory);
          } else {
            group.subcategories.add(classification.cleanedName);
          }
        }
      }
    });

    // Convert Sets to sorted Arrays
    Object.keys(organized).forEach(key => {
      organized[key].subcategories = Array.from(organized[key].subcategories).sort();
      organized[key].id = key;
    });

    return {
      categories: Object.values(organized),
      extraSizes: Array.from(extraSizes).sort(),
      excludedCategories,
      stats: {
        total: categories.length,
        processed: Object.values(organized).reduce((sum, group) => sum + group.subcategories.length, 0),
        excluded: excludedCategories.length,
        sizes: extraSizes.size
      }
    };
  }
}

module.exports = CategoryAI;