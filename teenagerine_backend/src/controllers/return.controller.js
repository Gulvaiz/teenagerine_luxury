const Return = require("../models/return.model");
const User = require("../models/user.model");
const Order = require("../models/order.model");


exports.createReturnRequest = async (req, res) => {
    try {
        const { orderId, reason } = req.body;
        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).json({ status: "fail", message: "User not found" });
        }

        const order = await Order.findById(orderId);
        if (!order || order.user.toString() !== user._id.toString()) {
            return res.status(404).json({ status: "fail", message: "Order not found or does not belong to user" });
        }

        const returnRequest = new Return({
            user: user._id,
            order: order._id,
            reason
        });

        const savedReturnRequest = await returnRequest.save();
        res.status(201).json({ status: "success", returnRequest: savedReturnRequest });
    } catch (error) {
        res.status(400).json({ status: "fail", message: error.message });
    }
}

exports.getUserReturnRequests = async (req, res) => {
    try {
        const returnRequests = await Return.find({ user: req.user._id }).populate("order", "orderNumber").populate("user", "name email");
        res.status(200).json({ status: "success", returnRequests });
    } catch (error) {
        res.status(500).json({ status: "error", message: error.message });
    }
}


exports.getReturnRequestById = async (req, res) => {
    try {
        const returnRequest = await Return.findById(req.params.id).populate("order", "orderNumber").populate("user", "name email");
        if (!returnRequest) {
            return res.status(404).json({ status: "fail", message: "Return request not found" });
        }
        res.status(200).json({ status: "success", returnRequest });
    } catch (error) {
        res.status(500).json({ status: "error", message: error.message });
    }
}

exports.updateReturnRequestStatus = async (req, res) => {
    try {
        const { status } = req.body;
        const returnRequest = await Return.findById(req.params.id);
        if (!returnRequest) {
            return res.status(404).json({ status: "fail", message: "Return request not found" });
        }

        returnRequest.status = status;
        if (status === "Approved" || status === "Rejected") {
            returnRequest.resolvedAt = Date.now();
        }

        const updatedReturnRequest = await returnRequest.save();
        res.status(200).json({ status: "success", returnRequest: updatedReturnRequest });
    } catch (error) {
        res.status(400).json({ status: "fail", message: error.message });
    }
}

exports.deleteReturnRequest = async (req, res) => {
    try {
        const returnRequest = await Return.findById(req.params.id);
        if (!returnRequest) {
            return res.status(404).json({ status: "fail", message: "Return request not found" });
        }

        await returnRequest.remove();
        res.status(204).json({ status: "success", message: "Return request deleted successfully" });
    } catch (error) {
        res.status(500).json({ status: "error", message: error.message });
    }
}

exports.getAllReturnRequests = async (req, res) => {
    try {
        const returnRequests = await Return.find().populate("order", "orderNumber").populate("user", "name email");
        res.status(200).json({ status: "success", returnRequests });
    } catch (error) {
        res.status(500).json({ status: "error", message: error.message });
    }
}

exports.getReturnRequestsByOrderId = async (req, res) => {
    try {
        const returnRequests = await Return.find({ order: req.params.orderId }).populate("order", "orderNumber").populate("user", "name email");
        if (!returnRequests || returnRequests.length === 0) {
            return res.status(404).json({ status: "fail", message: "No return requests found for this order" });
        }
        res.status(200).json({ status: "success", returnRequests });
    } catch (error) {
        res.status(500).json({ status: "error", message: error.message });
    }
}

exports.getReturnRequestsByUserId = async (req, res) => {
    try {
        const returnRequests = await Return.find({ user: req.params.userId }).populate("order", "orderNumber").populate("user", "name email");
        if (!returnRequests || returnRequests.length === 0) {
            return res.status(404).json({ status: "fail", message: "No return requests found for this user" });
        }
        res.status(200).json({ status: "success", returnRequests });
    } catch (error) {
        res.status(500).json({ status: "error", message: error.message });
    }
}

exports.getReturnRequestsByStatus = async (req, res) => {
    try {
        const returnRequests = await Return.find({ status: req.params.status }).populate("order", "orderNumber").populate("user", "name email");
        if (!returnRequests || returnRequests.length === 0) {
            return res.status(404).json({ status: "fail", message: "No return requests found with this status" });
        }
        res.status(200).json({ status: "success", returnRequests });
    } catch (error) {
        res.status(500).json({ status: "error", message: error.message });
    }
}

exports.getReturnRequestsByDateRange = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const returnRequests = await Return.find({
            requestedAt: {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            }
        }).populate("order", "orderNumber").populate("user", "name email");

        if (!returnRequests || returnRequests.length === 0) {
            return res.status(404).json({ status: "fail", message: "No return requests found in this date range" });
        }
        res.status(200).json({ status: "success", returnRequests });
    } catch (error) {
        res.status(500).json({ status: "error", message: error.message });
    }
}