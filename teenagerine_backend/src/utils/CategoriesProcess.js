const CategoryModal = require("../models/category.model");
const { defaultUser } = require("./productSeedHelper");
exports.CategoriesProcess = async (categories) => {
  const StorageCategories = [];
  if (categories && categories.trim() !== "") {
    const categoryPaths = categories.split(",").map((path) => path.trim());
    StorageCategories.push(...categoryPaths);
  }
  return await CategoriesSeparateHelper(StorageCategories);
};

const CategoriesSeparateHelper = async (categoriesPaths) => {
  let SeparatedCategories = [];
  for (let i = 0; i < categoriesPaths.length; i++) {
    const pathCategories = categoriesPaths[i].split(">").map((part) => part.trim());
    SeparatedCategories.push(...pathCategories);
  }
  
  // Remove duplicates
  SeparatedCategories = [...new Set(SeparatedCategories)];
  return await FindExistingCategories(SeparatedCategories);
};

const FindExistingCategories = async (SeparatedCategories) => {
  const userId = await defaultUser();
  const collectionOfCategoriesId = [];
  let primaryCategoryId = null;

  for (let i = 0; i < SeparatedCategories.length; i++) {
    const currentCategory = SeparatedCategories[i].toLowerCase();
    const isExistingCategory = await CategoryModal.findOne({
      name: currentCategory,
    });
    
    if (isExistingCategory) {
      collectionOfCategoriesId.push(isExistingCategory._id);
      // Set the last category as primary
      if (i === SeparatedCategories.length - 1) {
        primaryCategoryId = isExistingCategory._id;
      }
    } else {
      // If category doesn't exist, create one
      const createdCategory = await CategoryModal.create({
        name: currentCategory,
        description: currentCategory,
        slug: currentCategory.replace(/\s+/g, '-'),
        post_by: userId,
      });
      
      if (createdCategory) {
        collectionOfCategoriesId.push(createdCategory._id);
        // Set the last category as primary
        if (i === SeparatedCategories.length - 1) {
          primaryCategoryId = createdCategory._id;
        }
      }
    }
  }
  
  return {
    categoryIds: collectionOfCategoriesId,
    primaryCategoryId: primaryCategoryId
  };
};
