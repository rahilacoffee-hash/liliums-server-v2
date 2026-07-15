import ConsultationModel from "../models/Consultation.model.js";
import sendEmail from "../config/sendEmail.js";
import { consultationReceivedTemplate, consultationReplyTemplate } from "../utils/Consultationemailtemplates.js";
import { sendResponse } from "../utils/Sendresponse.js";

function logError(context, error) {
  console.error(`[${context}]`, error);
}

// CREATE CONSULTATION (public - from the Contact page form)
export async function createConsultation(req, res) {
  try {
    const {
      fullName, email, phone, projectType, service,
      budget, preferredDate, preferredTime, message,
    } = req.body;

    if (!fullName || !email || !phone || !projectType || !service || !message) {
      return sendResponse(res, 400, false, "Provide all required fields");
    }

    const consultation = await ConsultationModel.create({
      fullName, email, phone, projectType, service,
      budget, preferredDate, preferredTime, message,
    });

    const emailResult = await sendEmail({
      sendTo: email,
      subject: "We've received your consultation request",
      text: `Hi ${fullName}, we've received your request and will be in touch within 24 hours.`,
      html: consultationReceivedTemplate(fullName),
    });

    if (!emailResult.success) {
      logError("createConsultation - sendEmail", emailResult.error);
      // don't fail the request just because the acknowledgment email failed
    }

    return sendResponse(res, 201, true, "Consultation request submitted", consultation);
  } catch (error) {
    logError("createConsultation", error);
    return sendResponse(res, 500, false, "Internal server error");
  }
}

// GET ALL CONSULTATIONS (admin only)
export async function getAllConsultations(req, res) {
  try {
    const { status, search, page = 1, limit = 20 } = req.query;

    let filter = {};
    if (status && status !== "All") filter.status = status;

    if (search) {
      filter.$or = [
        { fullName: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    let skip = (Number(page) - 1) * Number(limit);

    const [consultations, total] = await Promise.all([
      ConsultationModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
      ConsultationModel.countDocuments(filter),
    ]);

    return sendResponse(res, 200, true, "Consultations fetched", {
      consultations,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / Number(limit)),
    });
  } catch (error) {
    logError("getAllConsultations", error);
    return sendResponse(res, 500, false, "Internal server error");
  }
}

// GET SINGLE CONSULTATION (admin only)
export async function getConsultationById(req, res) {
  try {
    const { id } = req.params;
    const consultation = await ConsultationModel.findById(id);

    if (!consultation) {
      return sendResponse(res, 404, false, "Consultation not found");
    }

    return sendResponse(res, 200, true, "Consultation fetched", consultation);
  } catch (error) {
    logError("getConsultationById", error);
    return sendResponse(res, 500, false, "Internal server error");
  }
}

// REPLY TO CONSULTATION (admin only) - emails the customer and stores the reply
export async function replyToConsultation(req, res) {
  try {
    const { id } = req.params;
    const { reply } = req.body;

    if (!reply || !reply.trim()) {
      return sendResponse(res, 400, false, "Reply message cannot be empty");
    }

    const consultation = await ConsultationModel.findById(id);
    if (!consultation) {
      return sendResponse(res, 404, false, "Consultation not found");
    }

    const emailResult = await sendEmail({
      sendTo: consultation.email,
      subject: "Response to your consultation request - Lilium's Glee",
      text: reply,
      html: consultationReplyTemplate(consultation.fullName, reply),
    });

    if (!emailResult.success) {
      logError("replyToConsultation - sendEmail", emailResult.error);
      return sendResponse(res, 502, false, "Reply saved but the email failed to send. Please try again.");
    }

    consultation.reply = reply;
    consultation.repliedAt = new Date();
    consultation.status = "Contacted";
    await consultation.save();

    return sendResponse(res, 200, true, "Reply sent", consultation);
  } catch (error) {
    logError("replyToConsultation", error);
    return sendResponse(res, 500, false, "Internal server error");
  }
}

// UPDATE STATUS (admin only) - e.g. marking as Completed once the project is booked
export async function updateConsultationStatus(req, res) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ["Pending", "Contacted", "Completed"];
    if (!validStatuses.includes(status)) {
      return sendResponse(res, 400, false, "Invalid status value");
    }

    const consultation = await ConsultationModel.findByIdAndUpdate(id, { status }, { new: true });
    if (!consultation) {
      return sendResponse(res, 404, false, "Consultation not found");
    }

    return sendResponse(res, 200, true, "Status updated", consultation);
  } catch (error) {
    logError("updateConsultationStatus", error);
    return sendResponse(res, 500, false, "Internal server error");
  }
}

// DELETE CONSULTATION (admin only)
export async function deleteConsultation(req, res) {
  try {
    const { id } = req.params;
    const consultation = await ConsultationModel.findByIdAndDelete(id);

    if (!consultation) {
      return sendResponse(res, 404, false, "Consultation not found");
    }

    return sendResponse(res, 200, true, "Consultation deleted");
  } catch (error) {
    logError("deleteConsultation", error);
    return sendResponse(res, 500, false, "Internal server error");
  }
}