import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export async function sendEmail({ sendTo, subject, html, text }) {
  try {
    const info = await transporter.sendMail({
      from: `"Lilium's Glee" <${process.env.EMAIL_USER}>`,
      to: sendTo,
      subject,
      html,
      text,
    });

    console.log("Email sent:", info.messageId);

    return {
      success: true,
      data: info,
    };
  } catch (error) {
    console.error(error);

    return {
      success: false,
      error,
    };
  }
}

export default sendEmail;