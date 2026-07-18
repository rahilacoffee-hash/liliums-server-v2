import { Router } from "express";
import auth from "../middleware/auth.js";
import adminOnly from "../middleware/adminOnly.js";
import {
  getAllNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
} from "../controllers/Notification.controller.js";

const router = Router();

router.get("/", auth, adminOnly, getAllNotifications);
router.get("/unread-count", auth, adminOnly, getUnreadCount);
router.put("/:id/read", auth, adminOnly, markAsRead);
router.put("/mark-all-read", auth, adminOnly, markAllAsRead);
router.delete("/:id", auth, adminOnly, deleteNotification);

export default router;