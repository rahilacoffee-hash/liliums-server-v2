
import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const connectDB = async ({
  retries = 5,
  initialDelay = 2000,
} = {}) => {
  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI is missing from environment variables");
  }

  // Reuse an existing connection if one is already established.
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  let attempt = 0;
  let delay = initialDelay;

  while (attempt < retries) {
    attempt += 1;

    try {
      await mongoose.connect(process.env.MONGODB_URI, {
        // Connection pool: tune after measuring real workload.
        maxPoolSize: 20,
        minPoolSize: 2,
        maxIdleTimeMS: 30000,
        waitQueueTimeoutMS: 10000,

        // Connection and server selection timeouts.
        serverSelectionTimeoutMS: 10000,
        connectTimeoutMS: 10000,
      });

      console.log("MongoDB connected successfully");

      mongoose.connection.on("error", (error) => {
        console.error("MongoDB connection error:", error.message);
      });

      mongoose.connection.on("disconnected", () => {
        console.warn("MongoDB disconnected");
      });

      return mongoose.connection;
    } catch (error) {
      console.error(
        `MongoDB connection attempt ${attempt}/${retries} failed:`,
        error.message,
      );

      if (attempt >= retries) {
        console.error("Could not connect to MongoDB after all retries.");
        throw error;
      }

      console.log(`Retrying MongoDB connection in ${delay}ms...`);
      await wait(delay);

      // Exponential backoff, capped at 30 seconds.
      delay = Math.min(delay * 2, 30000);
    }
  }
};

export default connectDB;
