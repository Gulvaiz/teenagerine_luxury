const Brand = require('../models/brand.model');
exports.createBrand = async (req, res) => {
    try {
        const { name } = req.body;

        // Check for existing brand (case-insensitive)
        const existingBrand = await Brand.findOne({
            name: { $regex: new RegExp(`^${name}$`, 'i') }
        });

        if (existingBrand) {
            return res.status(400).json({
                status: 'fail',
                message: 'Brand with this name already exists'
            });
        }

        const brand = new Brand({ ...req.body, post_by: req.user._id });
        const savedBrand = await brand.save();

        res.status(201).json(savedBrand);
    } catch (error) {
        console.log(error)
        res.status(500).json({
            error: error.message
        });
    }
};

// Public endpoint - returns only active brands with pagination
exports.getAllBrands = async (req, res) => {
    try {
        const { page = 1, limit = 50, keyword } = req.query;
        const skip = (page - 1) * limit;

        // Only show active brands for public
        let query = {
            $or: [{ isActive: true }, { isActive: { $exists: false } }]
        };

        if (keyword) {
            query.name = { $regex: keyword, $options: 'i' };
        }

        const brands = await Brand.find(query)
            .skip(skip)
            .limit(Number(limit));

        const total = await Brand.countDocuments(query);

        res.status(200).json({
            status: "success",
            results: brands.length,
            total,
            page: Number(page),
            totalPages: Math.ceil(total / limit),
            brands
        });
    } catch (error) {
        console.log(error);
        res.status(500).json({
            error: error.message
        });
    }
};

// Admin endpoint - returns ALL brands (active and inactive) without pagination limit
exports.getAllBrandsForAdmin = async (req, res) => {
    try {
        const { keyword } = req.query;

        // No filtering by isActive - get ALL brands
        let query = {};

        if (keyword) {
            query.name = { $regex: keyword, $options: 'i' };
        }

        // Get all brands without pagination
        const brands = await Brand.find(query).sort({ createdAt: -1 });
        const total = brands.length;

        res.status(200).json({
            status: "success",
            results: brands.length,
            total,
            brands
        });
    } catch (error) {
        console.log(error);
        res.status(500).json({
            status: "error",
            message: error.message
        });
    }
};

exports.getBrandById = async (req, res) => {
    try {
        const brand = await Brand.findOne({ _id: req.params.id, $or: [{ isActive: true }, { isActive: { $exists: false } }] });
        if (!brand) {
            return res.status(404).json({ message: 'Brand not found' });
        }
        res.status(200).json(brand);
    } catch (error) {
        res.status(500).json({
            error: error.message
        });
    }
};

exports.updateBrand = async (req, res) => {
    try {
        const { name, description, slug, image } = req.body;
        // Validate required fields
        if (!name || !description || !slug || !image) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        const updatedBrand = await Brand.findByIdAndUpdate(
            req.params.id,
            {
                name,
                description,
                slug,
                image,
                post_by: req.user._id,
                isActive: true,
            },
            { new: true, runValidators: true }
        );

        if (!updatedBrand) {
            return res.status(404).json({ message: 'Brand not found' });
        }

        res.status(200).json(updatedBrand);
    } catch (error) {
        console.error(error);
        res.status(400).json({ error: error.message });
    }
};


exports.deleteBrand = async (req, res) => {
    try {
        const brand = await Brand.findByIdAndDelete(req.params.id);
        if (!brand) {
            return res.status(404).json({
                status: 'fail',
                message: 'Brand not found'
            });
        }
        res.status(200).json({
            status: 'success',
            message: 'Brand deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting brand:', error);
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
};

exports.getBrandByCategory = async (req, res) => {
    try {
        const brands = await Brand.find({ category: req.params.category, $or: [{ isActive: true }, { isActive: { $exists: false } }] });
        res.status(200).json(brands);
    } catch (error) {
        res.status(500).json({
            error: error.message
        });
    }
};

exports.getBrandByName = async (req, res) => {
    try {
        const brands = await Brand.find({ name: req.params.name, $or: [{ isActive: true }, { isActive: { $exists: false } }] });
        res.status(200).json(brands);
    } catch (error) {
        res.status(500).json({
            error: error.message
        });
    }
};

// Get brand name letter counts for alphabet filter
exports.getBrandLetterCounts = async (req, res) => {
    try {
        // Use MongoDB aggregation to count by first letter
        const letterCounts = await Brand.aggregate([
            {
                $project: {
                    firstLetter: { $toUpper: { $substr: ["$name", 0, 1] } }
                }
            },
            {
                $match: {
                    firstLetter: { $regex: /^[A-Z]$/ }
                }
            },
            {
                $group: {
                    _id: "$firstLetter",
                    count: { $sum: 1 }
                }
            },
            {
                $sort: { _id: 1 }
            }
        ]);

        // Convert to object format { A: 5, B: 10, ... }
        const counts = {};
        letterCounts.forEach(item => {
            counts[item._id] = item.count;
        });

        res.status(200).json({
            status: "success",
            data: { letterCounts: counts }
        });
    } catch (error) {
        console.error("❌ Error in getBrandLetterCounts:", error);
        res.status(500).json({
            status: "error",
            message: error.message
        });
    }
};
