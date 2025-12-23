const Wishlist = require("../models/wishlist.model");
const User = require("../models/user.model");
const Product = require("../models/product.model");

exports.addToWishlist = async (req, res) => {
  try {
    const { productId } = req.body;
    const userId = req.user._id;

    const user = await User.findById(userId);
    if (!user) {
      return res
        .status(404)
        .json({ status: "fail", message: "User not found" });
    }
    const product = await Product.findById(productId);
    if (!product) {
      return res
        .status(404)
        .json({ status: "fail", message: "Product not found" });
    }
    let wishlist = await Wishlist.findOne({ user: userId });
    if (!wishlist) {
      wishlist = new Wishlist({
        user: userId,
        items: [{ product: productId }],
      });
    } else {
      const alreadyExists = wishlist.items.some(
        (item) => item.product.toString() === productId
      );
      if (alreadyExists) {
        return res
          .status(400)
          .json({ status: "fail", message: "Product already in wishlist" });
      }
      wishlist.items.push({ product: productId });
    }

    await wishlist.save();
    res.status(200).json({ status: "success", wishlist });
  } catch (error) {
    console.log(error);
    res.status(500).json({ status: "error", message: error.message });
  }
};

exports.removeFromWishlist = async (req, res) => {
  try {
    const { productId } = req.body;
    const userId = req.user._id;

    console.log('Remove from wishlist request:', { productId, userId: userId.toString() });

    // Validate productId
    if (!productId) {
      return res.status(400).json({
        status: "fail",
        message: "Product ID is required"
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      console.log('User not found:', userId);
      return res.status(404).json({
        status: "fail",
        message: "User not found"
      });
    }

    const product = await Product.findById(productId);
    if (!product) {
      console.log('Product not found:', productId);
      return res.status(404).json({
        status: "fail",
        message: "Product not found"
      });
    }

    const wishlist = await Wishlist.findOne({ user: userId });
    if (!wishlist) {
      console.log('Wishlist not found for user:', userId);
      return res.status(404).json({
        status: "fail",
        message: "Wishlist not found"
      });
    }

    console.log('Wishlist items before removal:', wishlist.items.map(i => i.product.toString()));

    const index = wishlist.items.findIndex(
      (p) => p.product.toString() === product._id.toString()
    );

    console.log('Product index in wishlist:', index);

    if (index === -1) {
      return res.status(404).json({
        status: "fail",
        message: "Product not found in wishlist"
      });
    }

    wishlist.items.splice(index, 1);
    await wishlist.save();

    console.log('✓ Product removed from wishlist successfully');

    res.status(200).json({ status: "success", wishlist });
  } catch (error) {
    console.error('Error removing from wishlist:', error);
    res.status(500).json({
      status: "error",
      message: error.message
    });
  }
};

exports.getWishlist = async (req, res) => {
  // console.log(req.user);
  try {
    const userId = req.user._id;
    const wishlist = await Wishlist.findOne({ user: userId }).populate({
      path: "items.product",
      select:
        "name price image description category brand stockQuantity rating reviews slug soldOut",
      populate: [
        {
          path: "categories.categoryId",
          select: "name",
        },
        {
          path: "brands.brandId",
          select: "name",
        },
      ],
    });
//   console.log(wishlist);
    if (!wishlist) {
      return res
        .status(404)
        .json({ status: "fail", message: "Wishlist not found" });
    }

    res.status(200).json({ status: "success", wishlist });
  } catch (error) {
    console.log(error);
    res.status(500).json({ status: "error", message: error.message });
  }
};

exports.clearWishlist = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ status: "fail", message: "Unauthorized" });
    }
    const userId = req.user._id;
    const wishlist = await Wishlist.findOne({ user: userId });
    if (!wishlist) {
      return res
        .status(404)
        .json({ status: "fail", message: "Wishlist not found" });
    }
    wishlist.items = [];
    await wishlist.save();
    res
      .status(200)
      .json({ status: "success", message: "Wishlist cleared successfully" });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
};

exports.getWishlistByUserId = async (req, res) => {
  try {
    const userId = req.params.userId;
    const wishlist = await Wishlist.findOne({ user: userId }).populate(
      "items",
      "name price image"
    );
    if (!wishlist) {
      return res
        .status(404)
        .json({ status: "fail", message: "Wishlist not found" });
    }
    res.status(200).json({ status: "success", wishlist });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
};

exports.updateWishlist = async (req, res) => {
  try {
    const { items } = req.body;
    const userId = req.user._id;
    const wishlist = await Wishlist.findOne({ user: userId });
    if (!wishlist) {
      return res
        .status(404)
        .json({ status: "fail", message: "Wishlist not found" });
    }
    wishlist.items = items;
    await wishlist.save();
    res.status(200).json({ status: "success", wishlist });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
};
