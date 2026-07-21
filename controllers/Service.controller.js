import ServiceModel from "../models/Service.model.js";
import { sendResponse } from "../utils/Sendresponse.js";

function logError(context, error) {
  console.error(`[${context}]`, error);
}

// GET ALL SERVICES (public)
export async function getAllServices(req, res) {
  try {
    const services = await ServiceModel.find({ isActive: true }).sort({ order: 1, createdAt: 1 });
    return sendResponse(res, 200, true, "Services fetched", services);
  } catch (error) {
    logError("getAllServices", error);
    return sendResponse(res, 500, false, "Internal server error");
  }
}

// CREATE SERVICE (admin only)
export async function createService(req, res) {
  try {
    let { number, title, description, features, order } = req.body;

    if (!number || !title || !description) {
      return sendResponse(res, 400, false, "Number, title, and description are required");
    }

    if (typeof features === "string") features = JSON.parse(features);

    const image = req.file?.path || req.body.image || "";

    const service = await ServiceModel.create({
      number, title, description, image,
      features: features || [],
      order: order ?? 0,
    });

    return sendResponse(res, 201, true, "Service created", service);
  } catch (error) {
    logError("createService", error);
    return sendResponse(res, 500, false, "Internal server error");
  }
}

// UPDATE SERVICE (admin only)
export async function updateService(req, res) {
  try {
    const { id } = req.params;
    let { number, title, description, features, order, isActive } = req.body;

    if (typeof features === "string") features = JSON.parse(features);

    const service = await ServiceModel.findById(id);
    if (!service) {
      return sendResponse(res, 404, false, "Service not found");
    }

    if (number !== undefined) service.number = number;
    if (title !== undefined) service.title = title;
    if (description !== undefined) service.description = description;
    if (features !== undefined) service.features = features;
    if (order !== undefined) service.order = order;
    if (isActive !== undefined) service.isActive = isActive;

    if (req.file?.path) {
      service.image = req.file.path;
    } else if (req.body.image !== undefined) {
      service.image = req.body.image;
    }

    await service.save();

    return sendResponse(res, 200, true, "Service updated", service);
  } catch (error) {
    logError("updateService", error);
    return sendResponse(res, 500, false, "Internal server error");
  }
}

// DELETE SERVICE (admin only)
export async function deleteService(req, res) {
  try {
    const { id } = req.params;
    const service = await ServiceModel.findByIdAndDelete(id);

    if (!service) {
      return sendResponse(res, 404, false, "Service not found");
    }

    return sendResponse(res, 200, true, "Service deleted");
  } catch (error) {
    logError("deleteService", error);
    return sendResponse(res, 500, false, "Internal server error");
  }
}