const BrandModel = require("../models/brand.model");
const { defaultUser } = require("./productSeedHelper");

exports.BrandProcess = async (brandName) => {
  if (!brandName || brandName.trim() === "") {
    return null;
  }

  const normalizedBrandName = brandName.trim();
  return await FindOrCreateBrand(normalizedBrandName);
};

const FindOrCreateBrand = async (brandName) => {
  const userId = await defaultUser();

  try {
    // Escape special regex characters in brand name
    const escapedBrandName = brandName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    // Check if brand already exists (case-insensitive)
    const existingBrand = await BrandModel.findOne({
      name: { $regex: new RegExp(`^${escapedBrandName}$`, 'i') }
    });

    if (existingBrand) {
      console.log(`✓ Found existing brand: ${existingBrand.name} (${existingBrand._id})`);
      return existingBrand._id;
    }

    // Create new brand if it doesn't exist
    const newBrand = await BrandModel.create({
      name: brandName,
      description: `${brandName} brand`,
      slug: brandName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
      image: "./default.jpg", // Default image path
      post_by: userId,
      isActive: true
    });

    console.log(`✓ Created new brand: ${newBrand.name} (${newBrand._id})`);
    return newBrand._id;
  } catch (error) {
    console.error(`❌ Error processing brand ${brandName}:`, error.message);
    return null;
  }
};