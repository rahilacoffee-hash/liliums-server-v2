
import "dotenv/config";
import mongoose from "mongoose";
import ProductModel from "./models/Product.model.js";

async function timeOperation(label, operation) {
  const started = performance.now();
  await operation();

  console.log(
    `${label}: ${(performance.now() - started).toFixed(2)} ms`
  );
}

function summarizeExplain(explain) {
  const execution = explain.executionStats;
  return {
    winningPlan: explain.queryPlanner.winningPlan.stage,
    nReturned: execution.nReturned,
    totalKeysExamined: execution.totalKeysExamined,
    totalDocsExamined: execution.totalDocsExamined,
    executionTimeMillis: execution.executionTimeMillis,
  };
}

async function diagnoseProducts() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      family: 4,
      autoIndex: false,
      serverSelectionTimeoutMS: 15000,
      connectTimeoutMS: 10000,
    });

    console.log("Connected to MongoDB.");

    // Warm up the connection.
    await mongoose.connection.db.admin().ping();

    const product = await ProductModel.findOne({})
      .select("_id")
      .lean()
      .exec();

    if (!product) {
      console.log("No products found.");
      return;
    }

    console.log("Indexes:", await ProductModel.collection.indexes());
    console.log(
      "Default listing explain:",
      summarizeExplain(
        await ProductModel.find({}).sort({ createdAt: -1 }).limit(13).lean().explain("executionStats")
      )
    );

    const productWithCategory = await ProductModel.findOne({ category: { $exists: true } })
      .select("category")
      .lean()
      .exec();

    if (productWithCategory?.category) {
      console.log(
        "Category listing explain:",
        summarizeExplain(
          await ProductModel.find({ category: productWithCategory.category })
            .sort({ createdAt: -1 })
            .limit(13)
            .lean()
            .explain("executionStats")
        )
      );
    }

    for (let i = 1; i <= 3; i++) {
      console.log(`\nRound ${i}`);

      await timeOperation("Ping", () =>
        mongoose.connection.db.admin().ping()
      );

      await timeOperation("Single product read", () =>
        ProductModel.findById(product._id)
          .select("_id")
          .lean()
          .exec()
      );

      await timeOperation("Product listing", () =>
        ProductModel.find({})
          .sort({ createdAt: -1 })
          .limit(13)
          .lean()
          .exec()
      );
    }
  } catch (error) {
    console.error("Diagnostic failed:", error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect().catch(() => {});
  }
}

diagnoseProducts();
