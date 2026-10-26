
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
import siteContentRouter from "./route/Sitecontent.route.js";
import testimonialRouter from "./route/Testimonial.route.js";
import notificationRouter from "./route/Notification.route.js";
import dashboardRouter from "./route/Dashboard.route.js";
import serviceRouter from "./route/Service.route.js";
import projectRouter from "./route/Project.route.js";
import settingsRouter from "./route/Settings.route.js";

const app = express();
const PORT = Number(process.env.PORT) || 5000;

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "https://liliums-glee.vercel.app",
  process.env.CLIENT_URL,
].filter(Boolean);

app.disable("x-powered-by");

// Configure this for the actual Render proxy topology.
// Verify client IP handling before relying on IP-based limits.
app.set("trust proxy", 1);

/* =========================
   Security headers
========================= */

app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader(
    "Referrer-Policy",
    "strict-origin-when-cross-origin",
  );
  res.setHeader(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()",
  );

  // This API-only CSP may need adjustment if the backend serves pages.
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'none'; frame-ancestors 'none'; base-uri 'none'",
  );

  if (process.env.NODE_ENV === "production") {
    res.setHeader(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains",
    );
  }

  next();
});

/* =========================
   CORS
========================= */

app.use(
  cors({
    origin(origin, callback) {
      // Allow requests without an Origin header, such as
      // server-to-server requests and certain health checks.
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("Origin not allowed by CORS"));
    },
    credentials: true,
  }),
);

/* =========================
   Request parsing
========================= */

app.use(cookieParser());

// Keep the raw body available for Paystack webhook signature verification.
// The webhook controller must validate the signature itself.
app.use(
  "/api/payment/webhook",
  express.raw({ type: "application/json", limit: "1mb" }),
);

app.use(express.json({ limit: "100kb" }));

/* =========================
   Health checks
========================= */

// Process health: no database query required.
app.get("/health/live", (req, res) => {
  res.status(200).json({
    success: true,
    status: "alive",
  });
});

// Readiness: database connection must be established.
app.get("/health/ready", (req, res) => {
  const databaseReady = mongoose.connection.readyState === 1;

  res.status(databaseReady ? 200 : 503).json({
    success: databaseReady,
    status: databaseReady ? "ready" : "not_ready",
    database: databaseReady ? "connected" : "disconnected",
  });
});

/* =========================
   API rate limiting
========================= */

app.use("/api", apiLimiter);

/* =========================
   API routes
========================= */

app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Liliums API is running",
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

/* =========================
   404 handler
========================= */

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

/* =========================
   Error handler
========================= */

app.use((err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  // Log server-side details; do not expose stack traces to clients.
  console.error("Request error:", err);

  if (err.message === "Origin not allowed by CORS") {
    return res.status(403).json({
      success: false,
      message: "Origin not allowed",
    });
  }

  res.status(err.status || 500).json({
    success: false,
    message:
      err.status && err.status < 500
        ? err.message
        : "Internal Server Error",
  });
});

/* =========================
   MongoDB + HTTP server
========================= */

let server;
let isShuttingDown = false;

async function startServer() {
  if (!process.env.MONGODB_URI) {
    console.error("MONGODB_URI is missing.");
    process.exit(1);
  }

  try {
   await mongoose.connect(process.env.MONGODB_URI, {
  family: 4,
  maxPoolSize: 20,
  minPoolSize: 0,
  maxIdleTimeMS: 30000,
  waitQueueTimeoutMS: 10000,
  serverSelectionTimeoutMS: 15000,
  connectTimeoutMS: 10000,
});

    console.log("MongoDB connected successfully");

    server = app.listen(PORT, "0.0.0.0", () => {
      console.log(`Liliums API listening on port ${PORT}`);
    });

    server.on("error", (error) => {
      console.error("HTTP server error:", error);
      shutdown("HTTP server error", 1);
    });
  } catch (error) {
    console.error("Failed to start Liliums API:", error);
    await mongoose.disconnect().catch(() => {});
    process.exit(1);
  }
}

/* =========================
   Graceful shutdown
========================= */

async function shutdown(signal, exitCode = 0) {
  if (isShuttingDown) return;

  isShuttingDown = true;
  console.log(`${signal}: shutting down Liliums API`);

  const forceExitTimer = setTimeout(() => {
    console.error("Shutdown timed out; forcing exit.");
    process.exit(1);
  }, 15000);

  forceExitTimer.unref();

  try {
    if (server) {
      await new Promise((resolve, reject) => {
        server.close((error) => {
          if (error) reject(error);
          else resolve();
        });

        server.closeIdleConnections?.();
      });
    }

    await mongoose.disconnect();
    console.log("HTTP server and MongoDB connection closed.");
    process.exit(exitCode);
  } catch (error) {
    console.error("Shutdown failed:", error);
    process.exit(1);
  }
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

// An unhandled rejection is treated as fatal here to avoid continuing
// in an unknown application state.
process.on("unhandledRejection", (error) => {
  console.error("Unhandled promise rejection:", error);
  shutdown("Unhandled promise rejection", 1);
});

process.on("uncaughtException", (error) => {
  console.error("Uncaught exception:", error);
  shutdown("Uncaught exception", 1);
});

startServer();
