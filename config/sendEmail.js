import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: parseInt(process.env.EMAIL_PORT, 10) || 587,
  secure: false, // STARTTLS on port 587
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  tls: {
    rejectUnauthorized: false,
  },
});

transporter.verify((error) => {
  if (error) {
    console.error("❌ SMTP Verify Error:", error);
  } else {
    console.log("✅ SMTP Server Ready");
  }
});

export async function sendEmail({ sendTo, subject, text, html }) {
  try {
    const info = await transporter.sendMail({
      from: `"Lilium's Glee" <${process.env.EMAIL_FROM}>`,
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