import * as brevo from "@getbrevo/brevo";

const apiInstance = new brevo.TransactionalEmailsApi();

apiInstance.setApiKey(
  brevo.TransactionalEmailsApiApiKeys.apiKey,
  process.env.BREVO_API_KEY
);

export async function sendEmail({ sendTo, subject, text, html }) {
  try {
    await apiInstance.sendTransacEmail({
      sender: {
        email: process.env.EMAIL_FROM,
        name: "Lilium's Glee",
      },
      to: [{ email: sendTo }],
      subject,
      textContent: text,
      htmlContent: html,
    });

    console.log("✅ Email sent");

    return { success: true };
  } catch (error) {
    console.error("❌ Brevo API Error:", error);

    return {
      success: false,
      error,
    };
  }
}

export default sendEmail;