import OrderModel from "../models/Order.model.js";
import ProductModel from "../models/Product.model.js";
import UserModel from "../models/user.model.js";
import sendEmail from "../config/sendEmail.js";
import {
  orderConfirmationTemplate,
  orderStatusTemplate,
} from "../utils/orderEmailTemplates.js";
import { sendResponse } from "../utils/Sendresponse.js";

function logError(context, error) {
  console.error(`[${context}]`, error);
}

/* ==========================================================
   CREATE ORDER
========================================================== */

export async function createOrder(req, res) {
  try {
    const {
      items,
      shippingAddress,
      paymentMethod = "Paystack",
      notes = "",
    } = req.body;

    const userId = req.userId;

    if (!items || items.length === 0) {
      return sendResponse(
        res,
        400,
        false,
        "Order must contain at least one item"
      );
    }

    let orderItems = [];
    let totalAmount = 0;

    for (const item of items) {
      const product = await ProductModel.findById(item.product);

      if (!product) {
        return sendResponse(
          res,
          404,
          false,
          `Product not found`
        );
      }

      const quantity = item.quantity || 1;

      if (product.stock < quantity) {
        return sendResponse(
          res,
          400,
          false,
          `${product.name} is out of stock`
        );
      }

      orderItems.push({
        product: product._id,
        name: product.name,
        image:
          product.images?.length > 0
            ? product.images[0].url
            : "",
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
      shippingAddress,
      totalAmount,
      paymentMethod,
      paymentStatus: "Pending",
      status: "Pending",
      notes,
    });

    const user = await UserModel.findById(userId);

    if (user) {
      await sendEmail({
        sendTo: user.email,
        subject: "Order Confirmation",
        html: orderConfirmationTemplate(order, user.name),
      });
    }

    return sendResponse(
      res,
      201,
      true,
      "Order created successfully",
      order
    );
  } catch (error) {
    logError("createOrder", error);
    return sendResponse(
      res,
      500,
      false,
      "Internal server error"
    );
  }
}

/* ==========================================================
   GET MY ORDERS
========================================================== */

export async function getMyOrders(req, res) {
  try {
    const orders = await OrderModel.find({
      user: req.userId,
    })
      .populate("items.product")
      .sort({ createdAt: -1 });

    return sendResponse(
      res,
      200,
      true,
      "Orders fetched",
      orders
    );
  } catch (error) {
    logError("getMyOrders", error);
    return sendResponse(
      res,
      500,
      false,
      "Internal server error"
    );
  }
}

/* ==========================================================
   GET SINGLE ORDER
========================================================== */

export async function getOrderById(req, res) {
  try {
    const { id } = req.params;

    const order = await OrderModel.findById(id)
      .populate("user", "name email")
      .populate("items.product");

    if (!order) {
      return sendResponse(
        res,
        404,
        false,
        "Order not found"
      );
    }

    const user = await UserModel.findById(req.userId);

    const isOwner =
      order.user._id.toString() === req.userId;

    const isAdmin = user?.role === "ADMIN";

    if (!isOwner && !isAdmin) {
      return sendResponse(
        res,
        403,
        false,
        "Unauthorized"
      );
    }

    return sendResponse(
      res,
      200,
      true,
      "Order fetched",
      order
    );
  } catch (error) {
    logError("getOrderById", error);
    return sendResponse(
      res,
      500,
      false,
      "Internal server error"
    );
  }
}

/* ==========================================================
   ADMIN GET ALL ORDERS
========================================================== */

export async function getAllOrders(req, res) {
  try {
    const orders = await OrderModel.find()
      .populate("user", "name email")
      .populate("items.product")
      .sort({ createdAt: -1 });

    return sendResponse(
      res,
      200,
      true,
      "Orders fetched",
      orders
    );
  } catch (error) {
    logError("getAllOrders", error);
    return sendResponse(
      res,
      500,
      false,
      "Internal server error"
    );
  }
}

/* ==========================================================
   UPDATE ORDER STATUS
========================================================== */

export async function updateOrderStatus(req, res) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = [
      "Pending",
      "Confirmed",
      "Processing",
      "Shipped",
      "Delivered",
      "Cancelled",
    ];

    if (!validStatuses.includes(status)) {
      return sendResponse(
        res,
        400,
        false,
        "Invalid status"
      );
    }

    const order = await OrderModel.findById(id)
      .populate("user", "name email");

    if (!order) {
      return sendResponse(
        res,
        404,
        false,
        "Order not found"
      );
    }

    /* Restore stock if cancelled */

    if (
      status === "Cancelled" &&
      order.status !== "Cancelled"
    ) {
      for (const item of order.items) {
        const product = await ProductModel.findById(
          item.product
        );

        if (product) {
          product.stock += item.quantity;
          await product.save();
        }
      }
    }

    order.status = status;
    await order.save();

    if (order.user?.email) {
      await sendEmail({
        sendTo: order.user.email,
        subject: `Order ${status}`,
        html: orderStatusTemplate(
          order,
          order.user.name,
          status
        ),
      });
    }

    return sendResponse(
      res,
      200,
      true,
      "Order updated",
      order
    );
  } catch (error) {
    logError("updateOrderStatus", error);
    return sendResponse(
      res,
      500,
      false,
      "Internal server error"
    );
  }
}

/* ==========================================================
   MARK ORDER PAID (PAYSTACK)
========================================================== */

export async function markOrderPaid(req, res) {
  try {
    const { id } = req.params;
    const { reference } = req.body;

    const order = await OrderModel.findById(id);

    if (!order) {
      return sendResponse(
        res,
        404,
        false,
        "Order not found"
      );
    }

    order.paymentStatus = "Paid";
    order.paymentReference = reference;
    order.status = "Confirmed";

    await order.save();

    return sendResponse(
      res,
      200,
      true,
      "Payment confirmed",
      order
    );
  } catch (error) {
    logError("markOrderPaid", error);
    return sendResponse(
      res,
      500,
      false,
      "Internal server error"
    );
  }
}

/* ==========================================================
   CANCEL MY ORDER
========================================================== */

export async function cancelOrder(req, res) {
  try {
    const { id } = req.params;

    const order = await OrderModel.findById(id);

    if (!order) {
      return sendResponse(
        res,
        404,
        false,
        "Order not found"
      );
    }

    if (order.user.toString() !== req.userId) {
      return sendResponse(
        res,
        403,
        false,
        "Unauthorized"
      );
    }

    if (order.status !== "Pending") {
      return sendResponse(
        res,
        400,
        false,
        "Only pending orders can be cancelled"
      );
    }

    order.status = "Cancelled";

    for (const item of order.items) {
      const product = await ProductModel.findById(
        item.product
      );

      if (product) {
        product.stock += item.quantity;
        await product.save();
      }
    }

    await order.save();

    return sendResponse(
      res,
      200,
      true,
      "Order cancelled",
      order
    );
  } catch (error) {
    logError("cancelOrder", error);
    return sendResponse(
      res,
      500,
      false,
      "Internal server error"
    );
  }
}