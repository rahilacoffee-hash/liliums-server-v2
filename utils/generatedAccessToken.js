import jwt from "jsonwebtoken"

async function generatedAccessToken(userId) {
  const token = jwt.sign(
    { id: userId },
    process.env.SECRET_KEY_ACCESS_TOKEN,
    { expiresIn: "15m" }
  )
  return token
}

export default generatedAccessToken