function formatCurrency(amount) {
  return `₦${Number(amount).toLocaleString()}`
}

function itemsRows(items) {
  return items
    .map(
      (item) => `
    <tr>
      <td style="padding: 10px 0; color: #F3ECE9; font-size: 14px;">${item.name}</td>
      <td style="padding: 10px 0; color: #C6B8A8; font-size: 14px; text-align: center;">x${item.quantity}</td>
      <td style="padding: 10px 0; color: #F3ECE9; font-size: 14px; text-align: right;">${formatCurrency(item.price * item.quantity)}</td>
    </tr>`
    )
    .join("")
}

// Sent the moment an order is successfully placed
export function orderConfirmationTemplate(order, userName) {
  return `
  <div style="font-family: 'Georgia', serif; background-color: #F3ECE9; padding: 40px 20px;">
    <div style="max-width: 520px; margin: 0 auto; background-color: #1c1712; border-radius: 12px; padding: 40px 32px; border: 1px solid rgba(201,164,107,0.25);">

      <h1 style="font-style: italic; color: #F3ECE9; font-size: 24px; margin: 0 0 20px 0;">
        Lilium's Glee
      </h1>

      <p style="color: #C6B8A8; font-size: 15px; line-height: 1.6; margin: 0 0 8px 0;">
        Hi ${userName}, thank you for your order! Here's a summary:
      </p>

      <p style="color: #C9A46B; font-size: 13px; letter-spacing: 1px; margin: 0 0 24px 0;">
        ORDER #${order._id.toString().slice(-8).toUpperCase()}
      </p>

      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
        <thead>
          <tr style="border-bottom: 1px solid rgba(201,164,107,0.25);">
            <th style="text-align: left; padding-bottom: 8px; color: #C6B8A8; font-size: 12px; text-transform: uppercase;">Item</th>
            <th style="text-align: center; padding-bottom: 8px; color: #C6B8A8; font-size: 12px; text-transform: uppercase;">Qty</th>
            <th style="text-align: right; padding-bottom: 8px; color: #C6B8A8; font-size: 12px; text-transform: uppercase;">Price</th>
          </tr>
        </thead>
        <tbody>
          ${itemsRows(order.items)}
        </tbody>
      </table>

      <div style="border-top: 1px solid rgba(201,164,107,0.25); padding-top: 16px; display: flex; justify-content: space-between;">
        <table style="width: 100%;">
          <tr>
            <td style="color: #F3ECE9; font-size: 16px; font-weight: bold;">Total</td>
            <td style="color: #C9A46B; font-size: 18px; font-weight: bold; text-align: right;">${formatCurrency(order.totalAmount)}</td>
          </tr>
        </table>
      </div>

      ${order.shippingAddress ? `
      <p style="color: #C6B8A8; font-size: 13px; line-height: 1.6; margin: 20px 0 0 0;">
        Shipping to: ${order.shippingAddress}
      </p>` : ""}

      <p style="color: #C6B8A8; font-size: 13px; line-height: 1.6; margin: 24px 0 0 0;">
        We'll email you again as soon as your order status changes.
      </p>
    </div>
  </div>
  `
}

// Sent whenever an admin updates the order's status
export function orderStatusTemplate(order, userName, status) {
  let statusCopy = {
    Confirmed: {
      heading: "Your order has been confirmed",
      body: "We've confirmed your order and we're getting it ready.",
    },
    Shipped: {
      heading: "Your order is on its way",
      body: "Your order has shipped and is on its way to you.",
    },
    Delivered: {
      heading: "Your order has been delivered",
      body: "Your order has been marked as delivered. We hope you love it!",
    },
    Cancelled: {
      heading: "Your order has been cancelled",
      body: "Your order has been cancelled. If this wasn't expected, please reach out to us.",
    },
  }[status] || { heading: "Order update", body: `Your order status is now: ${status}` }

  return `
  <div style="font-family: 'Georgia', serif; background-color: #F3ECE9; padding: 40px 20px;">
    <div style="max-width: 480px; margin: 0 auto; background-color: #1c1712; border-radius: 12px; padding: 40px 32px; border: 1px solid rgba(201,164,107,0.25);">

      <h1 style="font-style: italic; color: #F3ECE9; font-size: 24px; margin: 0 0 24px 0;">
        Lilium's Glee
      </h1>

      <p style="color: #C9A46B; font-size: 13px; letter-spacing: 1px; margin: 0 0 12px 0;">
        ORDER #${order._id.toString().slice(-8).toUpperCase()}
      </p>

      <h2 style="color: #F3ECE9; font-size: 20px; margin: 0 0 12px 0;">
        ${statusCopy.heading}
      </h2>

      <p style="color: #C6B8A8; font-size: 15px; line-height: 1.6; margin: 0;">
        Hi ${userName}, ${statusCopy.body}
      </p>
    </div>
  </div>
  `
}