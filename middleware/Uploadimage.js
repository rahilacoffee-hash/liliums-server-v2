import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import cloudinary from "../config/cloudinary.js";

// Reusable uploader factory - same pattern as your existing products
// upload.js, just parameterized by folder so every content area gets
// its own tidy space in Cloudinary instead of dumping everything into
// liliumsglee/products.
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

export default createUploader;