// Sent immediately when someone submits the consultation form
export function consultationReceivedTemplate(fullName) {
  return `
  <div style="font-family: 'Georgia', serif; background-color: #F3ECE9; padding: 40px 20px;">
    <div style="max-width: 480px; margin: 0 auto; background-color: #1c1712; border-radius: 12px; padding: 40px 32px; border: 1px solid rgba(201,164,107,0.25);">

      <h1 style="font-style: italic; color: #F3ECE9; font-size: 24px; margin: 0 0 24px 0;">
        Lilium's Glee
      </h1>

      <p style="color: #C6B8A8; font-size: 15px; line-height: 1.6; margin: 0 0 8px 0;">
        Hi ${fullName}, thank you for reaching out!
      </p>

      <p style="color: #C6B8A8; font-size: 15px; line-height: 1.6; margin: 0;">
        We've received your consultation request and one of our design specialists
        will get back to you within 24 hours.
      </p>
    </div>
  </div>
  `
}

// Sent when an admin replies to a consultation request from the dashboard
export function consultationReplyTemplate(fullName, replyMessage) {
  return `
  <div style="font-family: 'Georgia', serif; background-color: #F3ECE9; padding: 40px 20px;">
    <div style="max-width: 520px; margin: 0 auto; background-color: #1c1712; border-radius: 12px; padding: 40px 32px; border: 1px solid rgba(201,164,107,0.25);">

      <h1 style="font-style: italic; color: #F3ECE9; font-size: 24px; margin: 0 0 24px 0;">
        Lilium's Glee
      </h1>

      <p style="color: #C6B8A8; font-size: 15px; line-height: 1.6; margin: 0 0 20px 0;">
        Hi ${fullName}, thanks for your patience. Here's our response to your consultation request:
      </p>

      <div style="background-color: rgba(243,236,233,0.06); border: 1px solid rgba(201,164,107,0.3); border-radius: 8px; padding: 20px; margin-bottom: 20px;">
        <p style="color: #F3ECE9; font-size: 15px; line-height: 1.7; margin: 0; white-space: pre-wrap;">${replyMessage}</p>
      </div>

      <p style="color: #C6B8A8; font-size: 13px; line-height: 1.6; margin: 0;">
        Feel free to reply to this email if you have any further questions.
      </p>
    </div>
  </div>
  `
}