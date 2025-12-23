const Shipping = require("../models/shipping.model");

// Get current shipping configuration
exports.getShippingConfig = async (req, res) => {
  try {
    let shippingConfig = await Shipping.findOne({ isActive: true });
    
    // Create default shipping config if none exists
    if (!shippingConfig) {
      shippingConfig = await Shipping.create({
        name: "Standard Shipping",
        amount: 500,
        isActive: true,
        description: "Standard shipping charge applied to all orders",
        freeShippingThreshold: 2999,
        estimatedDays: "5-7 business days"
      });
    }

    res.status(200).json({
      status: "success",
      data: { shipping: shippingConfig }
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: error.message
    });
  }
};

// Update shipping configuration (Admin only)
exports.updateShippingConfig = async (req, res) => {
  try {
    const { amount, freeShippingThreshold, estimatedDays, description } = req.body;

    // Find and update the active shipping config
    let shippingConfig = await Shipping.findOneAndUpdate(
      { isActive: true },
      {
        amount: amount || 500,
        freeShippingThreshold: freeShippingThreshold || 2999,
        estimatedDays: estimatedDays || "5-7 business days",
        description: description || "Standard shipping charge applied to all orders"
      },
      { 
        new: true,
        upsert: true // Create if doesn't exist
      }
    );

    res.status(200).json({
      status: "success",
      data: { shipping: shippingConfig },
      message: "Shipping configuration updated successfully"
    });
  } catch (error) {
    res.status(400).json({
      status: "fail",
      message: error.message
    });
  }
};

// Calculate shipping for an order
exports.calculateShipping = async (req, res) => {
  try {
    const { cartTotal, itemCount = 1 } = req.body;

    const shippingConfig = await Shipping.findOne({ isActive: true });
    
    if (!shippingConfig) {
      return res.status(404).json({
        status: "fail",
        message: "Shipping configuration not found"
      });
    }

    // Check if order qualifies for free shipping
    const isFreeShipping = cartTotal >= shippingConfig.freeShippingThreshold;
    const shippingAmount = isFreeShipping ? 0 : shippingConfig.amount;

    res.status(200).json({
      status: "success",
      data: {
        amount: shippingAmount,
        isFree: isFreeShipping,
        freeShippingThreshold: shippingConfig.freeShippingThreshold,
        estimatedDays: shippingConfig.estimatedDays,
        description: shippingConfig.description
      }
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: error.message
    });
  }
};