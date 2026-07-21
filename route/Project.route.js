import { Router } from "express";
import auth from "../middleware/auth.js";
import adminOnly from "../middleware/adminOnly.js";
import { uploadProjectImage } from "../middleware/Uploadimage.js";
import { getAllProjects, createProject, updateProject, deleteProject } from "../controllers/Project.controller.js";

const router = Router();

router.get("/", getAllProjects);

router.post("/", auth, adminOnly, uploadProjectImage.single("image"), createProject);
router.put("/:id", auth, adminOnly, uploadProjectImage.single("image"), updateProject);
router.delete("/:id", auth, adminOnly, deleteProject);

export default router;