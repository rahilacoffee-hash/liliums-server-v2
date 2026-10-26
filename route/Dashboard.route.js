import { Router } from "express";

import auth from "../middleware/auth.js";
import adminOnly from "../middleware/adminOnly.js";

import {
  getDashboard,
  getLowStockProducts,
  getRecentOrders,
  getRevenueChart,
  getSalesByCategory,
} from "../controllers/Dashboard.controller.js";

import {
  getAdminProductStats,
  getAdminProducts,
} from "../controllers/AdminProduct.controller.js";

const router = Router();

router.use(auth);
router.use(adminOnly);

router.get("/products/stats", getAdminProductStats);
router.get("/products", getAdminProducts);




router.get("/dashboard", getDashboard);

router.get("/low-stock", getLowStockProducts);

router.get("/recent-orders", getRecentOrders);

router.get("/revenue-chart", getRevenueChart);
router.get("/sales-by-category", getSalesByCategory);

export default router;
