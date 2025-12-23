const express = require('express');
const router = express.Router();
const { getGlobalController, updateGlobalController } = require('../controllers/globalController.contoller');
const { restrictTo, protect } = require('../middlewares/auth.middleware');

router.get('/', getGlobalController);
router.put('/update/:id', protect, restrictTo("admin"), updateGlobalController);

module.exports = router;