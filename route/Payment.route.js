import { Router } from "express";
import auth from "../middleware/auth.js";

import {
  initializePayment,
  verifyPayment,
  paystackWebhook,
} from "../controllers/Payment.controller.js";

const paymentRouter = Router();

/**
 * ==========================================
 * Initialize Paystack Payment
 * POST /api/payment/initialize
 * ==========================================
 */
paymentRouter.post(
  "/initialize",
  auth,
  initializePayment
);

/**
 * ==========================================
 * Verify Payment
 * GET /api/payment/verify/:reference
 * ==========================================
 */
paymentRouter.get(
  "/verify/:reference",
  auth,
  verifyPayment
);

/**
 * ==========================================
 * Paystack Webhook
 * POST /api/payment/webhook
 *
 * DO NOT USE auth middleware here.
 * Paystack's servers call this endpoint.
 * ==========================================
 */
paymentRouter.post(
  "/webhook",
  paystackWebhook
);

export default paymentRouter;