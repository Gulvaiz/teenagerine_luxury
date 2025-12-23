const aboutSectionModel = require("../models/aboutSection.model");
const footerModel = require("../models/footer.model");
const globalController = require("../models/global.controller.model");
const HomepageSection = require("../models/homepageSection.model");
const instagramModel = require("../models/instagram.model");
const popupModalModel = require("../models/popupModal.model");
const prestigiousBrandsModel = require("../models/prestigiousBrands.model");
const productModel = require("../models/product.model");
const sellWithUsSectionModel = require("../models/sellWithUsSection.model");
const sliderModel = require("../models/slider.model");

exports.getHomePage = async (req, res) => {
  try {
    const existingGlobal = await globalController.find();
    if (existingGlobal.length === 0) {
      await globalModel.create({});
    }

    // Execute queries in parallel using Promise.all
    const [
      sliders,
      products,
      sellWithUs,
      posts,
      prestigious,
      about,
      homePageOrder,
      popup,
      footer,
      globalControllerData
    ] = await Promise.all([
      sliderModel.find().sort({ order: 1 }),

      productModel.find({ isSale: true })
        .populate("categories.categoryId", "name slug description")
        .populate("brands.brandId", "name slug description image")
        .populate("primaryCategory", "name slug description")
        .populate("primaryBrand", "name slug description image")
        .sort({ createdAt: -1 })
        .limit(10),

      sellWithUsSectionModel.findOne(),
      instagramModel.find().sort({ order: 1 }),
      prestigiousBrandsModel.findOne(),
      aboutSectionModel.findOne(),
      HomepageSection.find().sort({ order: 1 }),
      popupModalModel.find({ isActive: true }),
      footerModel.findOne(),
      globalController.findOne()
    ]);

    const data = {
      sliders,
      products,
      sellWithUs,
      posts,
      prestigious,
      about,
      homePageOrder,
      footer,
      popup,
      globalControllerData
    };

    res.status(200).json(data);
  } catch (error) {
    console.error("Error in getHomePage:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
