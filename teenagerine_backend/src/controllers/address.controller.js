const Address = require("../models/address.model");
const User = require("../models/user.model");

exports.createAddress = async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const address = new Address({
      ...req.body,
      user: userId,
    });

    const savedAddress = await address.save();
    res.status(201).json(savedAddress);
  } catch (error) {
    console.log(error);
    res.status(500).json({
      error: error.message,
    });
  }
};

exports.getAllAddresses = async (req, res) => {
  try {
    const addresses = await Address.find().populate("user", "name email");
    res.status(200).json(addresses);
  } catch (error) {
    res.status(500).json({
      error: error.message,
    });
  }
};

exports.getAddressById = async (req, res) => {
  try {
    const address = await Address.findById(req.params.id).populate(
      "user",
      "name email"
    );
    if (!address) {
      return res.status(404).json({ message: "Address not found" });
    }
    res.status(200).json(address);
  } catch (error) {
    res.status(500).json({
      error: error.message,
    });
  }
};
exports.getAddressByUserId = async (req, res) => {
  try {
    const userId = req.user._id;
    const addresses = await Address.find({ user: userId }).populate(
      "user",
      "name email"
    );
    res.status(200).json(addresses);
  } catch (error) {
    res.status(500).json({
      error: error.message,
    });
  }
};
exports.updateAddress = async (req, res) => {
  try {
    const userId = req.user._id;
    const addressId = req.params.id;
    
    // Find the address to verify ownership
    const existingAddress = await Address.findById(addressId);
    if (!existingAddress) {
      return res.status(404).json({ message: "Address not found" });
    }
    
    // Verify that the address belongs to the user
    if (existingAddress.user.toString() !== userId.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: "You are not authorized to update this address" });
    }
    
    // If setting as default, unset any other default addresses for this user
    if (req.body.isDefault) {
      await Address.updateMany(
        { user: userId, isDefault: true },
        { $set: { isDefault: false } }
      );
    }
    
    // Update the address
    const address = await Address.findByIdAndUpdate(addressId, req.body, {
      new: true,
    }).populate("user", "name email");
    
    res.status(200).json(address);
  } catch (error) {
    console.error('Error updating address:', error);
    res.status(400).json({
      error: error.message,
    });
  }
};

exports.deleteAddress = async (req, res) => {
  try {
    const userId = req.user._id;
    const addressId = req.params.id;
    
    // Find the address to verify ownership
    const existingAddress = await Address.findById(addressId);
    if (!existingAddress) {
      return res.status(404).json({ message: "Address not found" });
    }
    
    // Verify that the address belongs to the user
    if (existingAddress.user.toString() !== userId.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: "You are not authorized to delete this address" });
    }
    
    // Delete the address
    await Address.findByIdAndDelete(addressId);
    
    // If the deleted address was the default, set another address as default if available
    if (existingAddress.isDefault) {
      const anotherAddress = await Address.findOne({ user: userId });
      if (anotherAddress) {
        anotherAddress.isDefault = true;
        await anotherAddress.save();
      }
    }
    
    res.status(200).json({ message: "Address deleted successfully" });
  } catch (error) {
    console.error('Error deleting address:', error);
    res.status(500).json({
      error: error.message,
    });
  }
};
