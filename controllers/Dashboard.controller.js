import OrderModel from "../models/Order.model.js";
import ProductModel from "../models/Product.model.js";
import UserModel from "../models/user.model.js";
import ConsultationModel from "../models/Consultation.model.js";

import { sendResponse } from "../utils/Sendresponse.js";

/*
====================================
Dashboard Stats
GET /admin/dashboard
====================================
*/

export async function getDashboard(req, res) {
  try {
    const [
      totalUsers,
      totalProducts,
      totalOrders,
      pendingConsultations,
      paidOrders,
    ] = await Promise.all([
      UserModel.countDocuments(),
      ProductModel.countDocuments(),
      OrderModel.countDocuments(),
      ConsultationModel.countDocuments({
        status: "Pending",
      }),
      OrderModel.find({
        paymentStatus: "Paid",
      }),
    ]);

    const totalRevenue = paidOrders.reduce(
      (sum, order) => sum + order.totalAmount,
      0
    );

    return sendResponse(res, 200, true, "Dashboard loaded", {
      totalRevenue,
      totalOrders,
      totalProducts,
      totalUsers,
      pendingConsultations,
    });
  } catch (error) {
    console.error(error);

    return sendResponse(
      res,
      500,
      false,
      "Failed to load dashboard"
    );
  }
}

/*
====================================
Low Stock Products
GET /admin/low-stock
====================================
*/

export async function getLowStockProducts(req, res) {
  try {
    const products = await ProductModel.find({
      stock: { $lte: 5 },
    }).sort({ stock: 1 });

    return sendResponse(
      res,
      200,
      true,
      "Low stock products",
      products
    );
  } catch (error) {
    console.error(error);

    return sendResponse(
      res,
      500,
      false,
      "Unable to fetch products"
    );
  }
}

/*
====================================
Recent Orders
GET /admin/recent-orders
====================================
*/

export async function getRecentOrders(req, res) {
  try {
    const orders = await OrderModel.find()
      .populate("user", "name")
      .sort({ createdAt: -1 })
      .limit(10);

    const formatted = orders.map((order) => ({
      _id: order._id,
      orderNumber: order._id.toString().slice(-8).toUpperCase(),
      customerName: order.user?.name || "Deleted User",
      createdAt: order.createdAt,
      totalAmount: order.totalAmount,
      status: order.status,
    }));

    return sendResponse(
      res,
      200,
      true,
      "Recent orders",
      formatted
    );
  } catch (error) {
    console.error(error);

    return sendResponse(
      res,
      500,
      false,
      "Unable to fetch recent orders"
    );
  }
}

/*
====================================
Revenue Chart
GET /admin/revenue-chart
====================================
*/

export async function getRevenueChart(req, res) {
  try {
    const orders = await OrderModel.find({
      paymentStatus: "Paid",
    });

    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];

    const revenue = new Array(12).fill(0);

    orders.forEach((order) => {
      const month = new Date(order.createdAt).getMonth();
      revenue[month] += order.totalAmount;
    });

    const chart = months.map((month, index) => ({
      month,
      revenue: revenue[index],
    }));

    return sendResponse(
      res,
      200,
      true,
      "Revenue chart",
      chart
    );
  } catch (error) {
    console.error(error);

    return sendResponse(
      res,
      500,
      false,
      "Unable to load chart"
    );
  }
}