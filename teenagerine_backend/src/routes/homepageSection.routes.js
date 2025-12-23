const express = require("express");
const router = express.Router();
const homepageSectionController = require("../controllers/homepageSection.controller");

router.get("/", homepageSectionController.getAllSections);
router.put("/order", homepageSectionController.updateSectionOrder);
router.post("/initialize", homepageSectionController.initializeSections);
router.patch("/:id/toggle", homepageSectionController.toggleSectionActive);

module.exports = router;