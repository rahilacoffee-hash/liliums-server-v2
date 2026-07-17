import TestimonialModel from "../models/Testimonial.model.js";
import { sendResponse } from "../utils/Sendresponse.js";

function logError(context, error) {
  console.error(`[${context}]`, error);
}

// GET ALL TESTIMONIALS (public - the homepage slider needs this)
export async function getAllTestimonials(req, res) {
  try {
    const { featuredOnly } = req.query;

    let filter = {};
    if (featuredOnly === "true") filter.isFeatured = true;

    const testimonials = await TestimonialModel.find(filter).sort({ order: 1, createdAt: -1 });
    return sendResponse(res, 200, true, "Testimonials fetched", testimonials);
  } catch (error) {
    logError("getAllTestimonials", error);
    return sendResponse(res, 500, false, "Internal server error");
  }
}

// CREATE TESTIMONIAL (admin only)
export async function createTestimonial(req, res) {
  try {
    const { name, role, quote, rating, project, isFeatured, order } = req.body;

    if (!name || !quote) {
      return sendResponse(res, 400, false, "Name and quote are required");
    }

    // uploaded file takes priority; falls back to a plain URL string in
    // the body if the frontend didn't send a file (e.g. pasting a URL)
    const avatar = req.file?.path || req.body.avatar || "";

    const testimonial = await TestimonialModel.create({
      name, role, quote, avatar, project,
      rating: rating ?? 5,
      isFeatured: isFeatured ?? true,
      order: order ?? 0,
    });

    return sendResponse(res, 201, true, "Testimonial created", testimonial);
  } catch (error) {
    logError("createTestimonial", error);
    return sendResponse(res, 500, false, "Internal server error");
  }
}

// UPDATE TESTIMONIAL (admin only)
export async function updateTestimonial(req, res) {
  try {
    const { id } = req.params;
    const { name, role, quote, rating, project, isFeatured, order } = req.body;

    const testimonial = await TestimonialModel.findById(id);
    if (!testimonial) {
      return sendResponse(res, 404, false, "Testimonial not found");
    }

    if (name !== undefined) testimonial.name = name;
    if (role !== undefined) testimonial.role = role;
    if (quote !== undefined) testimonial.quote = quote;
    if (rating !== undefined) testimonial.rating = rating;
    if (project !== undefined) testimonial.project = project;
    if (isFeatured !== undefined) testimonial.isFeatured = isFeatured;
    if (order !== undefined) testimonial.order = order;

    if (req.file?.path) {
      testimonial.avatar = req.file.path;
    } else if (req.body.avatar !== undefined) {
      testimonial.avatar = req.body.avatar;
    }

    await testimonial.save();

    return sendResponse(res, 200, true, "Testimonial updated", testimonial);
  } catch (error) {
    logError("updateTestimonial", error);
    return sendResponse(res, 500, false, "Internal server error");
  }
}

// DELETE TESTIMONIAL (admin only)
export async function deleteTestimonial(req, res) {
  try {
    const { id } = req.params;
    const testimonial = await TestimonialModel.findByIdAndDelete(id);

    if (!testimonial) {
      return sendResponse(res, 404, false, "Testimonial not found");
    }

    return sendResponse(res, 200, true, "Testimonial deleted");
  } catch (error) {
    logError("deleteTestimonial", error);
    return sendResponse(res, 500, false, "Internal server error");
  }
}