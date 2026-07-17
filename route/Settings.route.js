import { Router } from "express";
import auth from "../middleware/auth.js";
import adminOnly from "../middleware/adminOnly.js";
import { uploadLogo } from "../middleware/uploadImage.js";
import { getSettings, updateSettings } from "../controllers/Settings.controller.js";

const router = Router();

// Public - the contact page needs to read consultationFee, footer needs socials, etc.
router.get("/", getSettings);

// Admin only
router.put("/", auth, adminOnly, uploadLogo.single("logo"), updateSettings);

export default router;