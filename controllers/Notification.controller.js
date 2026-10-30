import NotificationModel from "../models/Notification.model.js";
import { sendResponse } from "../utils/Sendresponse.js";
import { addAdminNotificationStream } from "../utils/adminNotificationStream.js";

function logError(context, error) {
  console.error(`[${context}]`, error);
}


// REAL-TIME ADMIN STREAM (auth + adminOnly middleware are applied by the route)
export function streamAdminNotifications(req, res) {
  res.status(200);
  res.set({
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });
  res.flushHeaders?.();
  res.write("retry: 10000\n: connected\n\n");

  const removeStream = addAdminNotificationStream(res);
  const heartbeat = setInterval(() => {
    if (!res.destroyed && !res.writableEnded) {
      res.write(": keep-alive\n\n");
    }
  }, 25000);
  heartbeat.unref?.();

  const cleanup = () => {
    clearInterval(heartbeat);
    removeStream();
  };

  req.on("close", cleanup);
  res.on("close", cleanup);
}

// GET ALL NOTIFICATIONS (admin only)
export async function getAllNotifications(req, res) {
  try {
    const { filter = "all", page = 1, limit = 20 } = req.query;

    let query = {};
    if (filter === "unread") query.isRead = false;
    if (filter === "read") query.isRead = true;

    let skip = (Number(page) - 1) * Number(limit);

    const [notifications, total, unreadCount] = await Promise.all([
      NotificationModel.find(query).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
      NotificationModel.countDocuments(query),
      NotificationModel.countDocuments({ isRead: false }),
    ]);

    return sendResponse(res, 200, true, "Notifications fetched", {
      notifications,
      total,
      unreadCount,
      page: Number(page),
      totalPages: Math.ceil(total / Number(limit)),
    });
  } catch (error) {
    logError("getAllNotifications", error);
    return sendResponse(res, 500, false, "Internal server error");
  }
}

// GET UNREAD COUNT (admin only) - lightweight, for the navbar bell badge
export async function getUnreadCount(req, res) {
  try {
    const unreadCount = await NotificationModel.countDocuments({ isRead: false });
    return sendResponse(res, 200, true, "Unread count fetched", { unreadCount });
  } catch (error) {
    logError("getUnreadCount", error);
    return sendResponse(res, 500, false, "Internal server error");
  }
}

// MARK ONE AS READ (admin only)
export async function markAsRead(req, res) {
  try {
    const { id } = req.params;
    const notification = await NotificationModel.findByIdAndUpdate(id, { isRead: true }, { new: true });

    if (!notification) {
      return sendResponse(res, 404, false, "Notification not found");
    }

    return sendResponse(res, 200, true, "Marked as read", notification);
  } catch (error) {
    logError("markAsRead", error);
    return sendResponse(res, 500, false, "Internal server error");
  }
}

// MARK ALL AS READ (admin only)
export async function markAllAsRead(req, res) {
  try {
    await NotificationModel.updateMany({ isRead: false }, { isRead: true });
    return sendResponse(res, 200, true, "All notifications marked as read");
  } catch (error) {
    logError("markAllAsRead", error);
    return sendResponse(res, 500, false, "Internal server error");
  }
}

// DELETE NOTIFICATION (admin only)
export async function deleteNotification(req, res) {
  try {
    const { id } = req.params;
    const notification = await NotificationModel.findByIdAndDelete(id);

    if (!notification) {
      return sendResponse(res, 404, false, "Notification not found");
    }

    return sendResponse(res, 200, true, "Notification deleted");
  } catch (error) {
    logError("deleteNotification", error);
    return sendResponse(res, 500, false, "Internal server error");
  }
}