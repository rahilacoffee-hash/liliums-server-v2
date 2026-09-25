import { Router } from "express";
import auth from "../middleware/auth.js";
import adminOnly from "../middleware/adminOnly.js";
import upload from "../middleware/upload.js";

import {
  createProduct,
  getAllProducts,
  getFeaturedProducts,
  getProductBySlug,
  getProductById,
  updateProduct,
  deleteProduct,
} from "../controllers/Product.controller.js";

import {
  createReview,
  getProductReviews,
  getAllReviews,
  deleteReview,
} from "../controllers/Review.controller.js";

const router = Router();

/* ==========================================
   PRODUCT ROUTES (Public)
========================================== */

router.get("/", getAllProducts);

router.get("/featured", getFeaturedProducts);

// Admin edit screens use a Mongo document ID; public product pages use slugs.
router.get("/id/:id", auth, adminOnly, getProductById);

router.get("/:slug", getProductBySlug);

/* ==========================================
   REVIEW ROUTES
========================================== */

router.get("/:productId/reviews", getProductReviews);

router.post("/reviews", auth, createReview);

router.delete("/reviews/:id", auth, deleteReview);

router.get("/reviews/all", auth, adminOnly, getAllReviews);

/* ==========================================
   ADMIN PRODUCT ROUTES
========================================== */

// Create Product (Multiple Images)
router.post(
  "/",
  auth,
  adminOnly,
  upload.array("images", 10),
  createProduct
);

// Update Product (Replace Images)
router.put(
  "/:id",
  auth,
  adminOnly,
  upload.array("images", 10),
  updateProduct
);

// Delete Product
router.delete(
  "/:id",
  auth,
  adminOnly,
  deleteProduct
);

export default router;
