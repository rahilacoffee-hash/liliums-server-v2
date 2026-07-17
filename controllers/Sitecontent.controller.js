import SiteContentModel from "../models/Sitecontent.model.js";
import { sendResponse } from "../utils/Sendresponse.js";

function logError(context, error) {
  console.error(`[${context}]`, error);
}

async function getOrCreateSiteContent() {
  let content = await SiteContentModel.findOne();
  if (!content) {
    content = await SiteContentModel.create({});
  }
  return content;
}

// GET SITE CONTENT (public - the homepage needs this to render)
export async function getSiteContent(req, res) {
  try {
    const content = await getOrCreateSiteContent();
    return sendResponse(res, 200, true, "Site content fetched", content);
  } catch (error) {
    logError("getSiteContent", error);
    return sendResponse(res, 500, false, "Internal server error");
  }
}

// UPDATE SITE CONTENT (admin only)
// Expects multipart/form-data: hero/about/stats sent as JSON strings
// (since regular form fields can't carry nested objects), plus up to
// three optional image files: heroBackgroundImage, heroFeaturedImage, aboutImage
export async function updateSiteContent(req, res) {
  try {
    let { hero, about, stats } = req.body;

    // multipart fields arrive as strings - parse the ones that were sent
    if (typeof hero === "string") hero = JSON.parse(hero);
    if (typeof about === "string") about = JSON.parse(about);
    if (typeof stats === "string") stats = JSON.parse(stats);

    if (stats !== undefined) {
      if (!Array.isArray(stats)) {
        return sendResponse(res, 400, false, "Stats must be an array");
      }
      for (const stat of stats) {
        if (!stat.label || !stat.value) {
          return sendResponse(res, 400, false, "Each stat needs both a label and a value");
        }
      }
    }

    let content = await getOrCreateSiteContent();

    if (hero) {
      let existingHero = content.hero.toObject();
      content.hero = {
        ...existingHero,
        ...hero,
        // preserve nested objects field-by-field rather than letting a
        // partial hero.primaryButton overwrite the whole sub-object
        primaryButton: { ...existingHero.primaryButton, ...(hero.primaryButton || {}) },
        secondaryButton: { ...existingHero.secondaryButton, ...(hero.secondaryButton || {}) },
        featuredCollection: { ...existingHero.featuredCollection, ...(hero.featuredCollection || {}) },
        showcase: hero.showcase ?? existingHero.showcase,
      };
    }

    if (about) {
      content.about = { ...content.about.toObject(), ...about };
    }

    if (stats !== undefined) {
      content.stats = stats;
    }

    // Apply uploaded images on top of whatever was just set above
    if (req.files?.heroBackgroundImage?.[0]) {
      content.hero.backgroundImage = req.files.heroBackgroundImage[0].path;
    }

    if (req.files?.heroFeaturedImage?.[0]) {
      content.hero.featuredCollection.image = req.files.heroFeaturedImage[0].path;
    }

    if (req.files?.aboutImage?.[0]) {
      content.about.image = req.files.aboutImage[0].path;
    }

    await content.save();

    return sendResponse(res, 200, true, "Site content updated", content);
  } catch (error) {
    logError("updateSiteContent", error);
    return sendResponse(res, 500, false, "Internal server error");
  }
}