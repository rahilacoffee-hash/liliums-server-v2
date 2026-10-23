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
  if (!value) return fallback;
  try { return JSON.parse(value); } catch { return fallback; }
}

function uploadedImages(files, field = "images") {
  return (files?.[field] || []).map((file) => ({ url: file.path, public_id: file.filename }));
}

function buildColors(rawColors, files) {
  const uploads = uploadedImages(files, "colorImages");
  return (Array.isArray(rawColors) ? rawColors : []).map((color, index) => ({
    name: color.name?.trim(),
    hex: color.hex || "#C8A96A",
    // `uploadIndex` refers to the colorImages upload list, not the visual
    // position of a row in the form. This matters when an admin leaves a
    // colour row without choosing a replacement image.
    image: color.image?.url ? color.image : uploads[color.uploadIndex ?? index],
  })).filter((color) => color.name && color.image?.url);
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
      sizes,
      colors,
    } = req.body;

    if (!name || !category || !description || !price) {
      return sendResponse(
        res,
        400,
        false,
        "Please provide all required fields."
      );
    }

    const galleryImages = uploadedImages(req.files);
    const requestedColors = parseJson(colors, []);
    const parsedColors = buildColors(requestedColors, req.files);
    if (requestedColors.length !== parsedColors.length) {
      return sendResponse(res, 400, false, "Every colour needs a name and an uploaded image.");
    }
    if (galleryImages.length === 0 && parsedColors.length === 0) {
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

    const product = await ProductModel.create({
      name,
      slug,
      category,
      description,
      price,
      comparePrice,
      sku,
      badge,
      images: galleryImages.length ? galleryImages : [parsedColors[0].image],
      sizes: parseJson(sizes, []).map((size) => String(size).trim()).filter(Boolean),
      colors: parsedColors,
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
// GET PRODUCT BY ID (ADMIN)
// ===============================
export async function getProductById(req, res) {
  try {
    const product = await ProductModel.findById(req.params.id);

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

    if (category !== undefined) product.category = category;
    if (description !== undefined) product.description = description;
    if (price !== undefined) product.price = price;
    if (comparePrice !== undefined) product.comparePrice = comparePrice;
    if (sku !== undefined) product.sku = sku;
    if (badge !== undefined) product.badge = badge;
    if (stock !== undefined) product.stock = stock;
    if (status) product.status = status;

    if (isFeatured !== undefined) {
      product.isFeatured = isFeatured === "true";
    }

    // Keep only images that belong to this product and were retained by the
    // admin form, then append newly uploaded images. This makes individual
    // image removal work without deleting the whole gallery on every edit.
    let retainedImages = product.images;
    if (req.body.existingImages !== undefined) {
      let requestedImages = [];
      try {
        requestedImages = JSON.parse(req.body.existingImages);
      } catch {
        return sendResponse(res, 400, false, "Invalid existing images data.");
      }

      const retainedIds = new Set(requestedImages.map((image) => image.public_id).filter(Boolean));
      retainedImages = product.images.filter((image) => retainedIds.has(image.public_id));
    }

    const newImages = uploadedImages(req.files);

    let nextColors;
    if (req.body.colors !== undefined) {
      const requestedColors = parseJson(req.body.colors, []);
      nextColors = buildColors(requestedColors, req.files);
      if (requestedColors.length !== nextColors.length) {
        return sendResponse(res, 400, false, "Every colour needs a name and an image.");
      }
    }

    if ([...retainedImages, ...newImages].length === 0 && !(nextColors || product.colors || []).length) {
      return sendResponse(res, 400, false, "A product must have at least one image.");
    }

    const removedImages = product.images.filter(
      (image) => !retainedImages.some((retained) => retained.public_id === image.public_id)
    );

    await Promise.all(removedImages.map((image) => cloudinary.uploader.destroy(image.public_id)));
    product.images = [...retainedImages, ...newImages];

    if (req.body.sizes !== undefined) product.sizes = parseJson(req.body.sizes, []).map((size) => String(size).trim()).filter(Boolean);
    if (req.body.colors !== undefined) {
      const retainedColorIds = new Set(nextColors.map((color) => color.image?.public_id).filter(Boolean));
      await Promise.all((product.colors || []).filter((color) => color.image?.public_id && !retainedColorIds.has(color.image.public_id)).map((color) => cloudinary.uploader.destroy(color.image.public_id)));
      product.colors = nextColors;
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
    for (const color of product.colors || []) {
      if (color.image?.public_id) await cloudinary.uploader.destroy(color.image.public_id);
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
