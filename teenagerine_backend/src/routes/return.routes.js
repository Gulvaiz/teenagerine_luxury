/**
 * @swagger
 * /api/returns:
 * post:
 *  summary: Create a return request
 * description: Create a return request for a purchased product
 * tags: [Return]
 * /api/returns:
 * get:
 *  summary: Get my return requests
 * description: Retrieve all return requests made by the current user
 * tags: [Return]  
 * /api/returns/{id}:
 *  get:
 * summary: Get return request by ID    
 * description: Retrieve a specific return request by its unique identifier
 * tags: [Return]
 */
const express = require("express");
const { createReturnRequest, getUserReturnRequests, getReturnRequestById, updateReturnRequestStatus } = require("../controllers/return.controller");
const { protect, restrictTo } = require("../middlewares/auth.middleware");
const router = express.Router();

router.use(protect);
router.post("/", createReturnRequest);
router.get("/", getUserReturnRequests);
router.get("/:id", getReturnRequestById);
router.patch("/:id", restrictTo("admin"), updateReturnRequestStatus);

module.exports = router;
