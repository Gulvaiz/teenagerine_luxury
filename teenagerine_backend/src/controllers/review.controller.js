const Review = require("../models/review.model");

exports.createReview = async (req, res) => {
  const { productId, rating, comment } = req.body;

  const review = await Review.create({
    user: req.user._id,
    product: productId,
    rating,
    comment,
  });

  res.status(201).json({ status: "success", review });
};
exports.getReviewsByProductId= async (req, res) => {
  const reviews = await Review.find({ product: req.params.productId })
    .populate("user", "name")
    .sort({ createdAt: -1 });

  if (!reviews.length) {
    return res.status(404).json({ status: "fail", message: "No reviews found for this product" });
  }

  res.status(200).json({ status: "success", reviews });
}
exports.getProductReviews = async (req, res) => {
  const reviews = await Review.find({ product: req.params.productId }).populate("user", "name");
  res.status(200).json({ status: "success", reviews });
};
exports.getUserReviews = async (req, res) => {
  const reviews = await Review.find({ user: req.user._id }).populate("product", "name");
  res.status(200).json({ status: "success", reviews });
};
exports.deleteReview = async (req, res) => {
  const review = await Review.findById(req.params.id);
  if (!review) {
    return res.status(404).json({ status: "fail", message: "Review not found" });
  }

  if (review.user.toString() !== req.user._id.toString()) {
    return res.status(403).json({ status: "fail", message: "You are not authorized to delete this review" });
  }

  await review.remove();
  res.status(204).json({ status: "success", message: "Review deleted successfully" });
};
exports.updateReview = async (req, res) => {
  const { rating, comment } = req.body;
  const review = await Review.findById(req.params.id);

  if (!review) {
    return res.status(404).json({ status: "fail", message: "Review not found" });
  }

  if (review.user.toString() !== req.user._id.toString()) {
    return res.status(403).json({ status: "fail", message: "You are not authorized to update this review" });
  }

  review.rating = rating || review.rating;
  review.comment = comment || review.comment;

  await review.save();
  res.status(200).json({ status: "success", review });
};