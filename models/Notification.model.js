import mongoose from "mongoose"

let notificationSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ["order", "consultation", "review", "user", "product", "system"],
    required: true
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  link: {
    type: String,
    default: null // e.g. "/admin/orders/<id>" - where clicking the notification should navigate
  },
  isRead: {
    type: Boolean,
    default: false
  }
}, { timestamps: true })

notificationSchema.index({ isRead: 1, createdAt: -1 })

let NotificationModel = mongoose.model("Notification", notificationSchema)
export default NotificationModel