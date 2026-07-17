import SettingsModel from "../models/Settings.model.js";
import { sendResponse } from "../utils/Sendresponse.js";

function logError(context, error) {
  console.error(`[${context}]`, error);
}

// Since this is a singleton, always fetch (or lazily create) the one document
async function getOrCreateSettings() {
  let settings = await SettingsModel.findOne();

  if (!settings) {
    settings = await SettingsModel.create({});
  }

  return settings;
}

// GET SETTINGS (public - the site needs this for things like the consultation fee)
export async function getSettings(req, res) {
  try {
    const settings = await getOrCreateSettings();
    return sendResponse(res, 200, true, "Settings fetched", settings);
  } catch (error) {
    logError("getSettings", error);
    return sendResponse(res, 500, false, "Internal server error");
  }
}

// UPDATE SETTINGS (admin only)
export async function updateSettings(req, res) {
  try {
    const {
      siteName, consultationFee, supportEmail, supportPhone,
      address, instagram, facebook, twitter, whatsapp,
    } = req.body;

    if (consultationFee !== undefined && (isNaN(consultationFee) || Number(consultationFee) < 0)) {
      return sendResponse(res, 400, false, "Consultation fee must be a valid positive number");
    }

    let settings = await getOrCreateSettings();

    if (siteName !== undefined) settings.siteName = siteName;
    if (req.file?.path) {
      settings.logo = req.file.path;
    } else if (req.body.logo !== undefined) {
      settings.logo = req.body.logo;
    }
    if (consultationFee !== undefined) settings.consultationFee = Number(consultationFee);
    if (supportEmail !== undefined) settings.supportEmail = supportEmail;
    if (supportPhone !== undefined) settings.supportPhone = supportPhone;
    if (address !== undefined) settings.address = address;
    if (instagram !== undefined) settings.instagram = instagram;
    if (facebook !== undefined) settings.facebook = facebook;
    if (twitter !== undefined) settings.twitter = twitter;
    if (whatsapp !== undefined) settings.whatsapp = whatsapp;

    await settings.save();

    return sendResponse(res, 200, true, "Settings updated", settings);
  } catch (error) {
    logError("updateSettings", error);
    return sendResponse(res, 500, false, "Internal server error");
  }
}