const express=require("express");
const { getManus, addMenu } = require("../controllers/menu.controller");

const router=express.Router();

router.get("/",getManus);
router.post("/",addMenu);

module.exports=router;