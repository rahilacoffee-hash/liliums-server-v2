import { Router } from "express";
import auth from "../middleware/auth.js";
import adminOnly from "../middleware/adminOnly.js";
import { uploadSiteContentImages } from "../middleware/Uploadimage.js";
import { getSiteContent, updateSiteContent } from "../controllers/Sitecontent.controller.js";

const router = Router();

router.get("/", getSiteContent);

router.put(
  "/",
  auth,
  adminOnly,
  uploadSiteContentImages.fields([
    { name: "heroBackgroundImage", maxCount: 1 },
    { name: "heroFeaturedImage", maxCount: 1 },
    { name: "aboutImage", maxCount: 1 },
  ]),
  updateSiteContent
);

export default router;