import { Router } from "express";
import auth from "../middleware/auth.js";
import adminOnly from "../middleware/adminOnly.js";
import { uploadTestimonialAvatar } from "../middleware/Uploadimage.js";
import {
  getAllTestimonials,
  createTestimonial,
  updateTestimonial,
  deleteTestimonial,
} from "../controllers/Testimonial.controller.js";

const router = Router();

router.get("/", getAllTestimonials);

router.post("/", auth, adminOnly, uploadTestimonialAvatar.single("avatar"), createTestimonial);
router.put("/:id", auth, adminOnly, uploadTestimonialAvatar.single("avatar"), updateTestimonial);
router.delete("/:id", auth, adminOnly, deleteTestimonial);

export default router;