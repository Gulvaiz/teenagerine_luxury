exports.GenderProcess = async (genderString, productName = "", categoryString = "") => {
  // First priority: explicit gender string
  if (genderString && genderString.trim() !== "") {
    const normalizedGender = genderString.trim().toLowerCase();
    return await ProcessGenderValue(normalizedGender);
  }

  // Second priority: gender from categories (most reliable)
  const categoryGender = await InferGenderFromCategories(categoryString);
  if (categoryGender !== 'unisex') {
    return categoryGender;
  }

  // Third priority: gender from product name (less reliable)
  const nameGender = await InferGenderFromText(productName);
  return nameGender;
};

const ProcessGenderValue = async (genderValue) => {
  // Direct mapping for common gender values
  const genderMappings = {
    // Men variations
    'men': 'men',
    'man': 'men', 
    'male': 'men',
    'boys': 'men',
    'boy': 'men',
    'mens': 'men',
    "men's": 'men',
    'masculine': 'men',
    'gentlemen': 'men',
    
    // Women variations
    'women': 'women',
    'woman': 'women',
    'female': 'women',
    'girls': 'women',
    'girl': 'women',
    'womens': 'women',
    "women's": 'women',
    'ladies': 'women',
    'feminine': 'women',
    
    // Kids variations
    'kids': 'kids',
    'kid': 'kids',
    'children': 'kids',
    'child': 'kids',
    'baby': 'kids',
    'babies': 'kids',
    'toddler': 'kids',
    'toddlers': 'kids',
    'youth': 'kids',
    'junior': 'kids',
    
    // Unisex variations
    'unisex': 'unisex',
    'neutral': 'unisex',
    'both': 'unisex',
    'all': 'unisex',
    'universal': 'unisex'
  };

  return genderMappings[genderValue] || 'unisex';
};

// New function for category-based gender detection (most reliable)
const InferGenderFromCategories = async (categoryString = "") => {
  if (!categoryString || categoryString.trim() === "") {
    return 'unisex';
  }

  const categoryText = categoryString.toLowerCase();
  
  // Split categories by common separators (>, ,, /, etc.)
  const categoryParts = categoryText
    .split(/[>,\/\\|]/)
    .map(part => part.trim())
    .filter(part => part.length > 0);

  // Check each category part for exact gender matches
  for (const part of categoryParts) {
    // Split each part into words for exact matching
    const words = part.split(/\s+/).map(word => word.trim());
    
    for (const word of words) {
      // Exact matches for women (check women first to avoid men matching in women)
      if (['women', 'woman', 'womens', "women's", 'ladies', 'female', 'girls', 'girl'].includes(word)) {
        return 'women';
      }
      // Exact matches for kids
      if (['kids', 'kid', 'children', 'child', 'baby', 'babies', 'toddler', 'toddlers', 'youth', 'junior', 'boys', 'boy', 'girls', 'girl'].includes(word)) {
        return 'kids';
      }
      // Exact matches for men (check last to avoid false positives)
      if (['men', 'man', 'mens', "men's", 'male', 'gentlemen'].includes(word)) {
        return 'men';
      }
    }
  }

  return 'unisex';
};

// Improved text-based gender detection with exact word matching
const InferGenderFromText = async (text = "") => {
  if (!text || text.trim() === "") {
    return 'unisex';
  }

  const normalizedText = text.toLowerCase();
  
  // Split text into words for exact matching
  const words = normalizedText.split(/\s+/).map(word => word.trim().replace(/[^a-z]/g, ''));

  // Check for mixed gender indicators (both men and women mentioned)
  const hasWomenKeywords = words.some(word => 
    ['women', 'woman', 'womens', 'ladies', 'female', 'feminine'].includes(word)
  );
  const hasMenKeywords = words.some(word => 
    ['men', 'man', 'mens', 'male', 'masculine', 'gentlemen'].includes(word)
  );
  const hasKidsKeywords = words.some(word => 
    ['kids', 'kid', 'children', 'child', 'baby', 'babies', 'toddler', 'toddlers', 'youth', 'junior', 'infant', 'newborn'].includes(word)
  );

  // If both men and women are mentioned, it's likely unisex
  if (hasWomenKeywords && hasMenKeywords) {
    return 'unisex';
  }

  // Check for exact word matches (order matters - check women first)
  for (const word of words) {
    // Women keywords (check first)
    if (['women', 'woman', 'womens', 'ladies', 'female', 'feminine', 'mother', 'mom', 'wife', 'girlfriend', 'bride'].includes(word)) {
      return 'women';
    }
    // Kids keywords 
    if (['kids', 'kid', 'children', 'child', 'baby', 'babies', 'toddler', 'toddlers', 'youth', 'junior', 'infant', 'newborn'].includes(word)) {
      return 'kids';
    }
    // Men keywords (check last)
    if (['men', 'man', 'mens', 'male', 'masculine', 'gentlemen', 'father', 'dad', 'husband', 'boyfriend', 'groom'].includes(word)) {
      return 'men';
    }
  }

  return 'unisex';
};