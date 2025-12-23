const blueDartService = require('./blueDartService');
const Order = require('../models/order.model');

class BlueDartOrderService {
  constructor() {
    // Secure pickup location (not shared with client)
    this.pickupLocation = {
      contactPersonName: process.env.BLUEDART_PICKUP_CONTACT || "Tangerine Warehouse",
      customerAddress1: process.env.BLUEDART_PICKUP_ADDRESS1 || "House No. 1473",
      customerAddress2: process.env.BLUEDART_PICKUP_ADDRESS2 || "Sector 14",
      customerAddress3: process.env.BLUEDART_PICKUP_ADDRESS3 || "Faridabad",
      customerCode: process.env.BLUEDART_CUSTOMER_CODE || "099960",
      customerName: process.env.BLUEDART_PICKUP_COMPANY || "Tangerine Luxury",
      customerPincode: process.env.BLUEDART_PICKUP_PINCODE || "121007",
      customerTelephoneNumber: process.env.BLUEDART_PICKUP_PHONE || "9999999999",
      mobileTelNo: process.env.BLUEDART_PICKUP_MOBILE || "9999999999",
      areaCode: process.env.BLUEDART_PICKUP_AREA || "DEL", // Delhi area code for Faridabad
      originArea: process.env.BLUEDART_PICKUP_AREA || "DEL"
    };
  }

  /**
   * Register pickup automatically when admin confirms order
   * @param {Object} order - Order object with populated shipping address and user
   * @param {string} adminAction - Action taken by admin ('confirmed', 'processing', etc.)
   * @returns {Object} Pickup registration result
   */
  async handleOrderConfirmation(order, adminAction = 'confirmed') {
    try {
      console.log(`🚚 BlueDart: Processing order ${order.orderNumber} for pickup registration`);

      // Only register pickup for confirmed/processing orders
      if (!['confirmed', 'processing', 'Processing'].includes(adminAction)) {
        return {
          success: false,
          message: `Pickup not registered - order status ${adminAction} does not trigger pickup`,
          skipReason: 'status_not_eligible'
        };
      }

      // Check if pickup already registered for this order
      if (order.blueDartPickup && order.blueDartPickup.tokenNumber) {
        return {
          success: false,
          message: 'Pickup already registered for this order',
          skipReason: 'already_registered',
          existingPickup: order.blueDartPickup
        };
      }

      // Get authentication token
      const authToken = await blueDartService.getBlueDartAuthToken();
      if (!authToken) {
        throw new Error('Failed to get BlueDart authentication token');
      }

      // Build pickup data
      const pickupData = await this._buildPickupData(order);

      // Register pickup with BlueDart
      const pickupResult = await blueDartService.registerPickup(authToken, pickupData);

      if (pickupResult.success) {
        // Update order with pickup information
        await this._updateOrderWithPickupInfo(order._id, pickupResult, pickupData);

        console.log(`✅ BlueDart pickup registered for order ${order.orderNumber}, Token: ${pickupResult.tokenNumber}`);

        return {
          success: true,
          message: 'Pickup registered successfully',
          tokenNumber: pickupResult.tokenNumber,
          pickupDate: pickupData.ShipmentPickupDate,
          pickupTime: pickupData.ShipmentPickupTime
        };
      } else {
        // Create error with pickup result details
        const errorMessage = pickupResult.error || 'Unknown pickup registration error';
        const error = new Error(errorMessage);
        error.pickupResult = pickupResult;
        throw error;
      }

    } catch (error) {
      console.error(`❌ BlueDart pickup registration failed for order ${order.orderNumber}:`, error.message);

      // Log detailed error information for debugging
      if (error.response) {
        console.error('BlueDart API Response:', error.response.status, error.response.data);
      }

      // Get pickup result from error if available
      const pickupResult = error.pickupResult;

      // Create detailed error message for logging
      let detailedError = error.message;
      if (pickupResult && pickupResult.details) {
        detailedError += ` | API Details: ${JSON.stringify(pickupResult.details)}`;
      }
      if (pickupResult && pickupResult.statusCode) {
        detailedError += ` | Status Code: ${pickupResult.statusCode}`;
      }

      // Log error but don't fail the order confirmation
      await this._logPickupError(order._id, detailedError);

      return {
        success: false,
        error: error.message,
        details: pickupResult?.details || null,
        statusCode: pickupResult?.statusCode || null,
        message: 'Pickup registration failed - order confirmed but pickup needs manual handling'
      };
    }
  }

  /**
   * Build pickup data from order information
   * @param {Object} order - Order with populated shipping address and user
   * @returns {Object} Formatted pickup data for BlueDart API
   */
  async _buildPickupData(order) {
    // Calculate total weight (estimate based on items)
    const estimatedWeight = this._calculateEstimatedWeight(order.items);
    const numberOfPieces = order.items.reduce((total, item) => total + item.quantity, 0);

    // Set pickup date to tomorrow by default
    const pickupDate = new Date();
    pickupDate.setDate(pickupDate.getDate() + 1);

    return {
      // AWB number - let BlueDart generate (per documentation, use empty string in array)
      AWBNo: [""],

      // Area and location
      AreaCode: this.pickupLocation.areaCode,

      // CISDDN - required field per documentation
      CISDDN: false,

      // Contact information
      ContactPersonName: this.pickupLocation.contactPersonName,
      CustomerAddress1: this.pickupLocation.customerAddress1,
      CustomerAddress2: this.pickupLocation.customerAddress2,
      CustomerAddress3: this.pickupLocation.customerAddress3,
      CustomerCode: this.pickupLocation.customerCode,
      CustomerName: this.pickupLocation.customerName,
      CustomerPincode: this.pickupLocation.customerPincode,
      CustomerTelephoneNumber: this.pickupLocation.customerTelephoneNumber,
      MobileTelNo: this.pickupLocation.mobileTelNo,

      // Shipment details
      NumberofPieces: numberOfPieces,
      WeightofShipment: estimatedWeight,
      VolumeWeight: estimatedWeight, // Using same as weight for now

      // Service details
      ProductCode: "A", // Standard service
      SubProducts: ["E-Tailing"],
      DoxNDox: "1", // Non-document

      // Pickup scheduling
      ShipmentPickupDate: blueDartService.formatPickupDate(pickupDate),
      ShipmentPickupTime: "16:00", // 4 PM pickup
      OfficeCloseTime: "18:00",

      // Additional details
      ReferenceNo: order.orderNumber,
      Remarks: `Order ${order.orderNumber} - ${numberOfPieces} items for ${order.user.name}`,

      // Optional fields
      EmailID: process.env.BLUEDART_PICKUP_EMAIL || "",
      IsForcePickup: false,
      IsReversePickup: false,
      PackType: "",
      RouteCode: "",
      isToPayShipper: false
    };
  }

  /**
   * Calculate estimated weight based on order items
   * @param {Array} items - Order items array
   * @returns {number} Estimated weight in kg
   */
  _calculateEstimatedWeight(items) {
    // Estimate 0.5kg per item as default
    const totalItems = items.reduce((total, item) => total + item.quantity, 0);
    const estimatedWeight = totalItems * 0.5; // 0.5kg per item

    // Minimum weight 0.5kg, maximum 50kg for single pickup
    return Math.max(0.5, Math.min(50, estimatedWeight));
  }

  /**
   * Update order with pickup information
   * @param {string} orderId - Order ID
   * @param {Object} pickupResult - BlueDart pickup result
   * @param {Object} pickupData - Original pickup data sent
   */
  async _updateOrderWithPickupInfo(orderId, pickupResult, pickupData) {
    try {
      const pickupInfo = {
        tokenNumber: pickupResult.tokenNumber,
        status: pickupResult.status,
        registeredAt: new Date(),
        pickupDate: pickupData.ShipmentPickupDate,
        pickupTime: pickupData.ShipmentPickupTime,
        referenceNumber: pickupData.ReferenceNo,
        areaCode: pickupData.AreaCode,
        numberOfPieces: pickupData.NumberofPieces,
        weight: pickupData.WeightofShipment,
        productCode: pickupData.ProductCode,
        remarks: pickupData.Remarks
      };

      await Order.findByIdAndUpdate(orderId, {
        blueDartPickup: pickupInfo
      });

      console.log(`📦 Order ${pickupData.ReferenceNo} updated with pickup info`);
    } catch (error) {
      console.error('Error updating order with pickup info:', error);
      throw error;
    }
  }

  /**
   * Log pickup registration errors
   * @param {string} orderId - Order ID
   * @param {string} errorMessage - Error message
   */
  async _logPickupError(orderId, errorMessage) {
    try {
      // Ensure error message is a simple string and not too long
      let cleanError = String(errorMessage);
      if (cleanError.length > 500) {
        cleanError = cleanError.substring(0, 500) + '...';
      }

      const errorEntry = {
        type: 'pickup_registration',
        error: cleanError,
        timestamp: new Date()
      };

      console.log('Logging error entry:', errorEntry);

      // Use a simpler approach to avoid casting issues
      const order = await Order.findById(orderId);
      if (order) {
        if (!order.blueDartErrors) {
          order.blueDartErrors = [];
        }
        order.blueDartErrors.push(errorEntry);
        await order.save();
        console.log('Error logged successfully');
      } else {
        console.error('Order not found for error logging:', orderId);
      }
    } catch (logError) {
      console.error('Error logging pickup error:', logError.message);
      // Continue without failing the main operation
    }
  }

  /**
   * Cancel pickup for an order
   * @param {Object} order - Order object
   * @param {string} reason - Cancellation reason
   * @returns {Object} Cancellation result
   */
  async cancelPickup(order, reason = 'Order cancelled') {
    try {
      if (!order.blueDartPickup || !order.blueDartPickup.tokenNumber) {
        return {
          success: false,
          message: 'No pickup found to cancel for this order'
        };
      }

      // Get authentication token
      const authToken = await blueDartService.getBlueDartAuthToken();
      if (!authToken) {
        throw new Error('Failed to get BlueDart authentication token');
      }

      // Cancel pickup
      const cancellationData = {
        tokenNumber: order.blueDartPickup.tokenNumber,
        pickupRegistrationDate: order.blueDartPickup.pickupDate,
        remarks: reason
      };

      const cancelResult = await blueDartService.cancelPickup(authToken, cancellationData);

      if (cancelResult.success) {
        // Update order with cancellation info
        await Order.findByIdAndUpdate(order._id, {
          'blueDartPickup.cancelled': true,
          'blueDartPickup.cancelledAt': new Date(),
          'blueDartPickup.cancellationReason': reason,
          'blueDartPickup.cancellationStatus': cancelResult.status
        });

        console.log(`✅ BlueDart pickup cancelled for order ${order.orderNumber}`);

        return {
          success: true,
          message: 'Pickup cancelled successfully',
          status: cancelResult.status
        };
      } else {
        throw new Error(cancelResult.error || 'Unknown cancellation error');
      }

    } catch (error) {
      console.error(`❌ BlueDart pickup cancellation failed for order ${order.orderNumber}:`, error.message);

      await this._logPickupError(order._id, `Cancellation failed: ${error.message}`);

      return {
        success: false,
        error: error.message,
        message: 'Pickup cancellation failed'
      };
    }
  }

  /**
   * Get pickup status for an order
   * @param {Object} order - Order object
   * @returns {Object} Pickup status information
   */
  getPickupStatus(order) {
    if (!order.blueDartPickup) {
      return {
        registered: false,
        message: 'No pickup registered for this order'
      };
    }

    const pickup = order.blueDartPickup;

    return {
      registered: true,
      tokenNumber: pickup.tokenNumber,
      status: pickup.status,
      registeredAt: pickup.registeredAt,
      pickupDate: pickup.pickupDate,
      pickupTime: pickup.pickupTime,
      cancelled: pickup.cancelled || false,
      cancellationReason: pickup.cancellationReason,
      numberOfPieces: pickup.numberOfPieces,
      weight: pickup.weight,
      referenceNumber: pickup.referenceNumber
    };
  }

  /**
   * Generate waybill for confirmed order
   * @param {Object} order - Order with populated addresses and user
   * @returns {Object} Waybill generation result
   */
  async generateWaybillForOrder(order) {
    try {
      console.log(`📋 BlueDart: Generating waybill for order ${order.orderNumber}`);

      // Get authentication token
      const authToken = await blueDartService.getBlueDartAuthToken();
      if (!authToken) {
        throw new Error('Failed to get BlueDart authentication token');
      }

      // Build waybill data
      const waybillData = this._buildWaybillData(order);

      // Generate waybill
      const waybillResult = await blueDartService.generateWaybill(authToken, waybillData);

      if (waybillResult.success) {
        // Update order with waybill information
        await Order.findByIdAndUpdate(order._id, {
          blueDartWaybill: {
            awbNumber: waybillResult.awbNumber,
            status: waybillResult.status,
            generatedAt: new Date(),
            waybillData: waybillResult.data
          }
        });

        console.log(`✅ BlueDart waybill generated for order ${order.orderNumber}, AWB: ${waybillResult.awbNumber}`);

        return {
          success: true,
          awbNumber: waybillResult.awbNumber,
          status: waybillResult.status,
          message: 'Waybill generated successfully'
        };
      } else {
        throw new Error(waybillResult.error || 'Unknown waybill generation error');
      }

    } catch (error) {
      console.error(`❌ BlueDart waybill generation failed for order ${order.orderNumber}:`, error.message);

      await this._logPickupError(order._id, `Waybill generation failed: ${error.message}`);

      return {
        success: false,
        error: error.message,
        message: 'Waybill generation failed'
      };
    }
  }

  /**
   * Build waybill data from order
   * @param {Object} order - Order with populated data
   * @returns {Object} Waybill data for BlueDart API
   */
  _buildWaybillData(order) {
    const estimatedWeight = this._calculateEstimatedWeight(order.items);
    const pickupDate = new Date();
    pickupDate.setDate(pickupDate.getDate() + 1);

    return {
      consignee: {
        address1: order.shippingAddress.addressLine1 || '',
        address2: order.shippingAddress.addressLine2 || '',
        address3: '',
        name: order.user.name,
        mobile: order.user.phone || '9999999999',
        pincode: order.shippingAddress.postalCode,
        email: order.user.email || ''
      },
      returnAddress: {
        address1: this.pickupLocation.customerAddress1,
        address2: this.pickupLocation.customerAddress2,
        address3: this.pickupLocation.customerAddress3,
        contact: this.pickupLocation.contactPersonName,
        mobile: this.pickupLocation.mobileTelNo,
        pincode: this.pickupLocation.customerPincode
      },
      services: {
        actualWeight: estimatedWeight,
        creditReferenceNo: order.orderNumber,
        pickupDate: blueDartService.formatPickupDate(pickupDate),
        pieceCount: order.items.reduce((total, item) => total + item.quantity, 0),
        productCode: "A",
        pdfOutputNotRequired: false
      },
      shipper: {
        address1: this.pickupLocation.customerAddress1,
        address2: this.pickupLocation.customerAddress2,
        customerCode: this.pickupLocation.customerCode,
        mobile: this.pickupLocation.mobileTelNo,
        name: this.pickupLocation.customerName,
        pincode: this.pickupLocation.customerPincode,
        originArea: this.pickupLocation.originArea,
        sender: this.pickupLocation.customerName
      }
    };
  }
}

module.exports = new BlueDartOrderService();