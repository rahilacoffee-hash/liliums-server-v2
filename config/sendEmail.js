import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: Number(process.env.EMAIL_PORT),
  secure: Number(process.env.EMAIL_PORT) === 465,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  family: 4, // force IPv4 — avoids ENETUNREACH on hosts without working IPv6 routing to Gmail
  connectionTimeout: 15000, // 15s instead of default (often too short on slower networks)
  greetingTimeout: 15000,
  socketTimeout: 15000,
});

export async function sendEmail({ sendTo, subject, text, html }) {
  try {
    await transporter.sendMail({
      from: `"Lilium's Glee" <${process.env.EMAIL_USER}>`,
      to: sendTo,
      subject,
      text,
      html,
    });

    return { success: true };
  } catch (error) {
    console.error("Email Error:", error);

    return {
      success: false,
      error,
    };
  }
}

export default sendEmail;