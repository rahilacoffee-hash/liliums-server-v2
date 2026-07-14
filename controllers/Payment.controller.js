import crypto from "crypto";
import paystack from "../config/paystack.js";
import OrderModel from "../models/Order.model.js";
import UserModel from "../models/user.model.js";
import sendEmail from "../config/sendEmail.js";
import { orderConfirmationTemplate } from "../utils/orderEmailTemplates.js";
import { sendResponse } from "../utils/Sendresponse.js";

function logError(context, error) {
  console.error(
    `[${context}]`,
    error.response?.data || error.message
  );
}

/**
 * ==========================================
 * INITIALIZE PAYSTACK PAYMENT
 * ==========================================
 */

export async function initializePayment(req, res) {
  try {
    const { orderId } = req.body;

    if (!orderId) {
      return sendResponse(
        res,
        400,
        false,
        "Order ID is required"
      );
    }

    // Find the order
    const order = await OrderModel
      .findById(orderId)
      .populate("user");

    if (!order) {
      return sendResponse(
        res,
        404,
        false,
        "Order not found"
      );
    }

    // Ensure the order belongs to the logged-in user
    if (order.user._id.toString() !== req.userId) {
      return sendResponse(
        res,
        403,
        false,
        "Unauthorized"
      );
    }

    // Prevent duplicate payments
    if (order.paymentStatus === "Paid") {
      return sendResponse(
        res,
        400,
        false,
        "This order has already been paid."
      );
    }

    // Initialize Paystack
    const response = await paystack.post(
      "/transaction/initialize",
      {
        email: order.user.email,

        amount: order.totalAmount * 100, // Kobo

        callback_url:
          `${process.env.CLIENT_URL}/payment-success`,

        metadata: {
          orderId: order._id.toString(),
          userId: order.user._id.toString(),
        },
      }
    );

    // Save payment reference before redirecting
    order.paymentReference =
      response.data.data.reference;

    await order.save();

    return sendResponse(
      res,
      200,
      true,
      "Payment initialized successfully.",
      response.data.data
    );
  } catch (error) {
    logError("initializePayment", error);

    return sendResponse(
      res,
      500,
      false,
      "Unable to initialize payment."
    );
  }
}/**
 * ==========================================
 * VERIFY PAYSTACK PAYMENT
 * ==========================================
 */

export async function verifyPayment(req, res) {
  try {
    const { reference } = req.params;

    if (!reference) {
      return sendResponse(
        res,
        400,
        false,
        "Payment reference is required"
      );
    }

    // Verify transaction with Paystack
    const response = await paystack.get(
      `/transaction/verify/${reference}`
    );

    const payment = response.data.data;

    if (payment.status !== "success") {
      return sendResponse(
        res,
        400,
        false,
        "Payment was not successful"
      );
    }

    // Find the order using the payment reference
    const order = await OrderModel.findOne({
      paymentReference: reference,
    }).populate("user");

    if (!order) {
      return sendResponse(
        res,
        404,
        false,
        "Order not found"
      );
    }

    // Already verified
    if (order.paymentStatus === "Paid") {
      return sendResponse(
        res,
        200,
        true,
        "Payment already verified",
        order
      );
    }

    // Update payment
    order.paymentStatus = "Paid";
    order.status = "Confirmed";

    await order.save();

    // Send confirmation email
    if (order.user?.email) {
      await sendEmail({
        sendTo: order.user.email,
        subject: "Order Confirmation",
        html: orderConfirmationTemplate(
          order,
          order.user.name
        ),
      });
    }

    return sendResponse(
      res,
      200,
      true,
      "Payment verified successfully",
      order
    );

  } catch (error) {
    logError("verifyPayment", error);

    return sendResponse(
      res,
      500,
      false,
      "Payment verification failed"
    );
  }
}/**
 * ==========================================
 * PAYSTACK WEBHOOK
 * ==========================================
 */

export async function paystackWebhook(req, res) {
  try {
    // Verify Paystack signature
    const hash = crypto
      .createHmac(
        "sha512",
        process.env.PAYSTACK_SECRET_KEY
      )
      .update(JSON.stringify(req.body))
      .digest("hex");

    if (hash !== req.headers["x-paystack-signature"]) {
      return res.sendStatus(401);
    }

    const event = req.body;

    // We only care about successful charges
    if (event.event !== "charge.success") {
      return res.sendStatus(200);
    }

    const payment = event.data;

    const reference = payment.reference;

    // Find order
    const order = await OrderModel.findOne({
      paymentReference: reference,
    });

    if (!order) {
      return res.sendStatus(404);
    }

    // Already processed
    if (order.paymentStatus === "Paid") {
      return res.sendStatus(200);
    }

    // Update stock
    for (const item of order.items) {
      const product = await ProductModel.findById(
        item.product
      );

      if (!product) continue;

      product.stock = Math.max(
        0,
        product.stock - item.quantity
      );

      await product.save();
    }

    // Update order
    order.paymentStatus = "Paid";
    order.status = "Confirmed";

    await order.save();

    // Send email
    const user = await UserModel.findById(order.user);

    if (user) {
      await sendEmail({
        sendTo: user.email,
        subject: "Order Confirmation",
        html: orderConfirmationTemplate(
          order,
          user.name
        ),
      });
    }

    return res.sendStatus(200);

  } catch (error) {
    logError("paystackWebhook", error);
    return res.sendStatus(500);
  }
}