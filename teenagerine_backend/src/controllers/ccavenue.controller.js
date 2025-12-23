const ccavenueService = require('../services/ccavenueService');
const Order = require('../models/order.model');

/**
 * Initiate CCAvenue payment
 */
exports.initiatePayment = async (req, res) => {
  try {
    const { orderId, returnUrl } = req.body;

    if (!orderId) {
      return res.status(400).json({
        status: 'fail',
        message: 'Order ID is required'
      });
    }

    // Find the order
    const order = await Order.findById(orderId)
      .populate('user')
      .populate('shippingAddress')
      .populate('billingAddress');

    if (!order) {
      return res.status(404).json({
        status: 'fail',
        message: 'Order not found'
      });
    }

    // Check if user owns this order or is admin
    if (req.user._id.toString() !== order.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        status: 'fail',
        message: 'Unauthorized to access this order'
      });
    }

    // Prepare payment data
    const paymentData = {
      orderId: order.orderNumber || order._id.toString(),
      amount: order.totalAmount,
      customerName: order.user.name,
      customerEmail: order.user.email,
      customerPhone: order.user.phone || '1234567890',
      billingAddress: order.billingAddress,
      deliveryAddress: order.shippingAddress
    };

    // Create payment request
    const paymentRequest = ccavenueService.createPaymentRequest(paymentData);

    // Update order status to indicate payment initiated
    order.paymentMethod = 'CCAvenue';
    order.paymentStatus = 'initiated';
    order.paymentInitiatedAt = new Date();
    await order.save();

    res.status(200).json({
      status: 'success',
      message: 'Payment request created successfully',
      paymentRequest,
      orderId: order._id
    });

  } catch (error) {
    console.error('CCAvenue payment initiation error:', error);
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

/**
 * Handle CCAvenue payment response
 */
exports.handlePaymentResponse = async (req, res) => {
  try {
    const { encResp } = req.body;

    if (!encResp) {
      return res.status(400).json({
        status: 'fail',
        message: 'Invalid payment response'
      });
    }

    // Process the payment response
    const paymentResponse = ccavenueService.processPaymentResponse(encResp);

    // Find the order using order ID from response
    const order = await Order.findOne({
      $or: [
        { orderNumber: paymentResponse.orderId },
        { _id: paymentResponse.orderId }
      ]
    }).populate('user');

    if (!order) {
      console.error('Order not found for payment response:', paymentResponse.orderId);
      return res.status(404).json({
        status: 'fail',
        message: 'Order not found'
      });
    }

    // Update order with payment information
    order.paymentStatus = paymentResponse.success ? 'completed' : 'failed';
    order.paymentResponse = {
      trackingId: paymentResponse.trackingId,
      bankRefNo: paymentResponse.bankRefNo,
      orderStatus: paymentResponse.orderStatus,
      failureMessage: paymentResponse.failureMessage,
      paymentMode: paymentResponse.paymentMode,
      cardName: paymentResponse.cardName,
      statusMessage: paymentResponse.statusMessage,
      responseTime: paymentResponse.responseTime,
      rawResponse: paymentResponse.rawResponse
    };

    if (paymentResponse.success) {
      order.status = 'Processing'; // Update order status to processing
      order.paymentCompletedAt = new Date();
    } else {
      order.status = 'Cancelled'; // Cancel order if payment failed
      order.paymentFailedAt = new Date();
    }

    await order.save();

    // Redirect based on payment status
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

    if (paymentResponse.success) {
      // Redirect to success page
      res.redirect(`${frontendUrl}/payment/success?orderId=${order._id}&trackingId=${paymentResponse.trackingId}`);
    } else {
      // Redirect to failure page
      res.redirect(`${frontendUrl}/payment/failure?orderId=${order._id}&reason=${encodeURIComponent(paymentResponse.failureMessage || 'Payment failed')}`);
    }

  } catch (error) {
    console.error('CCAvenue response handling error:', error);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    res.redirect(`${frontendUrl}/payment/error?message=${encodeURIComponent('Payment processing error')}`);
  }
};

/**
 * Get payment status for an order
 */
exports.getPaymentStatus = async (req, res) => {
  try {
    const { orderId } = req.params;

    const order = await Order.findById(orderId).populate('user');

    if (!order) {
      return res.status(404).json({
        status: 'fail',
        message: 'Order not found'
      });
    }

    // Check if user owns this order or is admin
    if (req.user._id.toString() !== order.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        status: 'fail',
        message: 'Unauthorized to access this order'
      });
    }

    res.status(200).json({
      status: 'success',
      data: {
        orderId: order._id,
        orderNumber: order.orderNumber,
        paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentStatus,
        totalAmount: order.totalAmount,
        paymentResponse: order.paymentResponse,
        paymentInitiatedAt: order.paymentInitiatedAt,
        paymentCompletedAt: order.paymentCompletedAt,
        paymentFailedAt: order.paymentFailedAt
      }
    });

  } catch (error) {
    console.error('Get payment status error:', error);
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

/**
 * Handle payment cancellation
 */
exports.handlePaymentCancel = async (req, res) => {
  try {
    const { orderId } = req.query;

    if (orderId) {
      const order = await Order.findById(orderId);
      if (order) {
        order.paymentStatus = 'cancelled';
        order.paymentCancelledAt = new Date();
        await order.save();
      }
    }

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    res.redirect(`${frontendUrl}/payment/cancelled?orderId=${orderId || ''}`);

  } catch (error) {
    console.error('Payment cancellation error:', error);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    res.redirect(`${frontendUrl}/payment/error?message=${encodeURIComponent('Payment cancellation error')}`);
  }
};

/**
 * Verify payment (optional endpoint for additional verification)
 */
exports.verifyPayment = async (req, res) => {
  try {
    const { orderId, trackingId } = req.body;

    if (!orderId || !trackingId) {
      return res.status(400).json({
        status: 'fail',
        message: 'Order ID and Tracking ID are required'
      });
    }

    // Find the order
    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({
        status: 'fail',
        message: 'Order not found'
      });
    }

    // Verify with CCAvenue service
    const verificationResult = await ccavenueService.verifyPayment(orderId, trackingId);

    res.status(200).json({
      status: 'success',
      message: 'Payment verification completed',
      verification: verificationResult
    });

  } catch (error) {
    console.error('Payment verification error:', error);
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};