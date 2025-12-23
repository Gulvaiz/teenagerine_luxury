const express= require("express");
const router = express.Router();
const {createContactUs,getAllContactUs,getContactUsById,deleteContactUs,updateContactUs} =require("../controllers/contactUs.controller");
const { restrictTo } = require("../middlewares/auth.middleware");

router.post("/add", createContactUs);
router.get("/", getAllContactUs);
router.get("/:id", getContactUsById);
router.put("/update/:id", restrictTo("admin"), updateContactUs);
router.delete("/delete/:id", restrictTo("admin"), deleteContactUs);

module.exports = router;