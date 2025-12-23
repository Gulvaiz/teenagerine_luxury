/**
 * @file auth.routes.js
 * @description This file defines the authentication routes for user signup and login.
 * @swagger
 * /api/auth/signup:
 *  post:
 * summary: User signup
 * description: Register a new user
 * tags:[Authentication]
 */

const express = require("express");
const router = express.Router();
const { signup, login, updatePassword } = require("../controllers/auth.controller");
const { protect} = require("../middlewares/auth.middleware");

router.post("/signup", signup);
router.post("/login", login);
router.patch("/update-password", protect, updatePassword);


module.exports = router;
