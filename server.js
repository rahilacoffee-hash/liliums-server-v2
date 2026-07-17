import "dotenv/config";
import express from "express";
import mongoose from "mongoose";
import cookieParser from "cookie-parser";
import cors from "cors";

import userRouter from "./route/user.route.js";
import productRouter from "./route/product.route.js";
import orderRouter from "./route/Order.route.js";
import cartRouter from "./route/Cart.route.js";
import paymentRouter from "./route/Payment.route.js";
import consultationRouter from "./route/Consultation.route.js";
import siteContentRouter from "./route/Sitecontent.route.js"
import testimonialRouter from "./route/Testimonial.route.js"


const app = express();
const PORT = process.env.PORT || 5000;

// Railway/Render sit behind a reverse proxy — this tells Express to trust
// the X-Forwarded-For header so express-rate-limit can correctly identify
// real client IPs instead of throwing the ERR_ERL_UNEXPECTED_X_FORWARDED_FOR warning
app.set("trust proxy", 1);

// =========================
// Middleware
// =========================

app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://liliums-glee.vercel.app",
    ],
    credentials: true,
  })
);

app.use(cookieParser());

// Paystack webhook MUST come before express.json()
app.use(
  "/api/payment/webhook",
  express.raw({ type: "application/json" })
);

app.use(express.json());

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