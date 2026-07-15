import OrderModel from "../models/Order.model.js";
import ProductModel from "../models/Product.model.js";
import UserModel from "../models/user.model.js";
import sendEmail from "../config/sendEmail.js";
import { orderConfirmationTemplate, orderStatusTemplate } from "../utils/orderEmailTemplates.js";
import { sendResponse } from "../utils/Sendresponse.js";

function logError(context, error) {
  console.error(`[${context}]`, error);
}

// CREATE ORDER (auth required)
export async function createOrder(req, res) {
  try {
    const { items, shippingAddress } = req.body;
    const userId = req.userId;

    if (!items || !items.length) {
      return sendResponse(res, 400, false, "Order must include at least one item");
    }

    // Snapshot each item's name/price from the current product record,
    // rather than trusting whatever the client sends
    let orderItems = [];
    let totalAmount = 0;

    for (const entry of items) {
      const product = await ProductModel.findById(entry.product);

      if (!product) {
        return sendResponse(res, 404, false, `Product not found: ${entry.product}`);
      }

      const quantity = entry.quantity || 1;

      if (product.stock < quantity) {
        return sendResponse(res, 400, false, `Insufficient stock for ${product.name}`);
      }

      orderItems.push({
        product: product._id,
        name: product.name,
        price: product.price,
        quantity,
      });

      totalAmount += product.price * quantity;

      product.stock -= quantity;
      await product.save();
    }

    const order = await OrderModel.create({
      user: userId,
      items: orderItems,
      totalAmount,
      shippingAddress: shippingAddress || "",
    });

    const user = await UserModel.findById(userId);

    const emailResult = await sendEmail({
      sendTo: user.email,
      subject: "Your Lilium's Glee order has been placed",
      text: `Your order #${order._id.toString().slice(-8).toUpperCase()} has been placed. Total: ₦${totalAmount.toLocaleString()}`,
      html: orderConfirmationTemplate(order, user.name),
    });

    if (!emailResult.success) {
      logError("createOrder - sendEmail", emailResult.error);
      // order itself still succeeded - don't fail the request over the email
    }

    return sendResponse(res, 201, true, "Order placed successfully", order);
  } catch (error) {
    logError("createOrder", error);
    return sendResponse(res, 500, false, "Internal server error");
  }
}

// GET MY ORDERS (auth required)
export async function getMyOrders(req, res) {
  try {
    const orders = await OrderModel.find({ user: req.userId }).sort({ createdAt: -1 });
    return sendResponse(res, 200, true, "Orders fetched", orders);
  } catch (error) {
    logError("getMyOrders", error);
    return sendResponse(res, 500, false, "Internal server error");
  }
}

// GET ORDER BY ID (owner or admin)
export async function getOrderById(req, res) {
  try {
    const { id } = req.params;
    const order = await OrderModel.findById(id).populate("user", "name email");

    if (!order) {
      return sendResponse(res, 404, false, "Order not found");
    }

    const requestingUser = await UserModel.findById(req.userId).select("role");
    const isOwner = order.user._id.toString() === req.userId;
    const isAdmin = requestingUser?.role === "ADMIN";

    if (!isOwner && !isAdmin) {
      return sendResponse(res, 403, false, "Not authorized to view this order");
    }

    return sendResponse(res, 200, true, "Order fetched", order);
  } catch (error) {
    logError("getOrderById", error);
    return sendResponse(res, 500, false, "Internal server error");
  }
}

// GET ALL ORDERS (admin only)
export async function getAllOrders(req, res) {
  try {
    const { status, page = 1, limit = 20 } = req.query;

    let filter = {};
    if (status) filter.status = status;

    let skip = (Number(page) - 1) * Number(limit);

    const [orders, total] = await Promise.all([
      OrderModel.find(filter)
        .populate("user", "name email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      OrderModel.countDocuments(filter),
    ]);

    return sendResponse(res, 200, true, "Orders fetched", {
      orders,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / Number(limit)),
    });
  } catch (error) {
    logError("getAllOrders", error);
    return sendResponse(res, 500, false, "Internal server error");
  }
}

// UPDATE ORDER STATUS (admin only) - emails the customer on Confirmed/Processing/Shipped/Delivered/Cancelled
export async function updateOrderStatus(req, res) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ["Pending", "Confirmed", "Processing", "Shipped", "Delivered", "Cancelled"];
    if (!validStatuses.includes(status)) {
      return sendResponse(res, 400, false, "Invalid status value");
    }

    const order = await OrderModel.findById(id).populate("user", "name email");
    if (!order) {
      return sendResponse(res, 404, false, "Order not found");
    }

    order.status = status;
    await order.save();

    // Only these statuses are worth emailing the customer about
    const notifiableStatuses = ["Confirmed", "Processing", "Shipped", "Delivered", "Cancelled"];

    if (notifiableStatuses.includes(status)) {
      const emailResult = await sendEmail({
        sendTo: order.user.email,
        subject: `Order #${order._id.toString().slice(-8).toUpperCase()} - ${status}`,
        text: `Your order status is now: ${status}`,
        html: orderStatusTemplate(order, order.user.name, status),
      });

      if (!emailResult.success) {
        logError("updateOrderStatus - sendEmail", emailResult.error);
      }
    }

    return sendResponse(res, 200, true, "Order status updated", order);
  } catch (error) {
    logError("updateOrderStatus", error);
    return sendResponse(res, 500, false, "Internal server error");
  }
}