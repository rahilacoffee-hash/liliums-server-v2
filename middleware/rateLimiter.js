import rateLimit from "express-rate-limit"

// 5 attempts per 15 minutes per IP, shared config for sensitive auth routes
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many attempts. Please try again in 15 minutes.",
    data: {},
  },
})