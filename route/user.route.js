import { Router } from "express";
import auth from "../middleware/auth.js";
import adminOnly from "../middleware/adminOnly.js";
import { authLimiter } from "../middleware/rateLimiter.js";
import { uploadUserAvatar } from "../middleware/Uploadimage.js";
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
  saveShippingAddress,
  forgotPasswordController,
  verifyforgotPasswordOtp,
  resetPassword,
  refreshToken,
  googleAuthController,
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
router.put("/update-user", auth, uploadUserAvatar.single("avatar"), updateUserDetails);
router.post("/saved-addresses", auth, saveShippingAddress);
router.put("/forgot-password", authLimiter, forgotPasswordController);
router.put("/verify-forgot-password-otp", authLimiter, verifyforgotPasswordOtp);
router.put("/reset-password", resetPassword);
router.post("/refresh-token", refreshToken);
router.post("/google", googleAuthController);

export default router;
