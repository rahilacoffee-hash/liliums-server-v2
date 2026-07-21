import { Router } from "express";
import auth from "../middleware/auth.js";
import adminOnly from "../middleware/adminOnly.js";
import { uploadServiceImage } from "../middleware/Uploadimage.js";
import { getAllServices, createService, updateService, deleteService } from "../controllers/Service.controller.js";

const router = Router();

router.get("/", getAllServices);

router.post("/", auth, adminOnly, uploadServiceImage.single("image"), createService);
router.put("/:id", auth, adminOnly, uploadServiceImage.single("image"), updateService);
router.delete("/:id", auth, adminOnly, deleteService);

export default router;