import express from "express";

import {
  addToCart,
  getCart,
  updateQuantity,
  removeItem,
  clearCart,
} from "../controllers/Cart.controller.js";

import auth from "../middleware/auth.js";

const router = express.Router();

// All cart routes require login
router.use(auth);

// Get logged in user's cart
router.get("/", getCart);

// Add product to cart
router.post("/add", addToCart);

// Update quantity
router.put("/update", updateQuantity);

// Remove one product
router.delete("/remove/:productId", removeItem);

// Clear cart
router.delete("/clear", clearCart);

export default router;