
import rateLimit from "express-rate-limit";

// General API protection.
// 300 requests per IP per 15-minute window.
// Tune this after measuring real frontend traffic.
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  skip: (req) => req.method === "OPTIONS",
  message: {
    success: false,
    message: "Too many requests. Please try again later.",
    data: {},
  },
});

// Authentication protection.
// Apply only to sensitive routes, such as login,
// registration attempts, OTP verification and password resets.
// Consider separate limits for each operation in production.
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  message: {
    success: false,
    message: "Too many attempts. Please try again later.",
    data: {},
  },
});
