import UserModel from "../models/user.model.js";
import ProductModel from "../models/Product.model.js";
import OrderModel from "../models/Order.model.js";
import ConsultationModel from "../models/Consultation.model.js";
import TestimonialModel from "../models/Testimonial.model.js";
import ProjectModel from "../models/Product.model.js";

import { sendResponse } from "../utils/Sendresponse.js";

export async function getDashboardStats(req, res) {
  try {
    const [
      totalUsers,
      totalProducts,
      totalOrders,
      totalConsultations,
      totalTestimonials,
      totalProjects,
   
      orders,
      recentOrders,
      recentConsultations,
    ] = await Promise.all([
      UserModel.countDocuments(),
      ProductModel.countDocuments(),
      OrderModel.countDocuments(),
      ConsultationModel.countDocuments(),
      TestimonialModel.countDocuments(),
      ProjectModel.countDocuments(),
    

      OrderModel.find(),

      OrderModel.find()
        .populate("user", "name email")
        .sort({ createdAt: -1 })
        .limit(5),

      ConsultationModel.find()
        .sort({ createdAt: -1 })
        .limit(5),
    ]);

    const revenue = orders.reduce(
      (sum, order) =>
        order.paymentStatus === "Paid"
          ? sum + order.totalAmount
          : sum,
      0
    );

    const pendingOrders = orders.filter(
      (order) => order.status === "Pending"
    ).length;

    const deliveredOrders = orders.filter(
      (order) => order.status === "Delivered"
    ).length;

    const cancelledOrders = orders.filter(
      (order) => order.status === "Cancelled"
    ).length;

    return sendResponse(
      res,
      200,
      true,
      "Dashboard loaded",
      {
        overview: {
          revenue,
          totalUsers,
          totalProducts,
          totalOrders,
          totalConsultations,
          totalTestimonials,
          totalProjects,
         
          pendingOrders,
          deliveredOrders,
          cancelledOrders,
        },

        recentOrders,

        recentConsultations,
      }
    );
  } catch (error) {
    console.log(error);

    return sendResponse(
      res,
      500,
      false,
      "Failed to load dashboard"
    );
  }
}