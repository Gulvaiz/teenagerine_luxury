const express = require("express");
const router = express.Router();
const homepageContentController = require("../controllers/homepageContent.controller");

router.get("/", homepageContentController.getAllContent);
router.get("/:sectionName", homepageContentController.getContentBySection);
router.put("/:sectionName", homepageContentController.updateSectionContent);
router.post("/:sectionName/elements", homepageContentController.addContentElement);
router.put("/:sectionName/elements/:elementId", homepageContentController.updateContentElement);
router.delete("/:sectionName/elements/:elementId", homepageContentController.deleteContentElement);
router.post("/initialize", homepageContentController.initializeDefaultContent);

module.exports = router;