import { Router } from "express";
import auth from "../middleware/auth.js";
import adminOnly from "../middleware/adminOnly.js";
import { authLimiter } from "../middleware/rateLimiter.js";
import {
  registerUserController,
  verifyEmailController,
  loginUserController,
  logoutController,
  userDetails,
  getAllUsers,
  toggleUserStatus,
  deleteUser,
  updateUserDetails,
  forgotPasswordController,
  verifyforgotPasswordOtp,
  resetPassword,
  refreshToken,
} from "../controllers/user.controller.js";

const router = Router();

router.post("/register", registerUserController);
router.post("/verify-email", authLimiter, verifyEmailController);
router.post("/login", authLimiter, loginUserController);
router.get("/logout", auth, logoutController);
router.get("/user-details", auth, userDetails);
router.get("/all", auth, adminOnly, getAllUsers);
router.put("/:id/status", auth, adminOnly, toggleUserStatus);
router.delete("/:id", auth, adminOnly, deleteUser);
router.put("/update-user", auth, updateUserDetails);
router.put("/forgot-password", authLimiter, forgotPasswordController);
router.put("/verify-forgot-password-otp", authLimiter, verifyforgotPasswordOtp);
router.put("/reset-password", resetPassword);
router.post("/refresh-token", refreshToken);

export default router;