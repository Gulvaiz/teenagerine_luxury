const express = require('express');
const { getHomePage } = require('../controllers/homePage.controller');
const router = express.Router();

router.get("/",getHomePage);
module.exports = router;