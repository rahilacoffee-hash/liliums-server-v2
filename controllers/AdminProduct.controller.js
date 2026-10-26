import ProductModel from "../models/Product.model.js";
import { sendResponse } from "../utils/Sendresponse.js";

function logError(context, error) {
  console.error(`[${context}]`, error);
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// ==========================================
// EXACT ADMIN PRODUCT STATISTICS
// ==========================================
export async function getAdminProductStats(req, res) {
  try {
    const [
      totalProducts,
      featuredProducts,
      activeProducts,
      archivedProducts,
      lowStockProducts,
    ] = await Promise.all([
      ProductModel.countDocuments({}),
      ProductModel.countDocuments({ isFeatured: true }),
      ProductModel.countDocuments({ status: "Active" }),
      ProductModel.countDocuments({ status: "Archived" }),
      ProductModel.countDocuments({ stock: { $lte: 5 } }),
    ]);

    return sendResponse(
      res,
      200,
      true,
      "Product statistics fetched successfully.",
      {
        totalProducts,
        featuredProducts,
        activeProducts,
        archivedProducts,
        lowStockProducts,
      }
    );
  } catch (error) {
    logError("getAdminProductStats", error);

    return sendResponse(
      res,
      500,
      false,
      "Failed to fetch product statistics."
    );
  }
}

// ==========================================
// ADMIN PRODUCT LIST WITH SERVER PAGINATION
// ==========================================
export async function getAdminProducts(req, res) {
  try {
    const {
      search = "",
      category = "All",
      status = "All",
      page = "1",
      limit = "10",
    } = req.query;

    const parsedPage = Number.parseInt(page, 10);
    const parsedLimit = Number.parseInt(limit, 10);

    const currentPage =
      Number.isSafeInteger(parsedPage) && parsedPage > 0
        ? parsedPage
        : 1;

    const pageSize =
      Number.isSafeInteger(parsedLimit) && parsedLimit > 0
        ? Math.min(parsedLimit, 100)
        : 10;

    const skip = (currentPage - 1) * pageSize;

    if (!Number.isSafeInteger(skip)) {
      return sendResponse(res, 400, false, "Invalid page number.");
    }

    const filter = {};

    if (category && category !== "All") {
      filter.category = category;
    }

    if (
      status &&
      status !== "All" &&
      ["Active", "Draft", "Archived"].includes(status)
    ) {
      filter.status = status;
    }

    if (typeof search === "string" && search.trim()) {
      filter.name = {
        $regex: escapeRegex(search.trim()),
        $options: "i",
      };
    }

    const [products, total] = await Promise.all([
      ProductModel.find(filter)
        .sort({ createdAt: -1, _id: -1 })
        .skip(skip)
        .limit(pageSize)
        .lean()
        .exec(),
      ProductModel.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(total / pageSize);

    return sendResponse(
      res,
      200,
      true,
      "Admin products fetched successfully.",
      {
        products,
        total,
        page: currentPage,
        limit: pageSize,
        totalPages,
      }
    );
  } catch (error) {
    logError("getAdminProducts", error);

    return sendResponse(
      res,
      500,
      false,
      "Failed to fetch admin products."
    );
  }
}
