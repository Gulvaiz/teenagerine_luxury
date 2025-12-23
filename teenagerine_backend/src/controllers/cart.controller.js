const Cart = require("../models/cart.model");

exports.addToCart = async (req, res) => {
  const { productId, quantity } = req.body;
  // console.log(req.user);
  if (!productId || !quantity) {
    return res.status(400).json({ message: "Product ID and quantity are required" });
  }
  const userId = req.user._id;


  let cart = await Cart.findOne({ user: userId });

  if (!cart) {
    cart = await Cart.create({ user: userId, items: [{ product: productId, quantity }] });
  } else {
    const item = cart.items.find(item => item.product.equals(productId));
    if (item) {
      item.quantity += quantity;
    } else {
      cart.items.push({ product: productId, quantity });
    }
    await cart.save();
  }

  res.status(200).json({ status: "success", cart });
};

exports.getMyCart = async (req, res) => {
  const cart = await Cart.findOne({ user: req.user._id }).populate("items.product");
  if (!cart) return res.status(404).json({ message: "Cart not found" });

  res.status(200).json({ status: "success", cart });
};

exports.clearCart = async (req, res) => {
  await Cart.findOneAndDelete({ user: req.user._id });
  res.status(204).send();
};
