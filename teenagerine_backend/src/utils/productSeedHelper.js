
const Product = require("../models/product.model");

 async function generateUniqueSku(baseSku) {
  let sku = baseSku;
  let counter = 1;
  
  // Keep checking until we find a unique SKU
  while (await Product.findOne({ sku: sku })) {
    // For auto-generated SKUs, just generate a new one
    if (baseSku.startsWith('AUTO-')) {
      sku = `AUTO-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    } else {
      // For existing SKUs, add a suffix
      sku = `${baseSku}-${counter}`;
      counter++;
    }
  }
  
  return sku;
}

/**
 * Generate a unique slug by checking database and adding suffix if needed
 */
 async function generateUniqueSlug(baseSlug) {
  let slug = baseSlug;
  let counter = 1;
  
  // Keep checking until we find a unique slug
  while (await Product.findOne({ slug: slug })) {
    slug = `${baseSlug}-${counter}`;
    counter++;
  }
  
  return slug;
}

/**
 * Extract size information from product description
 */
 function extractSizeFromDescription(description) {
  if (!description) return null;
  
  // Look for size patterns in description
  const sizePatterns = [
    /SIZE:\s*([^\\n<]+)/i,
    /LENGTH:\s*(\d+)\s*cm/i,
    /(\d+)\s*cm/i
  ];
  
  for (const pattern of sizePatterns) {
    const match = description.match(pattern);
    if (match) {
      return match[1].trim();
    }
  }
  
  return null;
}

/**
 * Extract color information from product description
 */
 function extractColorFromDescription(description) {
  if (!description) return null;
  
  // Look for color patterns in description
  const colorPatterns = [
    /COLOUR:\s*([^\\n<]+)/i,
    /COLOR:\s*([^\\n<]+)/i
  ];
  
  for (const pattern of colorPatterns) {
    const match = description.match(pattern);
    if (match) {
      const color = match[1].replace(/\//g, ' / ').trim();
      return color;
    }
  }
  
  return null;
}

/**
 * Get hex code for common colors
 */
 function getColorHex(colorName) {
  const colorMap = {
    'black': '#000000',
    'white': '#FFFFFF',
    'red': '#FF0000',
    'blue': '#0000FF',
    'green': '#008000',
    'yellow': '#FFFF00',
    'pink': '#FFC0CB',
    'purple': '#800080',
    'orange': '#FFA500',
    'brown': '#A52A2A',
    'gray': '#808080',
    'grey': '#808080',
    'beige': '#F5F5DC',
    'navy': '#000080',
    'coral': '#FF7F50'
  };
  
  if (!colorName) return undefined;
  
  const normalizedColor = colorName.toLowerCase().split(' ')[0].split('/')[0];
  return colorMap[normalizedColor] || undefined;
}

/**
 * Extract dimensions from description
 */
 function extractDimensions(description) {
  if (!description) return {};
  
  const dimensions = {};
  
  const lengthMatch = description.match(/LENGTH:\s*(\d+(?:\.\d+)?)\s*cm/i);
  const widthMatch = description.match(/WIDTH:\s*(\d+(?:\.\d+)?)\s*cm/i);
  const heightMatch = description.match(/HEIGHT:\s*(\d+(?:\.\d+)?)\s*cm/i);
  
  if (lengthMatch) dimensions.length = parseFloat(lengthMatch[1]);
  if (widthMatch) dimensions.width = parseFloat(widthMatch[1]);
  if (heightMatch) dimensions.height = parseFloat(heightMatch[1]);
  
  return dimensions;
}

/**
 * Clean HTML from description
 */
 function cleanDescription(description) {
  if (!description) return '';
  
  return description
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/\\n/g, '\n') // Convert \\n to actual newlines
    .replace(/&nbsp;/g, ' ') // Convert HTML spaces
    .replace(/&amp;/g, '&') // Convert HTML entities
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim();
}

/**
 * Extract first letter from gender category
 */
function getGenderCode(categories) {
  if (!categories) return 'U'; // Unknown

  const categoryStr = categories.toString().toLowerCase();

  if (categoryStr.includes('women')) return 'W';
  if (categoryStr.includes('men')) return 'M';
  if (categoryStr.includes('kids')) return 'K';

  return 'U'; // Unknown
}

/**
 * Extract first two letters from clothing category
 */
function getCategoryCode(categories) {
  if (!categories) return 'UN';

  const categoryStr = categories.toString().toLowerCase();

  // Define category mappings
  const categoryMappings = {
    'handbags': 'HB',
    'bags': 'BA',
    'shoes': 'SH',
    'clothing': 'CL',
    'dresses': 'DR',
    'tops': 'TO',
    'bottoms': 'BO',
    'jackets': 'JA',
    'accessories': 'AC',
    'watches': 'WA',
    'jewelry': 'JE',
    'sunglasses': 'SG',
    'scarves': 'SC',
    'belts': 'BE',
    'wallets': 'WL'
  };

  // Find the first matching category
  for (const [key, code] of Object.entries(categoryMappings)) {
    if (categoryStr.includes(key)) {
      return code;
    }
  }

  // If no specific category found, try to extract from category name
  const categories_array = categories.toString().split(/[>,]/).map(c => c.trim());
  for (const category of categories_array) {
    if (category.length >= 2) {
      return category.substring(0, 2).toUpperCase();
    }
  }

  return 'UN'; // Unknown
}

/**
 * Extract first two letters from brand name
 */
function getBrandCode(brands) {
  if (!brands || !Array.isArray(brands) || brands.length === 0) return 'UN';

  // Get the first brand that's not empty
  const brand = brands.find(b => b && b.trim() !== '');
  if (!brand) return 'UN';

  // Remove special characters and get first two letters
  const cleanBrand = brand.replace(/[^A-Z]/gi, '');
  return cleanBrand.length >= 2 ? cleanBrand.substring(0, 2).toUpperCase() : 'UN';
}

/**
 * Extract accessory type code from categories
 */
function getAccessoryCode(categories) {
  if (!categories) return 'AC';

  const categoryStr = categories.toString().toLowerCase();

  // Define accessory mappings
  const accessoryMappings = {
    'necklace': 'NE',
    'earrings': 'EA',
    'bracelet': 'BR',
    'ring': 'RI',
    'watch': 'WA',
    'sunglasses': 'SG',
    'belt': 'BE',
    'scarf': 'SC',
    'hat': 'HA',
    'gloves': 'GL'
  };

  // Find the first matching accessory
  for (const [key, code] of Object.entries(accessoryMappings)) {
    if (categoryStr.includes(key)) {
      return code;
    }
  }

  return 'AC'; // Default accessory code
}

/**
 * Generate next sequential counter for SKU
 */
async function getNextSkuCounter(basePattern) {
  // Find the highest existing counter for this pattern
  const existingProducts = await Product.find({
    sku: { $regex: `^${basePattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}-\\d{7}$` }
  }).sort({ sku: -1 }).limit(1);

  if (existingProducts.length > 0) {
    const lastSku = existingProducts[0].sku;
    const counterMatch = lastSku.match(/-(\d{7})$/);
    if (counterMatch) {
      const lastCounter = parseInt(counterMatch[1]);
      return String(lastCounter + 1).padStart(7, '0');
    }
  }

  return '0000001';
}

/**
 * Generate SKU based on new format: TL[Gender]-[Category]-[Brand]-[Accessory]-[Counter]
 */
function generateBaseSku(productData) {
  const genderCode = getGenderCode(productData.categories);
  const categoryCode = getCategoryCode(productData.categories);
  const brandCode = getBrandCode(productData.brands);
  const accessoryCode = getAccessoryCode(productData.categories);

  return `TL${genderCode}-${categoryCode}-${brandCode}-${accessoryCode}`;
}

/**
 * Generate complete SKU with counter
 */
async function generateProductSku(productData) {
  const baseSku = generateBaseSku(productData);
  const counter = await getNextSkuCounter(baseSku);
  return `${baseSku}-${counter}`;
}

 const defaultUser = async () => {
  const adminId = "685e30bb1d4e347f849b7df8";
  return adminId;
};


module.exports = {
  cleanDescription,
  extractDimensions,
  extractColorFromDescription,
  extractSizeFromDescription,
  getColorHex,
  generateUniqueSlug,
  generateUniqueSku,
  defaultUser,
  // New SKU generation functions
  getGenderCode,
  getCategoryCode,
  getBrandCode,
  getAccessoryCode,
  generateProductSku,
  generateBaseSku,
  getNextSkuCounter
};