import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import cloudinary from "../config/cloudinary.js";

function createUploader(folder) {
  const storage = new CloudinaryStorage({
    cloudinary,
    params: {
      folder: `liliumsglee/${folder}`,
      allowed_formats: ["jpg", "jpeg", "png", "webp"],
    },
  });

  return multer({
    storage,
    limits: {
      fileSize: 5 * 1024 * 1024,
    },
  });
}

export const uploadSiteContentImages = createUploader("site-content");
export const uploadTestimonialAvatar = createUploader("testimonials");
export const uploadLogo = createUploader("branding");
export const uploadServiceImage = createUploader("services");
export const uploadProjectImage = createUploader("projects");

export default createUploader;
