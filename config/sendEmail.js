import axios from "axios";

export async function sendEmail({ sendTo, subject, text, html }) {
  try {
    const response = await axios.post(
      "https://api.brevo.com/v3/smtp/email",
      {
        sender: {
          name: "Lilium's Glee",
          email: process.env.EMAIL_FROM,
        },
        to: [
          {
            email: sendTo,
          },
        ],
        subject,
        htmlContent: html,
        textContent: text,
      },
      {
        headers: {
          "api-key": process.env.BREVO_API_KEY,
          "Content-Type": "application/json",
        },
      }
    );

    console.log("✅ Email sent:", response.data);

    return {
      success: true,
    };
  } catch (error) {
    console.error(
      "❌ Brevo API Error:",
      error.response?.data || error.message
    );

    return {
      success: false,
      error: error.response?.data || error.message,
    };
  }
}

export default sendEmail;