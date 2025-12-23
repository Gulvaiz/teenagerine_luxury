/**
 * Filter Options Cleaner
 * Cleans and standardizes all filter options (colors, sizes, brands, conditions)
 */

class FilterCleaner {
  constructor() {
    // Standard color mappings
    this.colorMappings = {
      'off white': 'off-white',
      'off-white': 'off-white',
      'multi color': 'multicolor',
      'multi-color': 'multicolor',
      'multicolor': 'multicolor',
      'metallic': 'metallic',
      'mettalic': 'metallic', // Fix typo
      'grey': 'gray',
      'golden': 'gold',
      'burgundy': 'burgundy',
      'maroon': 'maroon'
    };

    // Standard size mappings and cleaning
    this.sizeMappings = {
      'extra small': 'XS',
      'small': 'S',
      'medium': 'M',
      'large': 'L',
      'extra large': 'XL',
      'one size': 'One Size',
      'onesize': 'One Size'
    };

    // Size patterns for validation (enhanced for stricter validation)
    this.validSizePatterns = [
      /^(XXS|XS|S|M|L|XL|XXL|XXXL)$/i,                    // Standard letter sizes
      /^\d{1,2}(\.\d{1,2})?$/,                           // Numeric sizes (1-99, with optional decimal)
      /^\d{1,2}[A-Z]$/i,                                 // Numeric with single letter (36B, 42R)
      /^(EU|UK|US)\s*\d{1,2}(\.\d{1,2})?$/i,            // Regional sizing (EU 38, US 8)
      /^\d{1,2}\/\d{1,2}[A-Z]?$/i,                      // Fraction sizes (32/34, 32/34L)
      /^One\s+Size$/i,                                   // One Size
      /^\d{1,2}\s+(EU|UK|US)$/i,                        // Size with region after (38 EU)
      /^W\d{1,2}$/i,                                     // Waist sizes (W32)
      /^\d{1,2}[WR]$/i,                                  // Width/Regular indicators (32W, 42R)
      /^Free\s+Size$/i,                                  // Free Size
      /^OS$/i                                            // OS (One Size)
    ];

    // Invalid size patterns (explicitly exclude these)
    this.invalidSizePatterns = [
      /^\d{3,}$/,                                        // 3+ digit numbers (likely invalid)
      /^[^a-zA-Z0-9].*$/,                               // Starts with special character
      /.*[^\w\s\.\-\/\(\)].*$/,                         // Contains invalid special characters
      /^(na|n\/a|none|default|various|tbd|pending)$/i,  // Generic/placeholder values
      /^.{25,}$/,                                        // Too long (over 24 chars)
      /^\s*$/,                                           // Only whitespace
      /^\d*\.\d*$/                                       // Only decimal point (like ".5" or "5.")
    ];

    // Brand cleaning patterns
    this.brandCleanPatterns = [
      { pattern: /\s*&\s*/g, replacement: ' & ' },
      { pattern: /\s{2,}/g, replacement: ' ' },
      { pattern: /\./g, replacement: '' }
    ];

    // Condition standardization
    this.conditionMappings = {
      'new with tags': 'New With Tags',
      'new without tags': 'New Without Tags',
      'like new': 'Pristine',
      'excellent': 'Pristine',
      'very good': 'Good Condition',
      'good': 'Good Condition',
      'fair': 'Gently Used',
      'used': 'Gently Used',
      'well used': 'Used Fairly Well',
      'heavily used': 'Used Fairly Well'
    };
  }

  /**
   * Clean and standardize colors
   */
  cleanColors(colors) {
    const cleanedColors = new Map();
    const excludedColors = [];

    colors.forEach(colorString => {
      if (!colorString || typeof colorString !== 'string') return;

      // Handle comma-separated colors
      const individualColors = colorString.toLowerCase()
        .split(/[,;]/)
        .map(c => c.trim())
        .filter(Boolean);

      individualColors.forEach(color => {
        const cleaned = this.cleanSingleColor(color);
        if (cleaned) {
          if (!cleanedColors.has(cleaned.normalized)) {
            cleanedColors.set(cleaned.normalized, {
              id: this.generateId(cleaned.normalized),
              label: cleaned.display,
              color: this.getColorClass(cleaned.normalized),
              originalValues: [color]
            });
          } else {
            // Add to original values for tracking
            cleanedColors.get(cleaned.normalized).originalValues.push(color);
          }
        } else {
          excludedColors.push(color);
        }
      });
    });

    return {
      colors: Array.from(cleanedColors.values())
        .sort((a, b) => a.label.localeCompare(b.label)),
      excluded: excludedColors,
      stats: {
        original: colors.length,
        processed: cleanedColors.size,
        excluded: excludedColors.length
      }
    };
  }

  /**
   * Clean a single color value
   */
  cleanSingleColor(color) {
    if (!color || color.length < 2) return null;

    // Skip very generic or invalid colors
    const skipColors = ['default', 'na', 'n/a', 'none', 'color', 'various'];
    if (skipColors.includes(color.toLowerCase())) return null;

    // Apply mappings
    let normalized = color.toLowerCase();
    if (this.colorMappings[normalized]) {
      normalized = this.colorMappings[normalized];
    }

    // Clean up the color name
    normalized = normalized
      .replace(/[^a-z0-9\s-]/g, '') // Remove special characters except hyphens
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Multiple hyphens to single
      .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens

    if (!normalized || normalized.length < 2) return null;

    // Create display name
    const display = color
      .split(/[-\s]/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');

    return {
      normalized,
      display: display.trim()
    };
  }

  /**
   * Clean and standardize sizes
   */
  cleanSizes(sizes) {
    const cleanedSizes = new Map();
    const excludedSizes = [];

    sizes.forEach(sizeString => {
      if (!sizeString || typeof sizeString !== 'string') return;

      // Handle comma-separated sizes
      const individualSizes = sizeString
        .split(/[,;]/)
        .map(s => s.trim())
        .filter(Boolean);

      individualSizes.forEach(size => {
        const cleaned = this.cleanSingleSize(size);
        if (cleaned) {
          if (!cleanedSizes.has(cleaned.normalized)) {
            cleanedSizes.set(cleaned.normalized, {
              id: this.generateId(cleaned.normalized),
              label: cleaned.display,
              originalValues: [size],
              sortOrder: this.getSizeSortOrder(cleaned.normalized)
            });
          } else {
            cleanedSizes.get(cleaned.normalized).originalValues.push(size);
          }
        } else {
          excludedSizes.push(size);
        }
      });
    });

    return {
      sizes: Array.from(cleanedSizes.values())
        .sort((a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label)),
      excluded: excludedSizes,
      stats: {
        original: sizes.length,
        processed: cleanedSizes.size,
        excluded: excludedSizes.length
      }
    };
  }

  /**
   * Clean a single size value
   */
  cleanSingleSize(size) {
    if (!size || size.length === 0) return null;

    let normalized = size.trim();

    // Early rejection for clearly invalid sizes
    if (normalized.length === 0 || normalized.length > 24) {
      return null;
    }

    // Check against invalid patterns first
    const isInvalid = this.invalidSizePatterns.some(pattern => pattern.test(normalized));
    if (isInvalid) {
      return null;
    }

    // Apply mappings
    const lowerSize = normalized.toLowerCase();
    if (this.sizeMappings[lowerSize]) {
      normalized = this.sizeMappings[lowerSize];
    }

    // Standardize format
    normalized = normalized
      .replace(/\s+/g, ' ')
      .replace(/([a-z])(\d)/gi, '$1 $2') // Add space between letter and number
      .replace(/(\d)([a-z])/gi, '$1$2') // Keep number-letter together
      .replace(/\b(eu|uk|us)\b/gi, match => match.toUpperCase()) // Uppercase region codes
      .trim();

    // Final validation - must match at least one valid pattern
    const isValid = this.validSizePatterns.some(pattern => pattern.test(normalized));
    if (!isValid) {
      return null;
    }

    // Additional business logic validation
    if (!this.isBusinessValidSize(normalized)) {
      return null;
    }

    return {
      normalized,
      display: normalized.toUpperCase()
    };
  }

  /**
   * Business logic validation for sizes
   */
  isBusinessValidSize(size) {
    const sizeUpper = size.toUpperCase();

    // Check numeric sizes are in reasonable range
    const numMatch = size.match(/^\d+(\.\d+)?$/);
    if (numMatch) {
      const num = parseFloat(numMatch[0]);
      // Reasonable size range for clothing/shoes (size 2-60)
      return num >= 2 && num <= 60;
    }

    // Check EU/UK/US sizes are in reasonable range
    const regionMatch = size.match(/^(EU|UK|US)\s*(\d+(\.\d+)?)$/i);
    if (regionMatch) {
      const region = regionMatch[1].toUpperCase();
      const num = parseFloat(regionMatch[2]);

      switch (region) {
        case 'EU':
          return num >= 30 && num <= 50; // EU clothing sizes
        case 'UK':
          return num >= 4 && num <= 20;  // UK sizes
        case 'US':
          return num >= 0 && num <= 20;  // US sizes
        default:
          return true;
      }
    }

    // Check fraction sizes (like 32/34)
    const fractionMatch = size.match(/^(\d{1,2})\/(\d{1,2})[A-Z]?$/);
    if (fractionMatch) {
      const first = parseInt(fractionMatch[1]);
      const second = parseInt(fractionMatch[2]);
      // Common clothing measurements
      return first >= 26 && first <= 50 && second >= 26 && second <= 50;
    }

    // All other validated patterns are considered valid
    return true;
  }

  /**
   * Get sort order for size (for proper sorting)
   */
  getSizeSortOrder(size) {
    const sizeUpper = size.toUpperCase();
    
    // Standard letter sizes
    const letterSizes = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'];
    const letterIndex = letterSizes.indexOf(sizeUpper);
    if (letterIndex !== -1) return letterIndex * 1000;

    // Numeric sizes
    const numMatch = size.match(/^(\d+(\.\d+)?)/);
    if (numMatch) return parseFloat(numMatch[1]);

    // Default to high value for sorting
    return 9999;
  }

  /**
   * Clean brands
   */
  cleanBrands(brands) {
    const cleanedBrands = new Map();
    const excludedBrands = [];

    brands.forEach(brand => {
      if (!brand || !brand.name || typeof brand.name !== 'string') return;

      const cleaned = this.cleanSingleBrand(brand.name);
      if (cleaned) {
        const key = cleaned.normalized;
        if (!cleanedBrands.has(key)) {
          cleanedBrands.set(key, {
            id: this.generateId(cleaned.normalized),
            label: cleaned.display,
            originalValues: [brand.name]
          });
        } else {
          cleanedBrands.get(key).originalValues.push(brand.name);
        }
      } else {
        excludedBrands.push(brand.name);
      }
    });

    return {
      brands: Array.from(cleanedBrands.values())
        .sort((a, b) => a.label.localeCompare(b.label)),
      excluded: excludedBrands,
      stats: {
        original: brands.length,
        processed: cleanedBrands.size,
        excluded: excludedBrands.length
      }
    };
  }

  /**
   * Clean a single brand name
   */
  cleanSingleBrand(brandName) {
    if (!brandName || brandName.length < 2) return null;

    let cleaned = brandName.trim();

    // Apply cleaning patterns
    this.brandCleanPatterns.forEach(({ pattern, replacement }) => {
      cleaned = cleaned.replace(pattern, replacement);
    });

    // Normalize for comparison
    const normalized = cleaned.toLowerCase()
      .replace(/[^a-z0-9\s&]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (!normalized || normalized.length < 2) return null;

    // Create display name (proper capitalization)
    const display = cleaned
      .split(/\s+/)
      .map(word => {
        if (word === '&') return '&';
        if (word.length <= 2) return word.toUpperCase();
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      })
      .join(' ');

    return {
      normalized,
      display: display.trim()
    };
  }

  /**
   * Clean conditions
   */
  cleanConditions(conditions) {
    const cleanedConditions = new Map();
    const excludedConditions = [];

    conditions.forEach(condition => {
      if (!condition || typeof condition !== 'string') return;

      const cleaned = this.cleanSingleCondition(condition);
      if (cleaned) {
        const key = cleaned.normalized;
        if (!cleanedConditions.has(key)) {
          cleanedConditions.set(key, {
            id: this.generateId(cleaned.normalized),
            label: cleaned.display,
            originalValues: [condition]
          });
        } else {
          cleanedConditions.get(key).originalValues.push(condition);
        }
      } else {
        excludedConditions.push(condition);
      }
    });

    return {
      conditions: Array.from(cleanedConditions.values())
        .sort((a, b) => this.getConditionOrder(a.label) - this.getConditionOrder(b.label)),
      excluded: excludedConditions,
      stats: {
        original: conditions.length,
        processed: cleanedConditions.size,
        excluded: excludedConditions.length
      }
    };
  }

  /**
   * Clean a single condition
   */
  cleanSingleCondition(condition) {
    if (!condition || condition.length < 3) return null;

    const normalized = condition.toLowerCase().trim();
    
    // Apply mappings
    if (this.conditionMappings[normalized]) {
      const display = this.conditionMappings[normalized];
      return {
        normalized: display.toLowerCase().replace(/\s+/g, '_'),
        display
      };
    }

    // Default cleaning
    const display = condition
      .split(/\s+/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');

    return {
      normalized: normalized.replace(/\s+/g, '_'),
      display
    };
  }

  /**
   * Get condition order for sorting (best to worst)
   */
  getConditionOrder(condition) {
    const order = {
      'New With Tags': 1,
      'New Without Tags': 2,
      'Pristine': 3,
      'Good Condition': 4,
      'Gently Used': 5,
      'Used Fairly Well': 6
    };
    return order[condition] || 999;
  }

  /**
   * Generate clean ID from name
   */
  generateId(name) {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  /**
   * Get Tailwind color class (enhanced version)
   */
  getColorClass(colorName) {
    const colorMap = {
      'black': 'bg-black',
      'white': 'bg-white border border-gray-200',
      'off-white': 'bg-gray-50 border border-gray-200',
      'blue': 'bg-blue-500',
      'red': 'bg-red-500',
      'green': 'bg-green-500',
      'yellow': 'bg-yellow-400',
      'purple': 'bg-purple-500',
      'pink': 'bg-pink-400',
      'brown': 'bg-amber-700',
      'gray': 'bg-gray-400',
      'grey': 'bg-gray-400',
      'beige': 'bg-amber-100',
      'navy': 'bg-blue-900',
      'gold': 'bg-yellow-500',
      'golden': 'bg-yellow-500',
      'silver': 'bg-gray-300',
      'orange': 'bg-orange-500',
      'turquoise': 'bg-teal-400',
      'teal': 'bg-teal-500',
      'lime': 'bg-lime-400',
      'maroon': 'bg-red-800',
      'burgundy': 'bg-red-900',
      'olive': 'bg-green-600',
      'aqua': 'bg-cyan-400',
      'fuchsia': 'bg-fuchsia-500',
      'indigo': 'bg-indigo-500',
      'violet': 'bg-violet-500',
      'tan': 'bg-amber-200',
      'cream': 'bg-amber-50',
      'ivory': 'bg-yellow-50',
      'khaki': 'bg-yellow-200',
      'coral': 'bg-orange-300',
      'salmon': 'bg-orange-200',
      'crimson': 'bg-red-700',
      'magenta': 'bg-pink-500',
      'cyan': 'bg-cyan-500',
      'mint': 'bg-green-200',
      'rose': 'bg-rose-400',
      'metallic': 'bg-gradient-to-r from-gray-300 to-gray-500',
      'glitter': 'bg-gradient-to-r from-yellow-200 via-yellow-400 to-yellow-200',
      'multicolor': 'bg-gradient-to-r from-red-500 via-yellow-500 to-blue-500'
    };
    
    const lowerColor = colorName.toLowerCase();
    
    // Check for exact matches first
    if (colorMap[lowerColor]) {
      return colorMap[lowerColor];
    }
    
    // Check for partial matches
    for (const [key, value] of Object.entries(colorMap)) {
      if (lowerColor.includes(key) || key.includes(lowerColor)) {
        return value;
      }
    }
    
    // Default fallback
    return 'bg-gray-300';
  }
}

module.exports = FilterCleaner;