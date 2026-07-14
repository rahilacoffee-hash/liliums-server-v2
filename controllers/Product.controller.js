import ProductModel from "../models/Product.model.js";
import cloudinary from "../config/cloudinary.js";
import { sendResponse } from "../utils/Sendresponse.js";

function logError(context, error) {
  console.error(`[${context}]`, error);
}

function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// ===============================
// CREATE PRODUCT
// ===============================
export async function createProduct(req, res) {
  try {
    const {
      name,
      category,
      description,
      price,
      comparePrice,
      sku,
      badge,
      isFeatured,
      stock,
      status,
    } = req.body;

    if (!name || !category || !description || !price) {
      return sendResponse(
        res,
        400,
        false,
        "Please provide all required fields."
      );
    }

    if (!req.files || req.files.length === 0) {
      return sendResponse(
        res,
        400,
        false,
        "Please upload at least one product image."
      );
    }

    let slug = slugify(name);

    const existingSlug = await ProductModel.findOne({ slug });

    if (existingSlug) {
      slug = `${slug}-${Date.now()}`;
    }

    const images = req.files.map((file) => ({
      url: file.path,
      public_id: file.filename,
    }));

    const product = await ProductModel.create({
      name,
      slug,
      category,
      description,
      price,
      comparePrice,
      sku,
      badge,
      images,
      isFeatured: isFeatured === "true",
      stock: stock || 0,
      status: status || "Active",
    });

    return sendResponse(
      res,
      201,
      true,
      "Product created successfully.",
      product
    );
  } catch (error) {
    logError("createProduct", error);

    return sendResponse(
      res,
      500,
      false,
      "Internal server error."
    );
  }
}

// ===============================
// GET ALL PRODUCTS
// ===============================
export async function getAllProducts(req, res) {
  try {
    const {
      category,
      search,
      page = 1,
      limit = 12,
    } = req.query;

    const filter = {};

    if (category && category !== "All") {
      filter.category = category;
    }

    if (search) {
      filter.name = {
        $regex: search,
        $options: "i",
      };
    }

    const skip = (page - 1) * limit;

    const products = await ProductModel.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await ProductModel.countDocuments(filter);

    return sendResponse(
      res,
      200,
      true,
      "Products fetched successfully.",
      {
        products,
        total,
        page: Number(page),
        totalPages: Math.ceil(total / limit),
      }
    );
  } catch (error) {
    logError("getAllProducts", error);

    return sendResponse(
      res,
      500,
      false,
      "Internal server error."
    );
  }
}

// ===============================
// FEATURED PRODUCTS
// ===============================
export async function getFeaturedProducts(req, res) {
  try {
    const products = await ProductModel.find({
      isFeatured: true,
      status: "Active",
    }).limit(6);

    return sendResponse(
      res,
      200,
      true,
      "Featured products fetched.",
      products
    );
  } catch (error) {
    logError("getFeaturedProducts", error);

    return sendResponse(
      res,
      500,
      false,
      "Internal server error."
    );
  }
}

// ===============================
// GET SINGLE PRODUCT
// ===============================
export async function getProductBySlug(req, res) {
  try {
    const { slug } = req.params;

    const product = await ProductModel.findOne({
      slug,
    });

    if (!product) {
      return sendResponse(
        res,
        404,
        false,
        "Product not found."
      );
    }

    return sendResponse(
      res,
      200,
      true,
      "Product fetched.",
      product
    );
  } catch (error) {
    logError("getProductBySlug", error);

    return sendResponse(
      res,
      500,
      false,
      "Internal server error."
    );
  }
}

// ===============================
// UPDATE PRODUCT
// ===============================
export async function updateProduct(req, res) {
  try {
    const { id } = req.params;

    const product = await ProductModel.findById(id);

    if (!product) {
      return sendResponse(
        res,
        404,
        false,
        "Product not found."
      );
    }

    const {
      name,
      category,
      description,
      price,
      comparePrice,
      sku,
      badge,
      stock,
      isFeatured,
      status,
    } = req.body;

    if (name && name !== product.name) {
      let slug = slugify(name);

      const existing = await ProductModel.findOne({
        slug,
        _id: { $ne: id },
      });

      product.slug = existing
        ? `${slug}-${Date.now()}`
        : slug;

      product.name = name;
    }

    if (category) product.category = category;
    if (description) product.description = description;
    if (price) product.price = price;
    if (comparePrice) product.comparePrice = comparePrice;
    if (sku) product.sku = sku;
    if (badge !== undefined) product.badge = badge;
    if (stock !== undefined) product.stock = stock;
    if (status) product.status = status;

    if (isFeatured !== undefined) {
      product.isFeatured = isFeatured === "true";
    }

    // Replace images
    if (req.files && req.files.length > 0) {
      for (const image of product.images) {
        await cloudinary.uploader.destroy(image.public_id);
      }

      product.images = req.files.map((file) => ({
        url: file.path,
        public_id: file.filename,
      }));
    }

    await product.save();

    return sendResponse(
      res,
      200,
      true,
      "Product updated successfully.",
      product
    );
  } catch (error) {
    logError("updateProduct", error);

    return sendResponse(
      res,
      500,
      false,
      "Internal server error."
    );
  }
}

// ===============================
// DELETE PRODUCT
// ===============================
export async function deleteProduct(req, res) {
  try {
    const { id } = req.params;

    const product = await ProductModel.findById(id);

    if (!product) {
      return sendResponse(
        res,
        404,
        false,
        "Product not found."
      );
    }

    for (const image of product.images) {
      await cloudinary.uploader.destroy(image.public_id);
    }

    await product.deleteOne();

    return sendResponse(
      res,
      200,
      true,
      "Product deleted successfully."
    );
  } catch (error) {
    logError("deleteProduct", error);

    return sendResponse(
      res,
      500,
      false,
      "Internal server error."
    );
  }
}