import { Router } from "express";

import auth from "../middleware/auth.js";
import adminOnly from "../middleware/adminOnly.js";

import {
  getDashboard,
  getLowStockProducts,
  getRecentOrders,
  getRevenueChart,
} from "../controllers/Dashboard.controller.js";

const router = Router();

router.use(auth);
router.use(adminOnly);

router.get("/dashboard", getDashboard);

router.get("/low-stock", getLowStockProducts);

router.get("/recent-orders", getRecentOrders);

router.get("/revenue-chart", getRevenueChart);

export default router;