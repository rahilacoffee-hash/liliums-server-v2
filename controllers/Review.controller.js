import ReviewModel from "../models/Review.model.js";
import ProductModel from "../models/Product.model.js";
import UserModel from "../models/user.model.js";
import { sendResponse } from "../utils/Sendresponse.js";

function logError(context, error) {
  console.error(`[${context}]`, error);
}

// Recompute a product's aggregate rating + review count from its reviews
async function recalculateProductRating(productId) {
  let stats = await ReviewModel.aggregate([
    { $match: { product: productId } },
    { $group: { _id: "$product", avgRating: { $avg: "$rating" }, count: { $sum: 1 } } },
  ]);

  let rating = stats.length > 0 ? Math.round(stats[0].avgRating * 10) / 10 : 0;
  let numReviews = stats.length > 0 ? stats[0].count : 0;

  await ProductModel.findByIdAndUpdate(productId, { rating, numReviews });
}

// CREATE REVIEW (auth required - one per user per product)
export async function createReview(req, res) {
  try {
    const { productId, rating, comment } = req.body;
    const userId = req.userId;

    if (!productId || !rating || !comment) {
      return sendResponse(res, 400, false, "Provide all required fields");
    }

    const product = await ProductModel.findById(productId);
    if (!product) {
      return sendResponse(res, 404, false, "Product not found");
    }

    const existingReview = await ReviewModel.findOne({ product: productId, user: userId });
    if (existingReview) {
      return sendResponse(res, 400, false, "You've already reviewed this product");
    }

    const review = await ReviewModel.create({
      product: productId,
      user: userId,
      rating,
      comment,
    });

    await recalculateProductRating(productId);

    return sendResponse(res, 201, true, "Review submitted", review);
  } catch (error) {
    logError("createReview", error);
    return sendResponse(res, 500, false, "Internal server error");
  }
}

// GET REVIEWS FOR A PRODUCT (public)
export async function getProductReviews(req, res) {
  try {
    const { productId } = req.params;

    const reviews = await ReviewModel.find({ product: productId })
      .populate("user", "name")
      .sort({ createdAt: -1 });

    return sendResponse(res, 200, true, "Reviews fetched", reviews);
  } catch (error) {
    logError("getProductReviews", error);
    return sendResponse(res, 500, false, "Internal server error");
  }
}

// GET ALL REVIEWS (admin only) - across every product, with search/filter/pagination
export async function getAllReviews(req, res) {
  try {
    const { rating, search, page = 1, limit = 20 } = req.query;

    let filter = {};
    if (rating) filter.rating = Number(rating);
    if (search) filter.comment = { $regex: search, $options: "i" };

    let skip = (Number(page) - 1) * Number(limit);

    const [reviews, total] = await Promise.all([
      ReviewModel.find(filter)
        .populate("product", "name slug")
        .populate("user", "name email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      ReviewModel.countDocuments(filter),
    ]);

    return sendResponse(res, 200, true, "Reviews fetched", {
      reviews,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / Number(limit)),
    });
  } catch (error) {
    logError("getAllReviews", error);
    return sendResponse(res, 500, false, "Internal server error");
  }
}

// DELETE REVIEW (owner or admin)
export async function deleteReview(req, res) {
  try {
    const { id } = req.params;
    const review = await ReviewModel.findById(id);

    if (!review) {
      return sendResponse(res, 404, false, "Review not found");
    }

    let isOwner = review.user.toString() === req.userId;
    let requestingUser = await UserModel.findById(req.userId).select("role");
    let isAdmin = requestingUser?.role === "ADMIN";

    if (!isOwner && !isAdmin) {
      return sendResponse(res, 403, false, "Not authorized to delete this review");
    }

    let productId = review.product;
    await review.deleteOne();
    await recalculateProductRating(productId);

    return sendResponse(res, 200, true, "Review deleted");
  } catch (error) {
    logError("deleteReview", error);
    return sendResponse(res, 500, false, "Internal server error");
  }
}