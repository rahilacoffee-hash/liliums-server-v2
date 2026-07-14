import jwt from "jsonwebtoken"

async function generatedRefreshToken(userId) {
  const token = jwt.sign(
    { id: userId },
    process.env.SECRET_KEY_REFRESH_TOKEN,
    { expiresIn: "7d" }
  )
  return token
}

export default generatedRefreshToken