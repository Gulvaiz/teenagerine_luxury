const User = require("../models/user.model");
const Product = require("../models/product.model");

exports.getRecommendations = async (req, res) => {
  const user = await User.findById(req.user._id);

  const ids = [
    ...(user.wishlist || []),
    ...(user.viewedProducts || [])
  ];

  const uniqueIds = [...new Set(ids)];

  const recommended = await Product.find({
    _id: { $in: uniqueIds }
  }).limit(10);

  res.status(200).json({ status: "success", recommended });
};
