const express = require('express');
const router = express.Router();
const ccavenueController = require('../controllers/ccavenue.controller');
const { protect, restrictTo } = require('../middlewares/auth.middleware');

// Debug logging middleware
// router.use((req, res, next) => {
//   console.log(`📱 SMS Route: ${req.method} ${req.path} - ${new Date().toISOString()}`);
//   next();
// });

// Routes that require authentication
router.post('/initiate', protect, ccavenueController.initiatePayment);
router.get('/status/:orderId', protect, ccavenueController.getPaymentStatus);
router.post('/verify', protect, ccavenueController.verifyPayment);

// Public routes (no authentication required)
router.post('/response', ccavenueController.handlePaymentResponse);
router.get('/cancel', ccavenueController.handlePaymentCancel);

/**
 * @swagger
 * /api/ccavenue/initiate:
 *   post:
 *     summary: Initiate CCAvenue payment
 *     tags: [CCAvenue Payment]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - orderId
 *             properties:
 *               orderId:
 *                 type: string
 *                 description: Order ID to process payment for
 *               returnUrl:
 *                 type: string
 *                 description: Optional return URL after payment
 *     responses:
 *       200:
 *         description: Payment request created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 message:
 *                   type: string
 *                 paymentRequest:
 *                   type: object
 *                 orderId:
 *                   type: string
 */
// Route already defined above with authentication

/**
 * @swagger
 * /api/ccavenue/response:
 *   post:
 *     summary: Handle CCAvenue payment response
 *     tags: [CCAvenue Payment]
 *     description: This endpoint handles the payment response from CCAvenue
 *     requestBody:
 *       required: true
 *       content:
 *         application/x-www-form-urlencoded:
 *           schema:
 *             type: object
 *             properties:
 *               encResp:
 *                 type: string
 *                 description: Encrypted response from CCAvenue
 *     responses:
 *       302:
 *         description: Redirects to success/failure page
 */
// Route already defined above as public

/**
 * @swagger
 * /api/ccavenue/status/{orderId}:
 *   get:
 *     summary: Get payment status for an order
 *     tags: [CCAvenue Payment]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *         description: Order ID
 *     responses:
 *       200:
 *         description: Payment status retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 data:
 *                   type: object
 */
// Route already defined above with authentication

/**
 * @swagger
 * /api/ccavenue/cancel:
 *   get:
 *     summary: Handle payment cancellation
 *     tags: [CCAvenue Payment]
 *     parameters:
 *       - in: query
 *         name: orderId
 *         schema:
 *           type: string
 *         description: Order ID (optional)
 *     responses:
 *       302:
 *         description: Redirects to cancellation page
 */
// Route already defined above as public

/**
 * @swagger
 * /api/ccavenue/verify:
 *   post:
 *     summary: Verify payment status
 *     tags: [CCAvenue Payment]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - orderId
 *               - trackingId
 *             properties:
 *               orderId:
 *                 type: string
 *               trackingId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Payment verification completed
 */
// Route already defined above with authentication

module.exports = router;