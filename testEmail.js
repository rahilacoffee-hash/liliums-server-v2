import "dotenv/config";
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

async function testEmail() {
  try {
    await transporter.verify();
    console.log("✅ SMTP Connected");

    const info = await transporter.sendMail({
      from: `"Lilium's Glee" <${process.env.EMAIL_USER}>`,
      to: "abrahamfred123@gmail.com",
      subject: "SMTP Test",
      text: "If you received this email, Nodemailer is working correctly.",
    });

    console.log(info);
  } catch (error) {
    console.error(error);
  }
}

testEmail();