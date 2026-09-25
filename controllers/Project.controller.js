import ProjectModel from "../models/Project.model.js";
import { sendResponse } from "../utils/Sendresponse.js";

function logError(context, error) {
  console.error(`[${context}]`, error);
}

function slugify(value = "") {
  return value
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function makeUniqueSlug(value, excludeId = null) {
  const baseSlug = slugify(value) || "project";
  let slug = baseSlug;
  let suffix = 2;

  while (await ProjectModel.exists({ slug, ...(excludeId ? { _id: { $ne: excludeId } } : {}) })) {
    slug = `${baseSlug}-${suffix}`;
    suffix += 1;
  }

  return slug;
}

async function populateMissingSlugs(projects) {
  await Promise.all(projects.map(async (project) => {
    if (project.slug) return;
    project.slug = await makeUniqueSlug(project.title, project._id);
    await project.save();
  }));
}

function parseList(value, fallback = []) {
  if (Array.isArray(value)) return value;
  if (!value) return fallback;

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

// GET ALL PROJECTS (public - supports featuredOnly for the homepage slider)
export async function getAllProjects(req, res) {
  try {
    const { featuredOnly } = req.query;

    let filter = {};
    if (featuredOnly === "true") filter.isFeatured = true;

    const projects = await ProjectModel.find(filter).sort({ order: 1, createdAt: -1 });
    await populateMissingSlugs(projects);
    return sendResponse(res, 200, true, "Projects fetched", projects);
  } catch (error) {
    logError("getAllProjects", error);
    return sendResponse(res, 500, false, "Internal server error");
  }
}

// GET ONE PROJECT (public)
export async function getProjectBySlug(req, res) {
  try {
    const slug = slugify(req.params.slug);
    const project = await ProjectModel.findOne({ slug });

    if (!project) {
      return sendResponse(res, 404, false, "Project not found");
    }

    return sendResponse(res, 200, true, "Project fetched", project);
  } catch (error) {
    logError("getProjectBySlug", error);
    return sendResponse(res, 404, false, "Project not found");
  }
}

// CREATE PROJECT (admin only)
export async function createProject(req, res) {
  try {
    const { title, slug, category, location, year, description, storyTitle, designApproach, isFeatured, order } = req.body;

    if (!title || !category) {
      return sendResponse(res, 400, false, "Title and category are required");
    }

    const image = req.file?.path || req.body.image || "";
    const uniqueSlug = await makeUniqueSlug(slug || title);

    const project = await ProjectModel.create({
      title,
      slug: uniqueSlug,
      category,
      location,
      year,
      description,
      storyTitle,
      designApproach,
      highlights: parseList(req.body.highlights).filter(Boolean),
      process: parseList(req.body.process).filter((step) => step?.title || step?.description),
      image,
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
    const { title, slug, category, location, year, description, storyTitle, designApproach, isFeatured, order } = req.body;

    const project = await ProjectModel.findById(id);
    if (!project) {
      return sendResponse(res, 404, false, "Project not found");
    }

    if (title !== undefined) project.title = title;
    if (slug !== undefined || title !== undefined) {
      project.slug = await makeUniqueSlug(slug || title, project._id);
    }
    if (category !== undefined) project.category = category;
    if (location !== undefined) project.location = location;
    if (year !== undefined) project.year = year;
    if (description !== undefined) project.description = description;
    if (storyTitle !== undefined) project.storyTitle = storyTitle;
    if (designApproach !== undefined) project.designApproach = designApproach;
    if (req.body.highlights !== undefined) project.highlights = parseList(req.body.highlights).filter(Boolean);
    if (req.body.process !== undefined) project.process = parseList(req.body.process).filter((step) => step?.title || step?.description);
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
