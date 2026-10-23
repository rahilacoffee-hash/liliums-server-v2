import axios from "axios";

const EMAIL_TIMEOUT_MS = 15_000;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function emailError(provider, message, details) {
  console.error(`[email:${provider}] ${message}`, details || "");
  return { success: false, provider, error: message };
}

function getMessage(error) {
  return error?.response?.data?.message || error?.response?.data?.code || error?.message || "The email provider rejected the request.";
}

async function sendWithBrevo({ sendTo, subject, text, html }) {
  const apiKey = process.env.BREVO_API_KEY?.trim();
  const from = process.env.EMAIL_FROM?.trim();
  if (!apiKey || !from) return emailError("brevo", "BREVO_API_KEY and EMAIL_FROM must be configured.");

  try {
    const response = await axios.post(
      "https://api.brevo.com/v3/smtp/email",
      {
        sender: { name: process.env.EMAIL_FROM_NAME || "Lilium's Glee", email: from },
        to: [{ email: sendTo }],
        subject,
        ...(html ? { htmlContent: html } : {}),
        ...(text ? { textContent: text } : {}),
      },
      { timeout: EMAIL_TIMEOUT_MS, headers: { "api-key": apiKey, "Content-Type": "application/json" } }
    );
    console.info(`[email:brevo] Delivery accepted: ${response.data?.messageId || "unknown"}`);
    return { success: true, provider: "brevo", messageId: response.data?.messageId };
  } catch (error) {
    return emailError("brevo", getMessage(error), error.response?.data);
  }
}

/** Sends transactional email through Brevo. */
export async function sendEmail({ sendTo, subject, text = "", html = "" }) {
  if (!sendTo || !EMAIL_REGEX.test(sendTo.trim())) return emailError("validation", "A valid recipient email address is required.");
  if (!subject?.trim() || (!text?.trim() && !html?.trim())) return emailError("validation", "An email subject and body are required.");

  const email = { sendTo: sendTo.trim(), subject: subject.trim(), text, html };
  return sendWithBrevo(email);
}

export default sendEmail;
