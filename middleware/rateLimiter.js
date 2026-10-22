import rateLimit from "express-rate-limit"

// Broad protection against request floods. Stricter limits remain in place
// for login, OTP, and password-reset endpoints below.
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.method === "OPTIONS",
  message: {
    success: false,
    message: "Too many requests. Please try again later.",
    data: {},
  },
})

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
