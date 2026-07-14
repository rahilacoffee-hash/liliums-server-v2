import UserModel from "../models/user.model.js";

export default async function adminOnly(req, res, next) {
  try {
    const user = await UserModel.findById(req.userId);
    if (!user || user.role !== "ADMIN") {
      return res.status(403).json({ message: "Admin access required", error: true, success: false });
    }
    next();
  } catch (error) {
    return res.status(500).json({ message: error.message, error: true, success: false });
  }
}