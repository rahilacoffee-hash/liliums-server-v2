import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || "smtp.gmail.com",
  port: Number(process.env.EMAIL_PORT) || 587,
  secure: false, // Always use STARTTLS on port 587
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  family: 4,
  requireTLS: true,
  connectionTimeout: 30000,
  greetingTimeout: 30000,
  socketTimeout: 30000,
});

transporter.verify((error, success) => {
  if (error) {
    console.error("SMTP Verify Error:", error);
  } else {
    console.log("✅ SMTP Server Ready");
  }
});

export async function sendEmail({ sendTo, subject, text, html }) {
  try {
    const info = await transporter.sendMail({
      from: `"Lilium's Glee" <${process.env.EMAIL_USER}>`,
      to: sendTo,
      subject,
      text,
      html,
    });

    console.log("✅ Email sent:", info.messageId);

    return {
      success: true,
      info,
    };
  } catch (error) {
    console.error("❌ Email Error:", error);

    return {
      success: false,
      error,
    };
  }
}

export default sendEmail;