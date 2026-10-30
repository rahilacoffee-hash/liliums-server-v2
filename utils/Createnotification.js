import NotificationModel from "../models/Notification.model.js";
import { publishAdminNotification } from "./adminNotificationStream.js";

// Fire-and-forget helper - call this from any controller when something
// notification-worthy happens. Never throws, so a notification failure
// can't ever break the actual action that triggered it (e.g. an order
// still succeeds even if writing its notification somehow fails).
export default async function createNotification({ type, title, message, link = null }) {
  try {
    const notification = await NotificationModel.create({ type, title, message, link });
    publishAdminNotification(notification);
  } catch (error) {
    console.error("[createNotification]", error);
  }
}