import CartModel from "../models/Cart.model.js";
import ProductModel from "../models/Product.model.js";
import { sendResponse } from "../utils/Sendresponse.js";

function logError(context, error) {
  console.error(`[${context}]`, error);
}

// ===============================
// ADD TO CART
// POST /api/cart/add
// ===============================
export async function addToCart(req, res) {
  try {
    const { productId, quantity } = req.body;

    if (!productId) {
      return sendResponse(res, 400, false, "Product ID is required");
    }

    const product = await ProductModel.findById(productId);

    if (!product) {
      return sendResponse(res, 404, false, "Product not found");
    }

    if (product.stock < quantity) {
      return sendResponse(res, 400, false, "Insufficient stock");
    }

    let cart = await CartModel.findOne({ user: req.userId });

    if (!cart) {
      cart = await CartModel.create({
        user: req.userId,
        items: [],
      });
    }

    const existingItem = cart.items.find(
      (item) => item.product.toString() === productId
    );

    if (existingItem) {
      existingItem.quantity += quantity;
    } else {
      cart.items.push({
        product: productId,
        quantity,
      });
    }

    await cart.save();

    const populatedCart = await CartModel.findById(cart._id).populate(
      "items.product"
    );

    return sendResponse(
      res,
      200,
      true,
      "Product added to cart",
      populatedCart
    );
  } catch (error) {
    logError("addToCart", error);
    return sendResponse(res, 500, false, "Internal server error");
  }
}

// ===============================
// GET CART
// GET /api/cart
// ===============================
export async function getCart(req, res) {
  try {
    const cart = await CartModel.findOne({
      user: req.userId,
    }).populate("items.product");

    if (!cart) {
      return sendResponse(res, 200, true, "Cart is empty", {
        items: [],
      });
    }

    return sendResponse(res, 200, true, "Cart fetched", cart);
  } catch (error) {
    logError("getCart", error);
    return sendResponse(res, 500, false, "Internal server error");
  }
}

// ===============================
// UPDATE QUANTITY
// PUT /api/cart/update
// ===============================
export async function updateQuantity(req, res) {
  try {
    const { productId, quantity } = req.body;

    const cart = await CartModel.findOne({
      user: req.userId,
    });

    if (!cart) {
      return sendResponse(res, 404, false, "Cart not found");
    }

    const item = cart.items.find(
      (item) => item.product.toString() === productId
    );

    if (!item) {
      return sendResponse(res, 404, false, "Item not found");
    }

    if (quantity <= 0) {
      cart.items = cart.items.filter(
        (item) => item.product.toString() !== productId
      );
    } else {
      item.quantity = quantity;
    }

    await cart.save();

    const updatedCart = await CartModel.findById(cart._id).populate(
      "items.product"
    );

    return sendResponse(
      res,
      200,
      true,
      "Cart updated",
      updatedCart
    );
  } catch (error) {
    logError("updateQuantity", error);
    return sendResponse(res, 500, false, "Internal server error");
  }
}

// ===============================
// REMOVE ITEM
// DELETE /api/cart/remove/:productId
// ===============================
export async function removeItem(req, res) {
  try {
    const { productId } = req.params;

    const cart = await CartModel.findOne({
      user: req.userId,
    });

    if (!cart) {
      return sendResponse(res, 404, false, "Cart not found");
    }

    cart.items = cart.items.filter(
      (item) => item.product.toString() !== productId
    );

    await cart.save();

    const updatedCart = await CartModel.findById(cart._id).populate(
      "items.product"
    );

    return sendResponse(
      res,
      200,
      true,
      "Item removed",
      updatedCart
    );
  } catch (error) {
    logError("removeItem", error);
    return sendResponse(res, 500, false, "Internal server error");
  }
}

// ===============================
// CLEAR CART
// DELETE /api/cart/clear
// ===============================
export async function clearCart(req, res) {
  try {
    const cart = await CartModel.findOne({
      user: req.userId,
    });

    if (!cart) {
      return sendResponse(res,404,false,"Cart not found");
    }

    cart.items = [];

    await cart.save();

    return sendResponse(
      res,
      200,
      true,
      "Cart cleared",
      cart
    );
  } catch (error) {
    logError("clearCart", error);
    return sendResponse(res,500,false,"Internal server error");
  }
}