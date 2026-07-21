import ProjectModel from "../models/Project.model.js";
import { sendResponse } from "../utils/Sendresponse.js";

function logError(context, error) {
  console.error(`[${context}]`, error);
}

// GET ALL PROJECTS (public - supports featuredOnly for the homepage slider)
export async function getAllProjects(req, res) {
  try {
    const { featuredOnly } = req.query;

    let filter = {};
    if (featuredOnly === "true") filter.isFeatured = true;

    const projects = await ProjectModel.find(filter).sort({ order: 1, createdAt: -1 });
    return sendResponse(res, 200, true, "Projects fetched", projects);
  } catch (error) {
    logError("getAllProjects", error);
    return sendResponse(res, 500, false, "Internal server error");
  }
}

// CREATE PROJECT (admin only)
export async function createProject(req, res) {
  try {
    const { title, category, location, year, description, isFeatured, order } = req.body;

    if (!title || !category) {
      return sendResponse(res, 400, false, "Title and category are required");
    }

    const image = req.file?.path || req.body.image || "";

    const project = await ProjectModel.create({
      title, category, location, year, description, image,
      isFeatured: isFeatured ?? true,
      order: order ?? 0,
    });

    return sendResponse(res, 201, true, "Project created", project);
  } catch (error) {
    logError("createProject", error);
    return sendResponse(res, 500, false, "Internal server error");
  }
}

// UPDATE PROJECT (admin only)
export async function updateProject(req, res) {
  try {
    const { id } = req.params;
    const { title, category, location, year, description, isFeatured, order } = req.body;

    const project = await ProjectModel.findById(id);
    if (!project) {
      return sendResponse(res, 404, false, "Project not found");
    }

    if (title !== undefined) project.title = title;
    if (category !== undefined) project.category = category;
    if (location !== undefined) project.location = location;
    if (year !== undefined) project.year = year;
    if (description !== undefined) project.description = description;
    if (isFeatured !== undefined) project.isFeatured = isFeatured;
    if (order !== undefined) project.order = order;

    if (req.file?.path) {
      project.image = req.file.path;
    } else if (req.body.image !== undefined) {
      project.image = req.body.image;
    }

    await project.save();

    return sendResponse(res, 200, true, "Project updated", project);
  } catch (error) {
    logError("updateProject", error);
    return sendResponse(res, 500, false, "Internal server error");
  }
}

// DELETE PROJECT (admin only)
export async function deleteProject(req, res) {
  try {
    const { id } = req.params;
    const project = await ProjectModel.findByIdAndDelete(id);

    if (!project) {
      return sendResponse(res, 404, false, "Project not found");
    }

    return sendResponse(res, 200, true, "Project deleted");
  } catch (error) {
    logError("deleteProject", error);
    return sendResponse(res, 500, false, "Internal server error");
  }
}