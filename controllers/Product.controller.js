
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

function parseJson(value, fallback) {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }

  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function uploadedImages(files, field = "images") {
  return (files?.[field] || []).map((file) => ({
    url: file.path,
    public_id: file.filename,
  }));
}

function buildColors(rawColors, files) {
  const uploads = uploadedImages(files, "colorImages");

  return (Array.isArray(rawColors) ? rawColors : [])
    .map((color) => ({
      name: color.name?.trim(),
      hex: color.hex || "#C8A96A",
      image: color.image?.url
        ? color.image
        : uploads[color.uploadIndex] || undefined,
    }))
    .filter((color) => color.name);
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
      isPreorder,
      preorderDescription,
      preorderDeliveryDays,
      stock,
      status,
      sizes,
      colors,
    } = req.body;

    if (
      !name ||
      !category ||
      !description ||
      price === undefined ||
      price === null ||
      price === ""
    ) {
      return sendResponse(
        res,
        400,
        false,
        "Please provide all required fields."
      );
    }

    const numericPrice = Number(price);

    if (!Number.isFinite(numericPrice) || numericPrice < 0) {
      return sendResponse(res, 400, false, "Please provide a valid price.");
    }

    const galleryImages = uploadedImages(req.files);
    const requestedColors = parseJson(colors, []);
    const requestedSizes = parseJson(sizes, []);

    if (!Array.isArray(requestedColors)) {
      return sendResponse(res, 400, false, "Invalid colours data.");
    }

    if (!Array.isArray(requestedSizes)) {
      return sendResponse(res, 400, false, "Invalid sizes data.");
    }

    const parsedColors = buildColors(requestedColors, req.files);

    if (requestedColors.length !== parsedColors.length) {
      return sendResponse(res, 400, false, "Every colour needs a name.");
    }

    if (galleryImages.length === 0) {
      return sendResponse(
        res,
        400,
        false,
        "Please upload at least one product image."
      );
    }

    let slug = slugify(name);

    const existingSlug = await ProductModel.findOne({ slug }).lean();

    if (existingSlug) {
      slug = `${slug}-${Date.now()}`;
    }

    const product = await ProductModel.create({
      name,
      slug,
      category,
      description,
      price: numericPrice,
      comparePrice,
      sku,
      badge,
      images: galleryImages,
      sizes: requestedSizes
        .map((size) => String(size).trim())
        .filter(Boolean),
      colors: parsedColors,
      isFeatured: isFeatured === "true",
      isPreorder: isPreorder === "true",
      preorderDescription:
        isPreorder === "true" ? preorderDescription || "" : "",
      preorderDeliveryDays:
        isPreorder === "true"
          ? Number(preorderDeliveryDays) || 15
          : 15,
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

    return sendResponse(res, 500, false, "Internal server error.");
  }
}

// ===============================
// GET ALL PRODUCTS
// ===============================


export async function getAllProducts(req, res) {
  const startedAt = performance.now();

  try {
    const { category, search, page = 1, limit = 12 } = req.query;
    const filter = {};

    if (category && category !== "All") {
      filter.category = category;
    }

    if (typeof search === "string" && search.trim()) {
      const safeSearch = search
        .trim()
        .replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

      filter.name = {
        $regex: safeSearch,
        $options: "i",
      };
    }

    const parsedPage = Number.parseInt(page, 10);
    const parsedLimit = Number.parseInt(limit, 10);

    const currentPage = Number.isSafeInteger(parsedPage)
      ? Math.max(1, parsedPage)
      : 1;

    const pageSize = Number.isSafeInteger(parsedLimit)
      ? Math.min(100, Math.max(1, parsedLimit))
      : 12;

    const skip = (currentPage - 1) * pageSize;

    if (!Number.isSafeInteger(skip)) {
      return sendResponse(res, 400, false, "Invalid page number.");
    }

    const queryStartedAt = performance.now();

    const products = await ProductModel.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(pageSize + 1)
      .lean()
      .exec();

    const queryMs = Math.round(
      performance.now() - queryStartedAt
    );

    const hasMore = products.length > pageSize;
    const visibleProducts = hasMore
      ? products.slice(0, pageSize)
      : products;

    console.log("[product-list timing]", {
      totalMs: Math.round(performance.now() - startedAt),
      queryMs,
      returned: visibleProducts.length,
      hasMore,
      page: currentPage,
      limit: pageSize,
      hasSearch: Boolean(
        typeof search === "string" && search.trim()
      ),
      hasCategory: Boolean(category && category !== "All"),
    });

    return sendResponse(
      res,
      200,
      true,
      "Products fetched successfully.",
      {
        products: visibleProducts,
        page: currentPage,
        limit: pageSize,
        hasMore,
      }
    );
  } catch (error) {
    logError("getAllProducts", error);

    return sendResponse(res, 500, false, "Internal server error.");
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
    })
      .sort({ createdAt: -1 })
      .limit(6)
      .lean();

    return sendResponse(
      res,
      200,
      true,
      "Featured products fetched.",
      products
    );
  } catch (error) {
    logError("getFeaturedProducts", error);

    return sendResponse(res, 500, false, "Internal server error.");
  }
}

// ===============================
// GET SINGLE PRODUCT
// ===============================
export async function getProductBySlug(req, res) {
  try {
    const { slug } = req.params;

    const product = await ProductModel.findOne({ slug }).lean();

    if (!product) {
      return sendResponse(res, 404, false, "Product not found.");
    }

    return sendResponse(res, 200, true, "Product fetched.", product);
  } catch (error) {
    logError("getProductBySlug", error);

    return sendResponse(res, 500, false, "Internal server error.");
  }
}

// ===============================
// GET PRODUCT BY ID (ADMIN)
// ===============================
export async function getProductById(req, res) {
  try {
    const product = await ProductModel.findById(req.params.id).lean();

    if (!product) {
      return sendResponse(res, 404, false, "Product not found.");
    }

    return sendResponse(res, 200, true, "Product fetched.", product);
  } catch (error) {
    logError("getProductById", error);

    return sendResponse(res, 400, false, "Invalid product ID.");
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
      return sendResponse(res, 404, false, "Product not found.");
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
      isPreorder,
      preorderDescription,
      preorderDeliveryDays,
      status,
    } = req.body;

    if (name && name !== product.name) {
      let slug = slugify(name);

      const existing = await ProductModel.findOne({
        slug,
        _id: { $ne: id },
      }).lean();

      product.slug = existing ? `${slug}-${Date.now()}` : slug;
      product.name = name;
    }

    if (category !== undefined) product.category = category;
    if (description !== undefined) product.description = description;

    if (price !== undefined) {
      const numericPrice = Number(price);

      if (!Number.isFinite(numericPrice) || numericPrice < 0) {
        return sendResponse(res, 400, false, "Please provide a valid price.");
      }

      product.price = numericPrice;
    }

    if (comparePrice !== undefined) {
      product.comparePrice = comparePrice;
    }

    if (sku !== undefined) product.sku = sku;
    if (badge !== undefined) product.badge = badge;
    if (stock !== undefined) product.stock = stock;
    if (status) product.status = status;

    if (isFeatured !== undefined) {
      product.isFeatured = isFeatured === "true";
    }

    if (isPreorder !== undefined) {
      product.isPreorder = isPreorder === "true";
    }

    if (preorderDescription !== undefined) {
      product.preorderDescription = product.isPreorder
        ? preorderDescription
        : "";
    }

    if (preorderDeliveryDays !== undefined) {
      product.preorderDeliveryDays = product.isPreorder
        ? Number(preorderDeliveryDays) || 15
        : 15;
    }

    let retainedImages = product.images;

    if (req.body.existingImages !== undefined) {
      let requestedImages;

      try {
        requestedImages = JSON.parse(req.body.existingImages);

        if (!Array.isArray(requestedImages)) {
          throw new Error("Expected an array.");
        }
      } catch {
        return sendResponse(
          res,
          400,
          false,
          "Invalid existing images data."
        );
      }

      const retainedIds = new Set(
        requestedImages.map((image) => image.public_id).filter(Boolean)
      );

      retainedImages = product.images.filter((image) =>
        retainedIds.has(image.public_id)
      );
    }

    const newImages = uploadedImages(req.files);

    let nextColors;

    if (req.body.colors !== undefined) {
      const requestedColors = parseJson(req.body.colors, []);

      if (!Array.isArray(requestedColors)) {
        return sendResponse(res, 400, false, "Invalid colours data.");
      }

      nextColors = buildColors(requestedColors, req.files);

      if (requestedColors.length !== nextColors.length) {
        return sendResponse(res, 400, false, "Every colour needs a name.");
      }
    }

    if ([...retainedImages, ...newImages].length === 0) {
      return sendResponse(
        res,
        400,
        false,
        "A product must have at least one image."
      );
    }

    const removedImages = product.images.filter(
      (image) =>
        !retainedImages.some(
          (retained) => retained.public_id === image.public_id
        )
    );

    product.images = [...retainedImages, ...newImages];

    if (req.body.sizes !== undefined) {
      const parsedSizes = parseJson(req.body.sizes, []);

      if (!Array.isArray(parsedSizes)) {
        return sendResponse(res, 400, false, "Invalid sizes data.");
      }

      product.sizes = parsedSizes
        .map((size) => String(size).trim())
        .filter(Boolean);
    }

    let removedColorImages = [];

    if (req.body.colors !== undefined) {
      const retainedColorIds = new Set(
        nextColors.map((color) => color.image?.public_id).filter(Boolean)
      );

      removedColorImages = (product.colors || [])
        .filter(
          (color) =>
            color.image?.public_id &&
            !retainedColorIds.has(color.image.public_id)
        )
        .map((color) => color.image);

      product.colors = nextColors;
    }

    await product.save();

    // Delete Cloudinary assets only after the database update succeeds.
    await Promise.allSettled(
      [...removedImages, ...removedColorImages].map((image) =>
        cloudinary.uploader.destroy(image.public_id)
      )
    );

    return sendResponse(
      res,
      200,
      true,
      "Product updated successfully.",
      product
    );
  } catch (error) {
    logError("updateProduct", error);

    return sendResponse(res, 500, false, "Internal server error.");
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
      return sendResponse(res, 404, false, "Product not found.");
    }

    // Delete the database record before attempting Cloudinary cleanup.
    await product.deleteOne();

    const imagesToDelete = [
      ...(product.images || []),
      ...(product.colors || [])
        .map((color) => color.image)
        .filter((image) => image?.public_id),
    ];

    await Promise.allSettled(
      imagesToDelete.map((image) =>
        cloudinary.uploader.destroy(image.public_id)
      )
    );

    return sendResponse(
      res,
      200,
      true,
      "Product deleted successfully.",
      product
    );
  } catch (error) {
    logError("deleteProduct", error);

    return sendResponse(res, 500, false, "Internal server error.");
  }
}
