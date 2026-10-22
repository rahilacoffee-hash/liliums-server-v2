import "dotenv/config";
import express from "express";
import mongoose from "mongoose";
import cookieParser from "cookie-parser";
import cors from "cors";
import { apiLimiter } from "./middleware/rateLimiter.js";

import userRouter from "./route/user.route.js";
import productRouter from "./route/product.route.js";
import orderRouter from "./route/Order.route.js";
import cartRouter from "./route/Cart.route.js";
import paymentRouter from "./route/Payment.route.js";
import consultationRouter from "./route/Consultation.route.js";
import siteContentRouter from "./route/Sitecontent.route.js"
import testimonialRouter from "./route/Testimonial.route.js"
import notificationRouter from "./route/Notification.route.js"
import dashboardRouter from "./route/Dashboard.route.js";
import serviceRouter from "./route/Service.route.js"
import projectRouter from "./route/Project.route.js"
import settingsRouter from "./route/Settings.route.js"

const app = express();
const PORT = process.env.PORT || 5000;
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "https://liliums-glee.vercel.app",
  process.env.CLIENT_URL,
].filter(Boolean);

// Railway/Render sit behind a reverse proxy — this tells Express to trust
// the X-Forwarded-For header so express-rate-limit can correctly identify
// real client IPs instead of throwing the ERR_ERL_UNEXPECTED_X_FORWARDED_FOR warning
app.set("trust proxy", 1);
app.disable("x-powered-by");

app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  res.setHeader("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'; base-uri 'none'");

  if (process.env.NODE_ENV === "production") {
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }

  next();
});

// =========================
// Middleware
// =========================

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);

app.use(cookieParser());

// Paystack webhook MUST come before express.json()
app.use(
  "/api/payment/webhook",
  express.raw({ type: "application/json" })
);

app.use(express.json({ limit: "100kb" }));
app.use("/api", apiLimiter);

// =========================
// Routes
// =========================

app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Liliums API is running 🚀",
  });
});

app.use("/api/user", userRouter);
app.use("/api/products", productRouter);
app.use("/api/order", orderRouter);
app.use("/api/cart", cartRouter);
app.use("/api/payment", paymentRouter);
app.use("/api/consultation", consultationRouter);
app.use("/api/site-content", siteContentRouter);
app.use("/api/testimonial", testimonialRouter);
app.use("/api/notification", notificationRouter);
app.use("/api/admin", dashboardRouter);
app.use("/api/service", serviceRouter);
app.use("/api/project", projectRouter);
app.use("/api/settings", settingsRouter);

// =========================
// 404 (no path — avoids Express 5 / path-to-regexp "*" bug)
// =========================

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

// =========================
// Error Handler
// =========================

app.use((err, req, res, next) => {
  console.error(err);

  res.status(500).json({
    success: false,
    message: "Internal Server Error",
  });
});

// =========================
// MongoDB + Server
// =========================

async function startServer() {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error("MONGODB_URI is missing.");
    }

    await mongoose.connect(process.env.MONGODB_URI);

    console.log("✅ MongoDB Connected");

    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });

  } catch (error) {
    console.error("❌ Failed to start server");
    console.error(error);
    process.exit(1);
  }
}

startServer();

// =========================
// Handle unexpected errors
// =========================

process.on("unhandledRejection", (err) => {
  console.error("Unhandled Rejection:", err);
});

process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
});
