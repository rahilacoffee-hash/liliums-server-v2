import { Router } from "express";
import auth from "../middleware/auth.js";
import adminOnly from "../middleware/adminOnly.js";
import {
  createOrder,
  getMyOrders,
  getOrderById,
  getAllOrders,
  updateOrderStatus,
} from "../controllers/Order.controller.js";

const router = Router();

// Any logged-in user
router.post("/", auth, createOrder);
router.get("/my-orders", auth, getMyOrders);
router.get("/:id", auth, getOrderById);

// Admin only
router.get("/", auth, adminOnly, getAllOrders);
router.put("/:id/status", auth, adminOnly, updateOrderStatus);

export default router;