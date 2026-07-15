import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendEmail({ sendTo, subject, text, html }) {
  try {
    const { data, error } = await resend.emails.send({
      from: "Lilium's Glee <onboarding@resend.dev>",
      to: sendTo,
      subject,
      html,
      text,
    });

    if (error) {
      console.error("Email Error:", error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (error) {
    console.error("Email Error:", error);
    return { success: false, error };
  }
}

export default sendEmail;