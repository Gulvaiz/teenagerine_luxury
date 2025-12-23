const express = require("express");
const { getUserCurrent, UpdateCurrentUser } = require("../controllers/user.controller");
const { restrictTo,protect } = require("../middlewares/auth.middleware");

const router=express.Router();

router.get("/",protect,getUserCurrent);
router.put("/",protect,restrictTo("user"),UpdateCurrentUser);
module.exports=router;