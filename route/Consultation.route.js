import { Router } from "express";
import auth from "../middleware/auth.js";
import adminOnly from "../middleware/adminOnly.js";
import {
  createConsultation,
  getAllConsultations,
  getConsultationById,
  replyToConsultation,
  updateConsultationStatus,
  deleteConsultation, 
  initializeConsultationPayment,
  verifyConsultationPayment,
} from "../controllers/Consultation.controller.js";

const router = Router();

// Public - anyone can submit the consultation form
router.post("/", createConsultation);

// Admin only
router.get("/", auth, adminOnly, getAllConsultations);
router.get("/:id", auth, adminOnly, getConsultationById);
router.post("/:id/reply", auth, adminOnly, replyToConsultation);
router.put("/:id/status", auth, adminOnly, updateConsultationStatus);
router.delete("/:id", auth, adminOnly, deleteConsultation);
router.post("/pay/initialize", initializeConsultationPayment);
router.get("/pay/verify/:reference", verifyConsultationPayment);

export default router;