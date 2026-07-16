import axios from "axios";

const paystack = axios.create({
  baseURL: "https://api.paystack.co",
  headers: {
    Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
    "Content-Type": "application/json",
  },
  timeout: 30000,
});

export async function initializeTransaction({
  email,
  amountInKobo,
  metadata,
  callback_url,
}) {
  const response = await paystack.post("/transaction/initialize", {
    email,
    amount: amountInKobo,
    metadata,
    callback_url,
  });

  return response.data;
}

export async function verifyTransaction(reference) {
  const response = await paystack.get(
    `/transaction/verify/${reference}`
  );

  return response.data;
}

export default paystack;