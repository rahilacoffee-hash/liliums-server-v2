import { Router } from "express";
import auth from "../middleware/auth.js";
import adminOnly from "../middleware/adminOnly.js";

import {
  getDashboardStats,
} from "../controllers/Dashboard.controller.js";

const router = Router();

router.get(
  "/",
  auth,
  adminOnly,
  getDashboardStats
);

export default router;