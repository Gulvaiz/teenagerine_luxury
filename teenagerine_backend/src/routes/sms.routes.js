/**
 * @swagger
 * /api/sms/send:
 * post:
 * summary: Send custom SMS
 * description: Send custom SMS to specific users (Admin only)
 * tags: [SMS]
 *
 * /api/sms/promotional:
 * post:
 * summary: Send promotional SMS
 * description: Send promotional SMS to user groups (Admin only)
 * tags: [SMS]
 */

const express = require('express');
const router = express.Router();
const {
  sendCustomSMS,
  sendPromotionalSMS,
  getSMSLogs,
  getSMSStats,
  getSMSTemplates,
  getSMSHealth,
  updateDeliveryStatus,
  testSMS
} = require('../controllers/sms.controller');
const { protect, restrictTo } = require('../middlewares/auth.middleware');

// Debug logging middleware
router.use((req, res, next) => {
  console.log(`📱 SMS Route: ${req.method} ${req.path} - ${new Date().toISOString()}`);
  next();
});

// Webhook endpoint (no auth required)
router.post('/delivery-status', updateDeliveryStatus);

// Admin only routes
router.use(protect);
router.use(restrictTo('admin'));

// SMS sending routes
router.post('/send', sendCustomSMS);
router.post('/promotional', sendPromotionalSMS);
router.post('/test', testSMS);

// SMS management routes
router.get('/logs', getSMSLogs);
router.get('/stats', getSMSStats);
router.get('/templates', getSMSTemplates);
router.get('/health', getSMSHealth);

module.exports = router;