const globalController = require('../models/global.controller.model');

exports.getGlobalController = async (req, res) => {
    try {
        const globalControllerData = await globalController.find();
        res.status(200).json(globalControllerData);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

exports.updateGlobalController = async (req, res) => {
    try {
        const globalControllerData = await globalController.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.status(200).json(globalControllerData);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}
