require("dotenv").config();
const Order = require("../models/order.model");
const Address = require("../models/address.model");
const Coupon = require("../models/coupon.model");
const Product = require("../models/product.model");
const { generateAndSaveInvoice } = require("../utils/invoiceGenerator");
const { generateInvoiceNumber } = require("../utils/invoiceNumberGenerator");
const { generateOrderNumber } = require("../utils/orderNumberGenerator");
const orderEmailService = require("../utils/email/orderEmailService");
const courierManager = require("../services/courierManager");
const CourierConfig = require("../services/courierConfig");
const smsService = require("../services/smsService");
const blueDartOrderService = require("../services/blueDartOrderService");

exports.createOrder = async (req, res) => {
  const data = req.body;
  try {
    const userId = req.user._id;
    if (!data) {
      return res
        .status(400)
        .json({ status: "fail", message: "Please provide order details" });
    }
    
    if (data.couponCode) {
      const coupon = await Coupon.findOne({ 
        code: data.couponCode.toUpperCase(),
        isActive: true
      });
      
      if (!coupon) {
        return res.status(400).json({ 
          status: "fail", 
          message: "Invalid coupon code" 
        });
      }
      
      // Check if coupon is expired
      const now = new Date();
      if (now > coupon.endDate || now < coupon.startDate) {
        return res.status(400).json({
          status: "fail",
          message: "Coupon has expired or not yet active",
        });
      }
      
      // Check usage limit
      if (coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit) {
        return res.status(400).json({
          status: "fail",
          message: "Coupon usage limit reached",
        });
      }
      
      // Calculate discount
      let discount = 0;
      if (coupon.type === "percentage") {
        discount = (data.subtotal * coupon.value) / 100;
        // Apply max discount if set
        if (coupon.maxDiscount && discount > coupon.maxDiscount) {
          discount = coupon.maxDiscount;
        }
      } else {
        // Fixed amount discount
        discount = coupon.value;
        // Ensure discount doesn't exceed cart total
        if (discount > data.subtotal) {
          discount = data.subtotal;
        }
      }
      
      // Update coupon usage
      coupon.usedCount += 1;
      coupon.userUsage.push({
        userId,
        usedCount: 1,
        lastUsed: new Date(),
      });
      await coupon.save();
      
      // Add coupon data to order
      data.coupon = {
        couponId: coupon._id,
        code: coupon.code,
        discountAmount: parseFloat(discount?.toFixed(2))
      };

      // Calculate total: subtotal - discount + deliveryCharge
      const deliveryCharge = data.deliveryCharge || 0;
      data.totalAmount = parseFloat((data.subtotal - discount + deliveryCharge)?.toFixed(2));
    } else {
      // No coupon, total = subtotal + deliveryCharge
      const deliveryCharge = data.deliveryCharge || 0;
      data.totalAmount = parseFloat((data.subtotal + deliveryCharge)?.toFixed(2));
    }

    // Generate order number
    const orderNumber = await generateOrderNumber();

    const addedOrder = await Order.create({ ...data, user: userId, orderNumber });
    if (!addedOrder) {
      return res.status(400).json({ status: "fail", message: "Failed to add order" });
    }

    // Populate order with all necessary data for email and SMS
    const populatedOrder = await Order.findById(addedOrder._id)
      .populate("user")
      .populate("items.productId")
      .populate("shippingAddress")
      .populate("billingAddress");

    // --- ENHANCED EMAIL AUTOMATION ---
    try {
      // Send comprehensive order confirmation emails using new service
      const emailResult = await orderEmailService.sendOrderConfirmationEmails(
        populatedOrder,
        data
      );

      if (emailResult.success) {
        console.log('✅ Order confirmation emails sent successfully');
      } else {
        console.error('❌ Some order emails failed:', emailResult.results);
      }
    } catch (emailError) {
      console.error('Error in enhanced email automation:', emailError);
    }
    // --- END ENHANCED EMAIL AUTOMATION ---

    // --- SMS AUTOMATION ---
    try {
      // Send order confirmation SMS
      await smsService.sendOrderConfirmationSMS(populatedOrder, populatedOrder.user);
      console.log('✅ Order confirmation SMS sent successfully');
    } catch (smsError) {
      console.error('❌ Order confirmation SMS failed:', smsError.message);
    }
    
    // Update product stock quantities
    try {
      await updateProductStockQuantities(data.items);
    } catch (stockError) {
      console.error('Error updating stock quantities:', stockError);
    }

    // --- AUTOMATIC SHIPMENT CREATION ---
    try {
      // Only create shipment automatically if enabled in environment
      if (process.env.AUTO_CREATE_SHIPMENTS === 'true') {
        await createAutomaticShipment(populatedOrder);
        console.log(`✅ Automatic shipment created for order ${populatedOrder.orderNumber}`);
      }
    } catch (shipmentError) {
      console.error('❌ Automatic shipment creation failed:', shipmentError.message);
      // Don't fail the order creation if shipment creation fails
    }

    res.status(201).json({ status: "success", order: addedOrder });
  } catch (error) {
    console.log(error);
    res.status(500).json({ status: "error", message: error.message });
  }
};

// Enhanced update order status with email notifications
exports.updateOrderStatus = async (req, res) => {
   const { orderId } = req.params;
  try {
    const { status} = req.body;
    const order = await Order.findById(orderId)
      .populate("user")
      .populate("items.productId")
      .populate("shippingAddress")
      .populate("billingAddress");

    if (!order) {
      return res.status(404).json({ 
        status: "fail", 
        message: "Order not found" 
      });
    }

    const previousStatus = order.status;
    
    // Update order status
    order.status = status;
    await order.save();

    // Send status update email and SMS if status actually changed
    if (previousStatus !== status) {
      try {
        await orderEmailService.sendOrderStatusUpdate(order, previousStatus, order);
        // console.log(`✅ Status update email sent for order ${order.orderNumber}`);
      } catch (emailError) {
        console.error('❌ Failed to send status update email:', emailError);
      }

      // Send SMS notification
      try {
        await smsService.sendOrderStatusSMS(order, order.user, status);
        //console.log(`✅ Status update SMS sent for order ${order.orderNumber}`);
      } catch (smsError) {
        console.error('❌ Failed to send status update SMS:', smsError.message);
      }

      // --- BLUEDART PICKUP AUTOMATION ---
      // Register pickup when admin confirms or processes order
      if (['Processing'].includes(status) && !['Processing', 'Shipped', 'Delivered'].includes(previousStatus)) {
        try {
          const pickupResult = await blueDartOrderService.handleOrderConfirmation(order, status);
          if (pickupResult.success) {
            //console.log(`✅ BlueDart pickup registered for order ${order.orderNumber}: Token ${pickupResult.tokenNumber}`);
          } else if (pickupResult.skipReason) {
            //console.log(`ℹ️ BlueDart pickup skipped for order ${order.orderNumber}: ${pickupResult.message}`);
          } else {
            //console.error(`❌ BlueDart pickup failed for order ${order.orderNumber}: ${pickupResult.message}`);
          }
        } catch (pickupError) {
          //console.error(`❌ BlueDart pickup automation error for order ${order.orderNumber}:`, pickupError.message);
        }
      }

      // Cancel pickup if order is cancelled
      if (status === 'Cancelled' && order.blueDartPickup && order.blueDartPickup.tokenNumber && !order.blueDartPickup.cancelled) {
        try {
          const cancelResult = await blueDartOrderService.cancelPickup(order, 'Order cancelled by admin');
          if (cancelResult.success) {
            //console.log(`✅ BlueDart pickup cancelled for order ${order.orderNumber}`);
          } else {
            //console.error(`❌ BlueDart pickup cancellation failed for order ${order.orderNumber}: ${cancelResult.message}`);
          }
        } catch (cancelError) {
          //console.error(`❌ BlueDart pickup cancellation error for order ${order.orderNumber}:`, cancelError.message);
        }
      }
    }

    res.status(200).json({
      status: "success",
      message: "Order status updated successfully",
    });
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({ 
      status: "error", 
      message: error.message 
    });
  }
};

exports.getOrder=async (req,res)=>{
    const orderId = req.params.orderId;
 try{

  const order = await Order.findById(orderId)
    .populate("items.productId")
    .select('+deliveryCharge +subtotal'); // Ensure deliveryCharge and subtotal are included
  if(!order){
    res.status(404).json({status:"fail", message:"Order not found"})
  }
  const address=await Address.findById(order.shippingAddress);
  res.status(200).json({status:"success", order,address})
 }catch(error){
  console.log(error);
  res.status(500).json({status:"error",message:error.message})
 }
}

exports.getOrderByUserId=async(req,res)=>{
  try{
     const userId=req.user._id;
     const orders = await Order.find({user:userId})
       .populate("items.productId")
       .select('+deliveryCharge +subtotal'); // Ensure deliveryCharge and subtotal are included
     if(!orders){
      res.status(404).json({status:"fail", message:"Orders not found"})
     }
     res.status(200).json({status:"success", orders})
  }catch(error){
    console.log(error);
    res.status(500).json({status:"error", message:error.message})
  }

}
exports.getMyOrders = async (req, res) => {
  try {
    const { page = 1, limit = 10, sort = "createdAt", keyword } = req.query;
    const skip = (page - 1) * limit;
    const query = keyword ? { name: { $regex: keyword, $options: "i" } } : {};
    const orders = await Order.find(query)
      .skip(skip)
      .limit(limit)
      .sort(sort)
      .populate("items.product");
    const total = await Order.countDocuments(query);
    const totalPages = Math.ceil(total / limit);
    res
      .status(200)
      .json({ status: "success", orders, page, limit, total, totalPages });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
};

exports.getAllOrders = async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({ status: "fail", message: "Access denied. Admin only." });
    }
    
    const { page = 1, limit = 20, sort = "-createdAt", keyword, status } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Build query for search and filtering
    let query = {};
    
    // Search functionality
    if (keyword) {
      query.$or = [
        { orderNumber: { $regex: keyword, $options: "i" } }
      ];
    }
    
    // Status filter
    if (status && status !== 'all') {
      query.status = status;
    }
    
    // console.log('Fetching orders with query:', query);
    
    const orders = await Order.find(query)
      .skip(skip)
      .limit(parseInt(limit))
      .sort(sort)
      .populate("user", "name email phone")
      .populate("items.productId", "name image price")
      .populate("shippingAddress")
      .populate("billingAddress");
      
    const total = await Order.countDocuments(query);
    const totalPages = Math.ceil(total / parseInt(limit));
    
    // console.log(`Found ${orders.length} orders out of ${total} total`);
    
    res.status(200).json({ 
      status: "success", 
      data: {
        orders, 
        pagination: {
          page: parseInt(page), 
          limit: parseInt(limit), 
          total, 
          totalPages,
          hasMore: parseInt(page) < totalPages
        }
      }
    });
  } catch (error) {
    console.error('Error in getAllOrders:', error);
    res.status(500).json({ status: "error", message: error.message });
  }
};

exports.generateInvoice = async (req, res) => {
  try {
    const orderId = req.params.id;
    const order = await Order.findById(orderId)
      .populate('user', 'name email')
      .populate('items.productId', 'name')
      .populate('shippingAddress');
    //  console.log(order);
    if (!order) {
      return res.status(404).json({ status: "fail", message: "Order not found" });
    }

    // Check if user is authorized to access this order
    if (req.user.role !== 'admin' && order.user._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ status: "fail", message: "You are not authorized to access this order" });
    }

    // Generate invoice number if not exists
    let invoiceNumber = order.invoice?.invoiceNumber;
    if (!invoiceNumber) {
      invoiceNumber = await generateInvoiceNumber();
    }

    // Generate and save invoice with better error handling
    try {
      const invoiceData = await generateAndSaveInvoice(order);
      invoiceData.invoiceNumber = invoiceNumber;
      // console.log('Generated invoice data:', invoiceData);

      // Update order with invoice data using findByIdAndUpdate to avoid validation
      await Order.findByIdAndUpdate(orderId, { invoice: invoiceData }, { runValidators: false });
      // console.log(`Invoice saved to order ${orderId}`);

      res.status(200).json({
        status: "success",
        message: "Invoice generated successfully",
        invoice: invoiceData
      });
    } catch (invoiceError) {
      console.error('Invoice generation error:', invoiceError);

      // Return a more user-friendly error message
      res.status(500).json({
        status: "error",
        message: "Failed to generate invoice. Please try again or contact support.",
        details: process.env.NODE_ENV === 'development' ? invoiceError.message : undefined
      });
    }
  } catch (error) {
    console.error('Error in generateInvoice:', error);
    res.status(500).json({
      status: "error",
      message: "An error occurred while processing your request. Please try again.",
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get a signed URL for downloading an invoice
 */
exports.getInvoiceDownloadUrl = async (req, res) => {
  try {
    const orderId = req.params.id;
    //console.log(`Getting invoice download for order: ${orderId}`);

    // Find the order
    const order = await Order.findById(orderId).populate('user', '_id');

    if (!order) {
      //console.log(`Order not found: ${orderId}`);
      return res.status(404).json({ status: "fail", message: "Order not found" });
    }

    //console.log(`Order found: ${order.orderNumber}, Invoice data:`, order.invoice);

    // Check if user is authorized to access this order
    if (req.user.role !== 'admin' && order.user._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ status: "fail", message: "You are not authorized to access this invoice" });
    }

    // Check if invoice exists
    if (!order.invoice || !order.invoice.localPath) {
      //console.log('Invoice or localPath not found in order');
      // If no invoice exists, try to generate one
      return res.status(404).json({ status: "fail", message: "Invoice not found for this order. Please generate the invoice first." });
    }

    //console.log(`Checking file path: ${order.invoice.localPath}`);

    // Check if file exists on disk
    const fs = require('fs');
    if (!fs.existsSync(order.invoice.localPath)) {
      //console.log(`File not found on disk: ${order.invoice.localPath}`);
      return res.status(404).json({ status: "fail", message: "Invoice file not found on disk. Please regenerate the invoice." });
    }

    //console.log('File found, streaming PDF...');

    // Set headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="invoice_${order.orderNumber}.pdf"`);

    // Stream the file
    const fileStream = fs.createReadStream(order.invoice.localPath);
    fileStream.pipe(res);
  } catch (error) {
    console.error('Error getting invoice download URL:', error);
    res.status(500).json({ status: "error", message: error.message });
  }
};

/**
 * Helper function to update product stock quantities
 * @param {Array} items - Array of order items with productId and quantity
 */
async function updateProductStockQuantities(items) {
  try {
    // Update each product's stock directly in the database
    for (const item of items) {
      const { productId, quantity } = item;
      
      // Find the product
      const product = await Product.findById(productId);
      if (!product) continue;
      
      // Calculate new stock quantity (ensure it doesn't go below 0)
      const newStockQuantity = Math.max(0, product.stockQuantity - quantity);
      
      // Update the product
      await Product.findByIdAndUpdate(productId, {
        stockQuantity: newStockQuantity,
        soldOut: newStockQuantity === 0
      });
    }
  } catch (error) {
    console.error('Error in updateProductStockQuantities:', error);
    throw error;
  }
}

/**
 * Add tracking information to an order
 */
exports.addTrackingToOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { trackingNumber, carrier = 'DHL', destination = 'IN' } = req.body;

    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        status: "fail",
        message: "Access denied. Admin only."
      });
    }

    if (!trackingNumber) {
      return res.status(400).json({
        status: "fail",
        message: "Tracking number is required"
      });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({
        status: "fail",
        message: "Order not found"
      });
    }

    // Get courier service and generate tracking URL
    let trackingUrl = '';
    const courierLower = carrier.toLowerCase();

    if (courierLower === 'dhl') {
      trackingUrl = `https://www.dhl.com/en/express/tracking.html?AWB=${trackingNumber}&brand=DHL`;
    } else if (courierLower === 'bluedart') {
      trackingUrl = `https://www.bluedart.com/web/guest/trackdartresult?trackFor=0&trackNo=${trackingNumber}`;
    } else {
      // Generic tracking URL
      trackingUrl = `#tracking-${trackingNumber}`;
    }

    // Update order with tracking information
    order.tracking = {
      trackingNumber,
      carrier,
      trackingUrl,
      shippedAt: new Date(),
      lastUpdated: new Date(),
      courierService: courierLower
    };

    // Update order status to Shipped if it's not already
    if (order.status === 'Processing' || order.status === 'Pending') {
      order.status = 'Shipped';
    }

    await order.save();

    res.status(200).json({
      status: "success",
      message: "Tracking information added successfully",
      tracking: order.tracking
    });
  } catch (error) {
    console.error('Error adding tracking to order:', error);
    res.status(500).json({
      status: "error",
      message: error.message
    });
  }
};

/**
 * Track an order by order ID
 */
exports.trackOrderById = async (req, res) => {
  try {
    const { orderId } = req.params;

    const order = await Order.findById(orderId)
      .populate("user", "name email")
      .populate("items.productId", "name image")
      .populate("shippingAddress");

    if (!order) {
      return res.status(404).json({
        status: "fail",
        message: "Order not found"
      });
    }

    // Check if user is authorized to track this order
    if (req.user.role !== 'admin' && order.user._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        status: "fail",
        message: "You are not authorized to track this order"
      });
    }

    // If no tracking number, return order status only
    if (!order.tracking || !order.tracking.trackingNumber) {
      return res.status(200).json({
        status: "success",
        order: {
          orderNumber: order.orderNumber,
          status: order.status,
          createdAt: order.createdAt,
          updatedAt: order.updatedAt,
          items: order.items,
          shippingAddress: order.shippingAddress,
          totalAmount: order.totalAmount
        },
        tracking: {
          available: false,
          message: "Tracking information not yet available"
        }
      });
    }

    // Get tracking information from appropriate courier service
    let trackingData = null;
    try {
      const courierService = order.tracking.courierService || 'dhl';
      const destination = order.shippingAddress?.country || 'IN';

      trackingData = await courierManager.trackShipment(
        order.tracking.trackingNumber,
        courierService,
        destination
      );

      // Update order tracking data with latest info
      order.tracking.lastUpdated = new Date();
      if (trackingData.estimatedDelivery) {
        order.tracking.estimatedDelivery = trackingData.estimatedDelivery;
      }
      await order.save();
    } catch (trackingError) {
      console.error('Courier tracking error:', trackingError.message);

      // Provide fallback tracking information based on order status
      let fallbackStatus = 'UNKNOWN';
      let fallbackDescription = 'Tracking information temporarily unavailable';

      switch (order.status) {
        case 'Pending':
          fallbackStatus = 'PENDING';
          fallbackDescription = 'Order is being prepared for shipment';
          break;
        case 'Processing':
          fallbackStatus = 'PROCESSING';
          fallbackDescription = 'Order is being processed';
          break;
        case 'Shipped':
          fallbackStatus = 'IN_TRANSIT';
          fallbackDescription = 'Package has been shipped and is in transit';
          break;
        case 'Delivered':
          fallbackStatus = 'DELIVERED';
          fallbackDescription = 'Package has been delivered';
          break;
        case 'Cancelled':
          fallbackStatus = 'CANCELLED';
          fallbackDescription = 'Order has been cancelled';
          break;
      }

      trackingData = {
        trackingNumber: order.tracking.trackingNumber,
        status: fallbackStatus,
        statusDescription: fallbackDescription,
        events: [
          {
            timestamp: order.createdAt,
            status: 'CREATED',
            description: 'Order created',
            location: null
          },
          ...(order.tracking.shippedAt ? [{
            timestamp: order.tracking.shippedAt,
            status: 'SHIPPED',
            description: 'Package shipped',
            location: null
          }] : [])
        ],
        lastUpdate: order.tracking.lastUpdated || order.updatedAt,
        courierService: order.tracking.courierService || 'System Tracking',
        estimatedDelivery: order.tracking.estimatedDelivery,
        notice: 'Real-time tracking temporarily unavailable. Information based on order status.'
      };
    }

    res.status(200).json({
      status: "success",
      order: {
        orderNumber: order.orderNumber,
        status: order.status,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
        items: order.items,
        shippingAddress: order.shippingAddress,
        totalAmount: order.totalAmount
      },
      tracking: {
        available: true,
        trackingNumber: order.tracking.trackingNumber,
        carrier: order.tracking.carrier,
        trackingUrl: order.tracking.trackingUrl,
        shippedAt: order.tracking.shippedAt,
        estimatedDelivery: order.tracking.estimatedDelivery,
        data: trackingData
      }
    });
  } catch (error) {
    console.error('Error tracking order by ID:', error);
    res.status(500).json({
      status: "error",
      message: error.message
    });
  }
};

/**
 * Track an order by tracking number OR order number (public endpoint)
 */
exports.trackByTrackingNumber = async (req, res) => {
  try {
    const { trackingNumber: rawTrackingNumber } = req.params;

    if (!rawTrackingNumber) {
      return res.status(400).json({
        status: "fail",
        message: "Tracking number or order number is required"
      });
    }

    // Decode URL encoded tracking number (handles ORD%2F2025%2F001 -> ORD/2025/001)
    const trackingNumber = decodeURIComponent(rawTrackingNumber);

    let order = null;
    let searchType = 'tracking_number';

    // First, try to find by courier tracking number
    order = await Order.findOne({ 'tracking.trackingNumber': trackingNumber })
      .populate("items.productId", "name image")
      .populate("shippingAddress");

    // If not found, try to find by order number (ORD/2025/001 format)
    if (!order) {
      order = await Order.findOne({ orderNumber: trackingNumber })
        .populate("items.productId", "name image")
        .populate("shippingAddress");
      searchType = 'order_number';
    }

    // If not found, try partial match (user might enter just the number part)
    if (!order && /^\d{3}$/.test(trackingNumber)) {
      // User entered something like "001", try to find current year's order
      const currentYear = new Date().getMonth() <= 2 ? new Date().getFullYear() - 1 : new Date().getFullYear();
      const fullOrderNumber = `ORD/${currentYear}/${trackingNumber.padStart(3, '0')}`;

      order = await Order.findOne({ orderNumber: fullOrderNumber })
        .populate("items.productId", "name image")
        .populate("shippingAddress");
      searchType = 'order_number_partial';
    }

    if (!order) {
      // Even if order not found in our system, try to track with courier services
      try {
        // Try DHL first (international)
        let trackingData = await courierManager.trackShipment(trackingNumber, 'dhl');

        // If DHL fails, try Blue Dart (domestic)
        if (trackingData.status === 'ERROR' || trackingData.status === 'NOT_FOUND') {
          trackingData = await courierManager.trackShipment(trackingNumber, 'bluedart');
        }

        return res.status(200).json({
          status: "success",
          tracking: {
            available: true,
            trackingNumber,
            carrier: trackingData.courierService || 'Unknown',
            data: trackingData,
            orderInSystem: false,
            searchType: 'external_tracking',
            message: "Tracking information from carrier (order not found in our system)"
          }
        });
      } catch (courierError) {
        return res.status(404).json({
          status: "fail",
          message: `Order or tracking number "${trackingNumber}" not found. Please check the number and try again.`
        });
      }
    }

    // Get tracking information from appropriate courier service
    let trackingData = null;
    try {
      const courierService = order.tracking.courierService || 'dhl';
      const destination = order.shippingAddress?.country || 'IN';

      trackingData = await courierManager.trackShipment(
        trackingNumber,
        courierService,
        destination
      );

      // Update order tracking data with latest info
      order.tracking.lastUpdated = new Date();
      if (trackingData.estimatedDelivery) {
        order.tracking.estimatedDelivery = trackingData.estimatedDelivery;
      }
      await order.save();
    } catch (trackingError) {
      console.error('Courier tracking error:', trackingError.message);
      trackingData = {
        trackingNumber,
        status: 'UNKNOWN',
        statusDescription: 'Tracking information temporarily unavailable',
        events: [],
        lastUpdate: order.tracking.lastUpdated || order.updatedAt,
        courierService: order.tracking.courierService || 'Unknown'
      };
    }

    res.status(200).json({
      status: "success",
      order: {
        orderNumber: order.orderNumber,
        status: order.status,
        createdAt: order.createdAt,
        items: order.items.map(item => ({
          productId: item.productId,
          quantity: item.quantity
        })),
        totalAmount: order.totalAmount
      },
      tracking: {
        available: true,
        trackingNumber: order.tracking.trackingNumber,
        carrier: order.tracking.carrier,
        trackingUrl: order.tracking.trackingUrl,
        shippedAt: order.tracking.shippedAt,
        estimatedDelivery: order.tracking.estimatedDelivery,
        data: trackingData,
        orderInSystem: true,
        searchType: searchType,
        message: searchType === 'order_number' ?
          `Order found using order number: ${order.orderNumber}` :
          searchType === 'order_number_partial' ?
          `Order found using partial order number: ${order.orderNumber}` :
          `Order found using courier tracking number: ${order.tracking.trackingNumber}`
      }
    });
  } catch (error) {
    console.error('Error tracking by tracking number:', error);
    res.status(500).json({
      status: "error",
      message: error.message
    });
  }
};

/**
 * Get available courier services for a destination
 */
exports.getAvailableCouriers = async (req, res) => {
  try {
    const { destination = 'IN' } = req.query;

    const services = courierManager.getAvailableServices(destination);

    res.status(200).json({
      status: "success",
      destination,
      services
    });
  } catch (error) {
    console.error('Error getting available couriers:', error);
    res.status(500).json({
      status: "error",
      message: error.message
    });
  }
};

/**
 * Check courier serviceability for a pincode
 */
exports.checkCourierServiceability = async (req, res) => {
  try {
    const { pincode, country = 'IN', courier } = req.query;

    if (!pincode) {
      return res.status(400).json({
        status: "fail",
        message: "Pincode is required"
      });
    }

    const result = await courierManager.checkServiceability(pincode, country, courier);

    res.status(200).json({
      status: "success",
      data: result
    });
  } catch (error) {
    console.error('Error checking serviceability:', error);
    res.status(500).json({
      status: "error",
      message: error.message
    });
  }
};

/**
 * Calculate shipping rates
 */
exports.calculateShippingRates = async (req, res) => {
  try {
    const {
      originPincode,
      destinationPincode,
      destinationCountry = 'IN',
      weight,
      pieces = 1,
      serviceType = 'A',
      courier
    } = req.body;

    if (!originPincode || !destinationPincode || !weight) {
      return res.status(400).json({
        status: "fail",
        message: "Origin pincode, destination pincode, and weight are required"
      });
    }

    const rateData = {
      originPincode,
      destinationPincode,
      destinationCountry,
      weight,
      pieces,
      serviceType
    };

    const result = await courierManager.calculateRates(rateData, courier);

    res.status(200).json({
      status: "success",
      data: result
    });
  } catch (error) {
    console.error('Error calculating rates:', error);
    res.status(500).json({
      status: "error",
      message: error.message
    });
  }
};

/**
 * Get courier service recommendations
 */
exports.getCourierRecommendations = async (req, res) => {
  try {
    const { destination = 'IN', weight, urgency = 'standard', value } = req.query;

    const shipmentDetails = {
      destination,
      weight: weight ? parseFloat(weight) : null,
      urgency,
      value: value ? parseFloat(value) : null
    };

    const recommendations = courierManager.getRecommendations(shipmentDetails);

    res.status(200).json({
      status: "success",
      data: recommendations
    });
  } catch (error) {
    console.error('Error getting recommendations:', error);
    res.status(500).json({
      status: "error",
      message: error.message
    });
  }
};

/**
 * Check health of courier services
 */
exports.checkCourierHealth = async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        status: "fail",
        message: "Access denied. Admin only."
      });
    }

    const healthStatus = await courierManager.checkServicesHealth();

    res.status(200).json({
      status: "success",
      data: healthStatus
    });
  } catch (error) {
    console.error('Error checking courier health:', error);
    res.status(500).json({
      status: "error",
      message: error.message
    });
  }
};

/**
 * Get smart courier selection for specific shipment
 */
exports.getSmartCourierSelection = async (req, res) => {
  try {
    const {
      destination = 'IN',
      weight,
      value,
      urgency = 'standard',
      userPreference
    } = req.query;

    const smartSelection = CourierConfig.selectCourier({
      destination,
      weight: weight ? parseFloat(weight) : 1,
      value: value ? parseFloat(value) : 1000,
      priority: urgency,
      userPreference
    });

    res.status(200).json({
      status: "success",
      data: {
        selectedCourier: smartSelection.courier,
        reason: smartSelection.reason,
        factors: smartSelection.factors,
        isFallback: smartSelection.isFallback,
        alternatives: CourierConfig.getAvailableCouriers(destination)
      }
    });
  } catch (error) {
    console.error('Error getting smart courier selection:', error);
    res.status(500).json({
      status: "error",
      message: error.message
    });
  }
};

/**
 * Get courier configuration (Admin only)
 */
exports.getCourierConfig = async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        status: "fail",
        message: "Access denied. Admin only."
      });
    }

    const config = CourierConfig.getCurrentConfig();

    res.status(200).json({
      status: "success",
      data: config
    });
  } catch (error) {
    console.error('Error getting courier config:', error);
    res.status(500).json({
      status: "error",
      message: error.message
    });
  }
};

/**
 * Update courier configuration (Admin only)
 */
exports.updateCourierConfig = async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        status: "fail",
        message: "Access denied. Admin only."
      });
    }

    const newRules = req.body;
    CourierConfig.updateRules(newRules);

    res.status(200).json({
      status: "success",
      message: "Courier configuration updated successfully",
      data: CourierConfig.getCurrentConfig()
    });
  } catch (error) {
    console.error('Error updating courier config:', error);
    res.status(500).json({
      status: "error",
      message: error.message
    });
  }
};

/**
 * Manually register BlueDart pickup for an order (Admin only)
 */
exports.registerBlueDartPickup = async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        status: "fail",
        message: "Access denied. Admin only."
      });
    }

    const { orderId } = req.params;

    const order = await Order.findById(orderId)
      .populate('user')
      .populate('shippingAddress')
      .populate('billingAddress');

    if (!order) {
      return res.status(404).json({
        status: "fail",
        message: "Order not found"
      });
    }

    const pickupResult = await blueDartOrderService.handleOrderConfirmation(order, 'Processing');

    res.status(200).json({
      status: pickupResult.success ? "success" : "fail",
      message: pickupResult.message,
      data: pickupResult
    });

  } catch (error) {
    console.error('Error registering BlueDart pickup:', error);
    res.status(500).json({
      status: "error",
      message: error.message
    });
  }
};

/**
 * Cancel BlueDart pickup for an order (Admin only)
 */
exports.cancelBlueDartPickup = async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        status: "fail",
        message: "Access denied. Admin only."
      });
    }

    const { orderId } = req.params;
    const { reason = 'Manual cancellation by admin' } = req.body;

    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({
        status: "fail",
        message: "Order not found"
      });
    }

    const cancelResult = await blueDartOrderService.cancelPickup(order, reason);

    res.status(200).json({
      status: cancelResult.success ? "success" : "fail",
      message: cancelResult.message,
      data: cancelResult
    });

  } catch (error) {
    console.error('Error cancelling BlueDart pickup:', error);
    res.status(500).json({
      status: "error",
      message: error.message
    });
  }
};

/**
 * Get BlueDart pickup status for an order
 */
exports.getBlueDartPickupStatus = async (req, res) => {
  try {
    const { orderId } = req.params;

    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({
        status: "fail",
        message: "Order not found"
      });
    }

    // Check if user is authorized to view this order
    if (req.user.role !== 'admin' && order.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        status: "fail",
        message: "You are not authorized to view this order"
      });
    }

    const pickupStatus = blueDartOrderService.getPickupStatus(order);

    res.status(200).json({
      status: "success",
      data: pickupStatus
    });

  } catch (error) {
    console.error('Error getting BlueDart pickup status:', error);
    res.status(500).json({
      status: "error",
      message: error.message
    });
  }
};

/**
 * Generate BlueDart waybill for an order (Admin only)
 */
exports.generateBlueDartWaybill = async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        status: "fail",
        message: "Access denied. Admin only."
      });
    }

    const { orderId } = req.params;

    const order = await Order.findById(orderId)
      .populate('user')
      .populate('shippingAddress')
      .populate('billingAddress');

    if (!order) {
      return res.status(404).json({
        status: "fail",
        message: "Order not found"
      });
    }

    const waybillResult = await blueDartOrderService.generateWaybillForOrder(order);

    res.status(200).json({
      status: waybillResult.success ? "success" : "fail",
      message: waybillResult.message,
      data: waybillResult
    });

  } catch (error) {
    console.error('Error generating BlueDart waybill:', error);
    res.status(500).json({
      status: "error",
      message: error.message
    });
  }
};

/**
 * Create automatic shipment for an order
 * @param {Object} order - Populated order object
 * @returns {Promise<void>}
 */
async function createAutomaticShipment(order) {
  try {
    if (!order.shippingAddress) {
      throw new Error('Shipping address not available');
    }

    // Get default sender details (could be from environment or config)
    const senderDetails = {
      name: process.env.COMPANY_NAME || 'Tangerine Luxury',
      address1: process.env.COMPANY_ADDRESS1 || 'Business Address Line 1',
      address2: process.env.COMPANY_ADDRESS2 || '',
      address3: process.env.COMPANY_ADDRESS3 || '',
      pincode: process.env.COMPANY_PINCODE || '400001',
      phone: process.env.COMPANY_PHONE || '1234567890',
      mobile: process.env.COMPANY_MOBILE || process.env.COMPANY_PHONE || '1234567890'
    };

    // Format receiver details
    const receiverDetails = {
      name: order.user.name,
      address1: order.shippingAddress.addressLine1 || '',
      address2: order.shippingAddress.addressLine2 || '',
      address3: '',
      pincode: order.shippingAddress.postalCode || '',
      phone: order.user.phone || '0000000000',
      mobile: order.user.phone || '0000000000',
      country: order.shippingAddress.country || 'IN'
    };

    // Calculate total weight (estimate 0.5kg per item if not specified)
    const estimatedWeight = order.items.reduce((total, item) => {
      return total + (item.quantity * 0.5); // 0.5kg per item
    }, 0);

    // Package details
    const packageDetails = {
      weight: Math.max(0.1, estimatedWeight), // Minimum 0.1kg
      pieces: order.items.length,
      description: `Order ${order.orderNumber} - ${order.items.length} items`,
      productType: 'A', // Standard service
      productCode: 'BD',
      value: order.totalAmount
    };

    const shipmentData = {
      senderDetails,
      receiverDetails,
      packageDetails,
      serviceType: 'A', // Standard service
      orderNumber: order.orderNumber,
      orderId: order._id
    };

    // Determine courier service based on destination
    const destination = receiverDetails.country;
    const courierService = destination === 'IN' ? 'bluedart' : 'dhl';

    //console.log(`Creating automatic shipment for order ${order.orderNumber} using ${courierService}`);

    // Create shipment with courier
    const shipmentResult = await courierManager.createShipment(shipmentData, courierService);

    if (shipmentResult.success && shipmentResult.trackingNumber) {
      // Update order with tracking information
      const trackingUrl = courierService === 'dhl'
        ? `https://www.dhl.com/en/express/tracking.html?AWB=${shipmentResult.trackingNumber}&brand=DHL`
        : `https://www.bluedart.com/web/guest/trackdartresult?trackFor=0&trackNo=${shipmentResult.trackingNumber}`;

      await Order.findByIdAndUpdate(order._id, {
        tracking: {
          trackingNumber: shipmentResult.trackingNumber,
          carrier: courierService === 'dhl' ? 'DHL' : 'BlueDart',
          trackingUrl,
          shippedAt: new Date(),
          lastUpdated: new Date(),
          courierService: courierService,
          estimatedDelivery: shipmentResult.estimatedDelivery
        },
        status: 'Processing' // Update status to Processing since shipment is created
      });

      //console.log(`✅ Order ${order.orderNumber} updated with tracking number: ${shipmentResult.trackingNumber}`);
    } else {
      throw new Error(shipmentResult.error || 'Failed to get tracking number from courier');
    }

  } catch (error) {
    console.error(`Error creating automatic shipment for order ${order.orderNumber}:`, error.message);
    throw error;
  }
}

/**
 * Bulk create shipments for pending orders (Admin only)
 */
exports.bulkCreateShipments = async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        status: "fail",
        message: "Access denied. Admin only."
      });
    }

    const { orderIds, forceCreate = false } = req.body;

    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      return res.status(400).json({
        status: "fail",
        message: "Order IDs array is required"
      });
    }

    const results = {
      success: [],
      failed: [],
      skipped: []
    };

    for (const orderId of orderIds) {
      try {
        const order = await Order.findById(orderId)
          .populate('user')
          .populate('shippingAddress');

        if (!order) {
          results.failed.push({ orderId, error: 'Order not found' });
          continue;
        }

        // Skip if tracking already exists (unless force create)
        if (order.tracking && order.tracking.trackingNumber && !forceCreate) {
          results.skipped.push({
            orderId,
            orderNumber: order.orderNumber,
            reason: 'Tracking already exists'
          });
          continue;
        }

        // Create shipment
        await createAutomaticShipment(order);
        results.success.push({
          orderId,
          orderNumber: order.orderNumber,
          message: 'Shipment created successfully'
        });

      } catch (error) {
        console.error(`Failed to create shipment for order ${orderId}:`, error.message);
        results.failed.push({ orderId, error: error.message });
      }
    }

    res.status(200).json({
      status: "success",
      message: `Bulk shipment creation completed. Success: ${results.success.length}, Failed: ${results.failed.length}, Skipped: ${results.skipped.length}`,
      results
    });

  } catch (error) {
    console.error('Error in bulk shipment creation:', error);
    res.status(500).json({
      status: "error",
      message: error.message
    });
  }
};