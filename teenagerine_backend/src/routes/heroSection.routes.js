const express= require("express");
const router = express.Router();
const { createHeroSection, getAllHeroSections, getHeroSectionById, updateHeroSection, deleteHeroSection } = require("../controllers/heroSection.controller");
const { restrictTo } = require("../middlewares/auth.middleware");

router.get("/", getAllHeroSections);
router.get("/:id", getHeroSectionById);
router.post("/add", restrictTo("admin"), createHeroSection);
router.put("/update/:id", restrictTo("admin"), updateHeroSection);
router.delete("/delete/:id", restrictTo("admin"), deleteHeroSection);

module.exports = router;