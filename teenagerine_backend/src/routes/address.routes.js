/**
 * Address Routes
 * @file This file defines the routes for managing user addresses.
 * It includes routes for creating, retrieving, updating, and deleting addresses.
 * It also includes middleware for authentication and authorization.
 * * @module routes/address.routes
 * * @requires express
 * @requires ../controllers/address.controller.js
 * @requires ../middlewares/auth.middleware.js
 * @swagger
 * /api/addresses:
 *   post:
 *     summary: Create a new address
 *     tags:
 *       - Address
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Address'
 *     responses:
 *       201:
 *         description: Address created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Address'
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 *   get:
 *     summary: Get all addresses
 *     tags:
 *       - Address
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of addresses
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Address'
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 * tags:
 *   name: Address
 *   description: Address management routes
 */


const {createAddress,getAddressById,getAllAddresses,updateAddress,deleteAddress, getAddressByUserId} =require("../controllers/address.controller.js");
const express = require("express");

const router = express.Router();
const { protect, restrictTo } = require("../middlewares/auth.middleware.js");

// User routes
router.post("/", protect, createAddress);
router.get("/", protect, getAddressByUserId);
router.get("/:id", protect, getAddressById);    
router.put("/:id", protect, updateAddress);
router.delete("/:id", protect, deleteAddress);

// Admin routes
router.get("/admin/all", protect, restrictTo("admin"), getAllAddresses);

module.exports=router;