import dotenv from "dotenv";
dotenv.config();

import sendEmail from "./config/sendEmail.js";

const run = async () => {
  const result = await sendEmail({
    sendTo: "YOUR_RESEND_ACCOUNT_EMAIL@gmail.com",
    subject: "Resend Test",
    html: "<h1>It works! 🎉</h1>",
    text: "It works!",
  });

  console.log(result);
};

run();