import "dotenv/config";
import mongoose from "mongoose";
import ProductModel from "../models/Product.model.js";

async function ensureProductIndexes() {
  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI is missing.");
  }

  await mongoose.connect(process.env.MONGODB_URI, {
    family: 4,
    autoIndex: false,
    serverSelectionTimeoutMS: 15000,
    connectTimeoutMS: 10000,
  });

  // createIndexes is idempotent. Run this once during a low-traffic deployment
  // window; Atlas performs index builds without taking the collection offline.
  await ProductModel.createIndexes();
  console.log("Product indexes are present.");
}

ensureProductIndexes()
  .catch((error) => {
    console.error("Could not ensure product indexes:", error.message);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
