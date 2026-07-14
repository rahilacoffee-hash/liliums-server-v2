function verifyEmailTemplate(name, otp) {
  return `
  <div style="font-family: 'Georgia', serif; background-color: #F3ECE9; padding: 40px 20px;">
    <div style="max-width: 480px; margin: 0 auto; background-color: #1c1712; border-radius: 12px; padding: 40px 32px; border: 1px solid rgba(201,164,107,0.25);">
      
      <h1 style="font-style: italic; color: #F3ECE9; font-size: 24px; margin: 0 0 24px 0;">
        Lilium's Glee
      </h1>

      <p style="color: #C6B8A8; font-size: 15px; line-height: 1.6; margin: 0 0 24px 0;">
        Hi ${name}, thanks for signing up. Use the code below to verify your email address.
      </p>

      <div style="background-color: rgba(243,236,233,0.06); border: 1px solid rgba(201,164,107,0.3); border-radius: 8px; padding: 20px; text-align: center; margin-bottom: 24px;">
        <span style="font-size: 32px; letter-spacing: 6px; color: #C9A46B; font-weight: bold;">
          ${otp}
        </span>
      </div>

      <p style="color: #C6B8A8; font-size: 13px; line-height: 1.6; margin: 0;">
        This code expires in 10 minutes. If you didn't request this, you can safely ignore this email.
      </p>
    </div>
  </div>
  `
}

export default verifyEmailTemplate