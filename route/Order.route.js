import { Router } from "express";
import auth from "../middleware/auth.js";
import adminOnly from "../middleware/adminOnly.js";

import {
  createOrder,
  getMyOrders,
  getOrderById,
  getAllOrders,
  updateOrderStatus,
  cancelOrder,
  markOrderPaid,
} from "../controllers/Order.controller.js";

const orderRouter = Router();

/* ============================================
   CUSTOMER ROUTES
============================================ */

// Create Order
orderRouter.post("/", auth, createOrder);

// My Orders
orderRouter.get("/my-orders", auth, getMyOrders);

// Single Order
orderRouter.get("/:id", auth, getOrderById);

// Cancel Order
orderRouter.put("/:id/cancel", auth, cancelOrder);

// Mark Order Paid (after Paystack verification)
orderRouter.put("/:id/pay", auth, markOrderPaid);

/* ============================================
   ADMIN ROUTES
============================================ */

// All Orders
orderRouter.get("/", auth, adminOnly, getAllOrders);

// Update Status
orderRouter.put("/:id/status", auth, adminOnly, updateOrderStatus);

export default orderRouter;