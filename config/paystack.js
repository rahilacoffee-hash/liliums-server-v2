import axios from "axios"

const paystack = axios.create({
  baseURL: "https://api.paystack.co",
  headers: {
    Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
    "Content-Type": "application/json",
  },
})

export async function initializeTransaction({ email, amountInKobo, metadata, callback_url }) {
  const response = await paystackApi.post("/transaction/initialize", {
    email,
    amount: amountInKobo,
    metadata,
    callback_url,
  })
  return response.data
}

export async function verifyTransaction(reference) {
  const response = await paystackApi.get(`/transaction/verify/${reference}`)
  return response.data
}

export default paystack