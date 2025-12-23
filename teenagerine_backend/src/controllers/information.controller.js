const Information = require("../models/information.model");

// Get all active information for public display (max 2)
exports.getActiveInformation = async (req, res) => {
  try {
    const information = await Information.find({ isActive: true })
      .sort({ order: 1, createdAt: -1 })
      .select('title link');

    res.status(200).json({
      status: "success",
      data: information
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: error.message
    });
  }
};

// Admin: Get all information
exports.getAllInformation = async (req, res) => {
  try {
    const information = await Information.find()
      .sort({ order: 1, createdAt: -1 });

    res.status(200).json({
      status: "success",
      data: information
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: error.message
    });
  }
};

// Admin: Create new information
exports.createInformation = async (req, res) => {
  try {
    const { title, link, isActive = true, order = 0 } = req.body;

    if (!title) {
      return res.status(400).json({
        status: "error",
        message: "Title is required"
      });
    }

    const information = new Information({
      title,
      link,
      isActive,
      order
    });

    await information.save();

    res.status(201).json({
      status: "success",
      data: information,
      message: "Information created successfully"
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: error.message
    });
  }
};

// Admin: Update information
exports.updateInformation = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const information = await Information.findByIdAndUpdate(
      id,
      { ...updates, updatedAt: Date.now() },
      { new: true, runValidators: true }
    );

    if (!information) {
      return res.status(404).json({
        status: "error",
        message: "Information not found"
      });
    }

    res.status(200).json({
      status: "success",
      data: information,
      message: "Information updated successfully"
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: error.message
    });
  }
};

// Admin: Delete information
exports.deleteInformation = async (req, res) => {
  try {
    const { id } = req.params;

    const information = await Information.findByIdAndDelete(id);

    if (!information) {
      return res.status(404).json({
        status: "error",
        message: "Information not found"
      });
    }

    res.status(200).json({
      status: "success",
      message: "Information deleted successfully"
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: error.message
    });
  }
};

// Admin: Toggle information status
exports.toggleInformationStatus = async (req, res) => {
  try {
    const { id } = req.params;

    const information = await Information.findById(id);

    if (!information) {
      return res.status(404).json({
        status: "error",
        message: "Information not found"
      });
    }

    information.isActive = !information.isActive;
    information.updatedAt = Date.now();
    await information.save();

    res.status(200).json({
      status: "success",
      data: information,
      message: `Information ${information.isActive ? 'activated' : 'deactivated'} successfully`
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: error.message
    });
  }
};