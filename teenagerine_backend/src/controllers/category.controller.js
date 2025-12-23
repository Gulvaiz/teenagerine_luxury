const Category=require("../models/category.model");

exports.addCategory = async (req, res) => {
  try {
    const { name, description, image, slug, status, human } = req.body;

    const categoryData = {
      name,
      description,
      image,
      post_by: req.user._id,
    };

    // Add optional fields if provided
    if (slug !== undefined) categoryData.slug = slug;
    if (status !== undefined) categoryData.status = status;
    if (human !== undefined) categoryData.human = human;

    const category = new Category(categoryData);
    await category.save();

    res.status(201).json({
      status: "success",
      data: category
    });
  } catch (err) {
    console.error('Error creating category:', err);
    res.status(500).json({
      status: "fail",
      message: err.message,
      error: err.name === 'ValidationError' ? err.errors : undefined
    });
  }
}

exports.getCategories = async (req, res) => {
  try {
    const { human, name, limit } = req.query;

    const filter = {};

    if (human === "true") {
      filter.human = true;
    }

    if (name) {
      filter.name = { $regex: name, $options: "i" }; // "i" = case-insensitive
    }

    const categoryLimit = parseInt(limit) || 0;

    const categories = await Category.find(filter).limit(categoryLimit);

    res.status(200).json({
      status: "success",
      count: categories.length,
      data: categories
    });
  } catch (err) {
    res.status(400).json({ status: "fail", message: err.message });
  }
};


exports.getCategoryById = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ status: "fail", message: "Category not found" });
    }
    res.status(200).json({
      status: "success",
      data: {
        category: {
          id: category._id,
          name: category.name,
          description: category.description,
          image: category.image
        }
      }
    });
  } catch (err) {
    res.status(400).json({ status: "fail", message: err.message });
  }
}

exports.deleteCategory = async (req, res) => {
    try {
        const category = await Category.findByIdAndDelete(req.params.id);
        if (!category) {
        return res.status(404).json({ status: "fail", message: "Category not found" });
        }
        res.status(204).json({
        status: "success",
        data: null
        });
    } catch (err) {
        res.status(400).json({ status: "fail", message: err.message });
    }
}

exports.updateCategory = async (req, res) => {
  try {
    const { name, description, image, slug, status, human } = req.body;

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (image !== undefined) updateData.image = image;
    if (slug !== undefined) updateData.slug = slug;
    if (status !== undefined) updateData.status = status;
    if (human !== undefined) updateData.human = human;

    const category = await Category.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!category) {
      return res.status(404).json({ status: "fail", message: "Category not found" });
    }

    res.status(200).json({
      status: "success",
      data: category
    });
  } catch (err) {
    console.error('Error updating category:', err);
    res.status(400).json({
      status: "fail",
      message: err.message,
      error: err.name === 'ValidationError' ? err.errors : undefined
    });
  }
}

exports.getCategoryByName = async (req, res) => {
  try {
    const category = await Category.findOne({ name: req.params.name });
    if (!category) {
      return res.status(404).json({ status: "fail", message: "Category not found" });
    }
    res.status(200).json({
      status: "success",
      data: {
        category: {
          id: category._id,
          name: category.name,
          description: category.description,
          image: category.image
        }
      }
    });
  } catch (err) {
    res.status(400).json({ status: "fail", message: err.message });
  }
}

// Get category name letter counts for alphabet filter
exports.getCategoryLetterCounts = async (req, res) => {
  try {
    // Use MongoDB aggregation to count by first letter
    const letterCounts = await Category.aggregate([
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
    console.error("❌ Error in getCategoryLetterCounts:", error);
    res.status(500).json({
      status: "error",
      message: error.message
    });
  }
}

