const { GENDER_PATTERNS } = require("../../data/GenderDetection");
const categoryModel = require("../models/category.model");
const productModel = require("../models/product.model");

function buildGenderAwareQuery(keyword) {
  const detectedGender = detectGenderFromQuery(keyword);

  if (!detectedGender) {
    return null;
  }

  const genderPatterns = GENDER_PATTERNS[detectedGender];

  // Create regex patterns for gender-specific search
  const genderKeywords = genderPatterns.keywords.join("|");
  const exclusionKeywords = genderPatterns.exclusions.join("|");

  return {
    $and: [
      {
        $or: [
          { name: { $regex: keyword, $options: "i" } },
          { description: { $regex: keyword, $options: "i" } },
          { tags: { $in: [new RegExp(keyword, "i")] } },
        ],
      },
      {
        $or: [
          { name: { $regex: genderKeywords, $options: "i" } },
          { description: { $regex: genderKeywords, $options: "i" } },
          {
            tags: {
              $in: genderPatterns.keywords.map((kw) => new RegExp(kw, "i")),
            },
          },
        ],
      },
      {
        $and: [
          { name: { $not: { $regex: exclusionKeywords, $options: "i" } } },
          {
            description: { $not: { $regex: exclusionKeywords, $options: "i" } },
          },
        ],
      },
    ],
  };
}

async function processGenderAwareCategories(categoryNames) {
  const categoryIds = [];
  let genderFilter = null;
  let detectedGender = null;

  // Detect gender from category names
  for (const categoryName of categoryNames) {
    const gender = detectGenderFromQuery("", categoryName);
    if (gender) {
      detectedGender = gender;
      break;
    }
  }

  // Find matching categories
  for (const categoryName of categoryNames) {
    // First, try exact match
    let categoryDocs = await categoryModel.find({
      name: new RegExp(`^${categoryName}$`, "i"),
    });

    // If no exact match and gender detected, try gender-specific search
    if (categoryDocs.length === 0 && detectedGender) {
      const genderPatterns = GENDER_PATTERNS[detectedGender];

      // Look for categories that contain both the category name and gender keywords
      categoryDocs = await categoryModel.find({
        $and: [
          { name: { $regex: categoryName, $options: "i" } },
          {
            $or: [
              {
                name: {
                  $regex: genderPatterns.keywords.join("|"),
                  $options: "i",
                },
              },
              {
                description: {
                  $regex: genderPatterns.keywords.join("|"),
                  $options: "i",
                },
              },
            ],
          },
        ],
      });
    }

    // If still no match, try broader search
    if (categoryDocs.length === 0) {
      categoryDocs = await categoryModel.find({
        name: { $regex: categoryName, $options: "i" },
      });
    }

    // Add found category IDs
    categoryIds.push(...categoryDocs.map((cat) => cat._id));
  }

  // Create gender-specific filter if gender detected
  if (detectedGender) {
    const genderPatterns = GENDER_PATTERNS[detectedGender];

    genderFilter = {
      $and: [
        {
          $or: [
            {
              name: {
                $regex: genderPatterns.keywords.join("|"),
                $options: "i",
              },
            },
            {
              description: {
                $regex: genderPatterns.keywords.join("|"),
                $options: "i",
              },
            },
            {
              tags: {
                $in: genderPatterns.keywords.map((kw) => new RegExp(kw, "i")),
              },
            },
          ],
        },
        {
          $and: [
            {
              name: {
                $not: {
                  $regex: genderPatterns.exclusions.join("|"),
                  $options: "i",
                },
              },
            },
            {
              description: {
                $not: {
                  $regex: genderPatterns.exclusions.join("|"),
                  $options: "i",
                },
              },
            },
          ],
        },
      ],
    };
  }

  return { categoryIds: [...new Set(categoryIds)], genderFilter };
}

function hasGenderSpecificQuery(query) {
  return query.$and && Array.isArray(query.$and) && query.$and.length > 0;
}

async function findCategoriesWithFuzzyMatch(
  categoryName,
  detectedGender = null
) {
  const searchStrategies = [];

  // Strategy 1: Exact match
  searchStrategies.push({
    name: new RegExp(`^${categoryName}$`, "i"),
  });

  // Strategy 2: Contains match
  searchStrategies.push({
    name: { $regex: categoryName, $options: "i" },
  });

  // Strategy 3: Word boundary match
  searchStrategies.push({
    name: { $regex: `\\b${categoryName}\\b`, $options: "i" },
  });

  // Strategy 4: Gender + category combination
  if (detectedGender) {
    const genderKeywords = GENDER_PATTERNS[detectedGender].keywords;
    searchStrategies.push({
      $and: [
        { name: { $regex: categoryName, $options: "i" } },
        { name: { $regex: genderKeywords.join("|"), $options: "i" } },
      ],
    });
  }

  // Try each strategy until we find matches
  for (const strategy of searchStrategies) {
    const categories = await categoryModel.find(strategy);
    if (categories.length > 0) {
      return categories;
    }
  }

  return [];
}
function detectGenderFromQuery(searchText = "") {
  if (!searchText) return null;

  const text = searchText.toLowerCase();

  for (const [gender, patterns] of Object.entries(GENDER_PATTERNS)) {
    const hasGenderKeyword = patterns.keywords.some((kw) => text.includes(kw));
    const hasExclusion = patterns.exclusions.some((ex) => text.includes(ex));
    // console.log("Gender");
    // console.log(hasGenderKeyword);
    // console.log("Exclusion");
    // console.log(hasExclusion);
    if (hasGenderKeyword && !hasExclusion) {
      return gender;
    }
  }

  return null;
}

function validateGenderMatch(products, detectedGender) {
  if (!detectedGender || !products.length) return products;
  const genderPatterns = GENDER_PATTERNS[detectedGender];

  return products.filter((product) => {
    const productText = `${product.name} ${product.description
      } ${product.tags.join(" ")}`.toLowerCase();

    // Must contain at least one gender keyword
    const hasGenderKeyword = genderPatterns.keywords.some((kw) =>
      productText.includes(kw.toLowerCase())
    );

    // Must NOT contain any exclusion keywords
    const hasExclusionKeyword = genderPatterns.exclusions.some((ex) =>
      productText.includes(ex.toLowerCase())
    );

    // Additional check: category names should also match gender
    const categoryMatch = product.categories.some((cat) => {
      const categoryText = cat.categoryId.name.toLowerCase();
      const categoryHasGender = genderPatterns.keywords.some((kw) =>
        categoryText.includes(kw.toLowerCase())
      );
      const categoryHasExclusion = genderPatterns.exclusions.some((ex) =>
        categoryText.includes(ex.toLowerCase())
      );
      return categoryHasGender && !categoryHasExclusion;
    });

    const isValidGenderMatch =
      (hasGenderKeyword || categoryMatch) && !hasExclusionKeyword;

    if (!isValidGenderMatch && process.env.NODE_ENV === "development") {
      console.log(
        `🚫 Filtered out product "${product.name}" - doesn't match gender: ${detectedGender}`
      );
    }

    return isValidGenderMatch;
  });
}
function detectStrictGender(keyword = "", categories = "") {
  const { GENDER_PATTERNS } = require("../../data/GenderDetection");
  const searchText = `${keyword} ${categories}`.toLowerCase();

  // Score each gender based on keyword presence and exclusions
  const genderScores = {};

  for (const [gender, patterns] of Object.entries(GENDER_PATTERNS)) {
    let score = 0;

    // Add points for gender keywords
    patterns.keywords.forEach((kw) => {
      if (searchText.includes(kw.toLowerCase())) {
        score += 2;
      }
    });

    // Subtract points for exclusion keywords
    patterns.exclusions.forEach((ex) => {
      if (searchText.includes(ex.toLowerCase())) {
        score -= 10; // Heavy penalty for exclusions
      }
    });

    genderScores[gender] = score;
  }

  // Find the gender with the highest positive score
  const bestGender = Object.entries(genderScores)
    .filter(([gender, score]) => score > 0)
    .sort(([, a], [, b]) => b - a)[0];

  const detectedGender = bestGender ? bestGender[0] : null;

  if (process.env.NODE_ENV === "development") {
    console.log("🧮 Gender scoring results:", genderScores);
    console.log("🎯 Strict gender detection result:", detectedGender);
  }

  return detectedGender;
}
function buildStrictGenderFilter(detectedGender) {
  if (!detectedGender) return null;

  const { GENDER_PATTERNS } = require("../../data/GenderDetection");
  const genderPatterns = GENDER_PATTERNS[detectedGender];

  return {
    $and: [
      // MUST contain gender-specific keywords
      {
        $or: [
          {
            name: { $regex: genderPatterns.keywords.join("|"), $options: "i" },
          },
          {
            description: {
              $regex: genderPatterns.keywords.join("|"),
              $options: "i",
            },
          },
          {
            tags: {
              $in: genderPatterns.keywords.map((kw) => new RegExp(kw, "i")),
            },
          },
        ],
      },
      // MUST NOT contain exclusion keywords
      {
        $and: [
          {
            name: {
              $not: {
                $regex: genderPatterns.exclusions.join("|"),
                $options: "i",
              },
            },
          },
          {
            description: {
              $not: {
                $regex: genderPatterns.exclusions.join("|"),
                $options: "i",
              },
            },
          },
          {
            tags: {
              $not: {
                $in: genderPatterns.exclusions.map((ex) => new RegExp(ex, "i")),
              },
            },
          },
        ],
      },
    ],
  };
}
async function countProductsWithStrictGenderFilter(query, detectedGender) {
  try {
    // Get all matching products (without pagination) to apply strict validation
    const allProducts = await Product.find(query)
      .populate("categories.categoryId", "name slug description")
      .select("name description tags categories")
      .lean();

    // Apply strict gender validation
    const validatedProducts = await applyPostQueryGenderValidation(
      allProducts,
      detectedGender,
      query
    );

    return validatedProducts.length;
  } catch (error) {
    console.error("Error counting products with strict gender filter:", error);
    // Fallback to regular count
    return await Product.countDocuments(query);
  }
}

/**
 * Additional post-query validation for extra strict filtering
 */
async function applyPostQueryGenderValidation(
  products,
  detectedGender,
  originalQuery
) {
  if (!detectedGender || !products.length) return products;

  const { GENDER_PATTERNS } = require("../../data/GenderDetection");
  const genderPatterns = GENDER_PATTERNS[detectedGender];

  const validatedProducts = [];

  for (const product of products) {
    let isValid = false;
    let validationReasons = [];

    // Check product name
    const nameText = product.name.toLowerCase();
    const hasGenderInName = genderPatterns.keywords.some((kw) =>
      nameText.includes(kw.toLowerCase())
    );
    const hasExclusionInName = genderPatterns.exclusions.some((ex) =>
      nameText.includes(ex.toLowerCase())
    );

    if (hasGenderInName && !hasExclusionInName) {
      isValid = true;
      validationReasons.push("name match");
    }

    // Check product description
    const descText = (product.description || "").toLowerCase();
    const hasGenderInDesc = genderPatterns.keywords.some((kw) =>
      descText.includes(kw.toLowerCase())
    );
    const hasExclusionInDesc = genderPatterns.exclusions.some((ex) =>
      descText.includes(ex.toLowerCase())
    );

    if (hasGenderInDesc && !hasExclusionInDesc) {
      isValid = true;
      validationReasons.push("description match");
    }

    // Check categories
    if (product.categories && product.categories.length > 0) {
      const categoryMatches = product.categories.some((cat) => {
        const catName = cat.categoryId.name.toLowerCase();
        const hasGenderInCat = genderPatterns.keywords.some((kw) =>
          catName.includes(kw.toLowerCase())
        );
        const hasExclusionInCat = genderPatterns.exclusions.some((ex) =>
          catName.includes(ex.toLowerCase())
        );
        return hasGenderInCat && !hasExclusionInCat;
      });

      if (categoryMatches) {
        isValid = true;
        validationReasons.push("category match");
      }
    }

    // Check tags
    if (product.tags && product.tags.length > 0) {
      const tagText = product.tags.join(" ").toLowerCase();
      const hasGenderInTags = genderPatterns.keywords.some((kw) =>
        tagText.includes(kw.toLowerCase())
      );
      const hasExclusionInTags = genderPatterns.exclusions.some((ex) =>
        tagText.includes(ex.toLowerCase())
      );

      if (hasGenderInTags && !hasExclusionInTags) {
        isValid = true;
        validationReasons.push("tags match");
      }
    }

    // Final exclusion check - if ANY exclusion found, reject the product
    const allProductText = `${product.name} ${product.description
      } ${product.tags.join(" ")}`.toLowerCase();
    const hasAnyExclusion = genderPatterns.exclusions.some((ex) =>
      allProductText.includes(ex.toLowerCase())
    );

    if (hasAnyExclusion) {
      isValid = false;
      console.log(
        `🚫 STRICT: Rejected "${product.name}" - contains exclusion keywords for ${detectedGender}`
      );
    }

    if (isValid) {
      validatedProducts.push(product);
      if (process.env.NODE_ENV === "development") {
        console.log(
          `✅ STRICT: Validated "${product.name
          }" for ${detectedGender} (${validationReasons.join(", ")})`
        );
      }
    }
  }

  return validatedProducts;
}

function parseGenderCategory(categoryName) {
  const separators = ["-", "_", " "];
  let baseCategory = categoryName;
  let detectedGender = null;

  // Try each separator
  for (const separator of separators) {
    if (categoryName.includes(separator)) {
      const parts = categoryName.split(separator);

      // Check if first part is a gender
      const firstPart = parts[0].toLowerCase().trim();
      for (const [gender, patterns] of Object.entries(GENDER_PATTERNS)) {
        if (patterns.keywords.includes(firstPart)) {
          detectedGender = gender;
          baseCategory = parts.slice(1).join(separator).trim();
          break;
        }
      }

      if (detectedGender) break;
    }
  }

  // If no separator, check if whole string contains gender keywords
  if (!detectedGender) {
    const lowerCategoryName = categoryName.toLowerCase();
    for (const [gender, patterns] of Object.entries(GENDER_PATTERNS)) {
      for (const keyword of patterns.keywords) {
        if (lowerCategoryName.includes(keyword)) {
          detectedGender = gender;
          baseCategory = categoryName
            .replace(new RegExp(keyword, "gi"), "")
            .trim();
          baseCategory = baseCategory.replace(/^[-_\s]+|[-_\s]+$/g, "");
          break;
        }
      }
      if (detectedGender) break;
    }
  }

  return {
    baseCategory: baseCategory || categoryName,
    gender: detectedGender,
  };
}

async function findBaseCategoryMatches(baseCategory) {
  if (!baseCategory || baseCategory.trim() === "") {
    return [];
  }

  // Use a single comprehensive query with OR logic to find all matching categories
  // This will find "Bags", "all bags", "tote bags", etc. for input "bags"
  const categories = await categoryModel.find({
    $or: [
      // Exact match
      { name: new RegExp(`^${baseCategory}$`, "i") },
      // Ends with base category
      { name: { $regex: `${baseCategory}$`, $options: "i" } },
      // Contains base category
      { name: { $regex: baseCategory, $options: "i" } },
      // Word boundary match
      { name: { $regex: `\\b${baseCategory}\\b`, $options: "i" } },
      // Synonyms
      ...getCategorySynonyms(baseCategory).map((synonym) => ({
        name: { $regex: synonym, $options: "i" },
      })),
    ]
  });

  if (categories.length > 0) {
    // Remove duplicates and return IDs
    const uniqueIds = [...new Set(categories.map((cat) => cat._id.toString()))];
    return uniqueIds.map(id => categories.find(cat => cat._id.toString() === id)._id);
  }

  return [];
}

function getCategorySynonyms(baseCategory) {
  const synonyms = {
    bags: [
      "bag",
      "handbag",
      "handbags",
      "purse",
      "purses",
      "tote",
      "clutch",
      "satchel",
      "backpack",
    ],
    shoes: [
      "shoe",
      "footwear",
      "sneaker",
      "sneakers",
      "boot",
      "boots",
      "sandal",
      "sandals",
    ],
    clothing: [
      "clothes",
      "apparel",
      "wear",
      "garment",
      "outfit",
      "dress",
      "shirt",
      "top",
    ],
    accessories: [
      "accessory",
      "jewelry",
      "watches",
      "belts",
      "wallet",
      "sunglasses",
    ],
    tops: ["top", "shirt", "blouse", "t-shirt", "tshirt", "sweater", "hoodie"],
    bottoms: ["bottom", "pants", "jeans", "trousers", "shorts", "skirt"],
  };

  return synonyms[baseCategory.toLowerCase()] || [];
}
async function applyStrictGenderFilter(products, detectedGender) {
  if (!detectedGender || !products.length) return products;

  const genderPatterns = GENDER_PATTERNS[detectedGender];
  console.log(`🔍 Applying strict gender filter for ${detectedGender}`);
  console.log(`   Looking for keywords: ${genderPatterns.keywords.join(', ')}`);
  console.log(`   Excluding: ${genderPatterns.exclusions.join(', ')}`);

  const strictMatches = [];
  const neutralMatches = [];
  const categoriesOFCurrentProducts = [];

  products.forEach((product) => {
    const categoryNames = (product.categories || [])
      .map(cat => cat?.categoryId?.name?.toLowerCase())
      .filter(Boolean);

    const primaryCategoryName = product.primaryCategory?.name?.toLowerCase();

    // Add all for logging/debugging
    categoriesOFCurrentProducts.push(...categoryNames);
    if (primaryCategoryName) {
      categoriesOFCurrentProducts.push(primaryCategoryName);
    }

    // Combine all category names to check
    const allCategoryNames = new Set([
      ...categoryNames,
      ...(primaryCategoryName ? [primaryCategoryName] : [])
    ]);

    console.log(`\n  Product: "${product.name}"`);
    console.log(`    Categories: ${[...allCategoryNames].join(', ')}`);

    // Gender keyword match
    const hasGenderKeyword = genderPatterns.keywords.some(kw =>
      [...allCategoryNames].includes(kw.toLowerCase())
    );

    // Exclusion keyword match
    const hasExclusionKeyword = genderPatterns.exclusions.some(ex =>
      [...allCategoryNames].includes(ex.toLowerCase())
    );

    console.log(`    Has gender keyword: ${hasGenderKeyword}`);
    console.log(`    Has exclusion keyword: ${hasExclusionKeyword}`);

    // Decide match type
    const isStrictMatch = hasGenderKeyword && !hasExclusionKeyword;
    const isNeutralMatch = !hasGenderKeyword && !hasExclusionKeyword;

    if (isStrictMatch) {
      strictMatches.push(product);
      console.log(`    ✅ STRICT MATCH`);
    } else if (isNeutralMatch) {
      neutralMatches.push(product);
      console.log(`    😐 NEUTRAL MATCH`);
    } else {
      console.log(`    🚫 REJECTED - ${hasExclusionKeyword ? "has exclusion" : "missing gender"}`);
    }
  });

  console.log(`\n📊 Results: ${strictMatches.length} strict matches, ${neutralMatches.length} neutral matches`);

  // FIXED: Only return strict matches when gender filter is applied
  // Do NOT include neutral products when user explicitly selects a gender category
  const validatedProducts = strictMatches;
  return validatedProducts;
}


async function getTotalWithGenderFiltering(baseQuery, detectedGender) {
  try {
    const allProducts = await productModel
      .find(baseQuery)
      .populate("categories.categoryId", "name")
      .populate("primaryCategory", "name")
      .select("name description tags categories primaryCategory")
      .lean();

    const filteredProducts = await applyStrictGenderFilter(
      allProducts,
      detectedGender
    );
    return filteredProducts.length;
  } catch (error) {
    console.error("Error counting with gender filter:", error);
    return await Product.countDocuments(baseQuery);
  }
}
module.exports = {
  buildGenderAwareQuery,
  processGenderAwareCategories,
  hasGenderSpecificQuery,
  findCategoriesWithFuzzyMatch,
  detectGenderFromQuery,
  validateGenderMatch,
  detectStrictGender,
  buildStrictGenderFilter,
  applyPostQueryGenderValidation,
  countProductsWithStrictGenderFilter,
  applyPostQueryGenderValidation,
  parseGenderCategory,
  findBaseCategoryMatches,
  getCategorySynonyms,
  applyStrictGenderFilter,
  getTotalWithGenderFiltering,
};
