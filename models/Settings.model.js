import mongoose from "mongoose"

let settingsSchema = new mongoose.Schema({
  siteName: {
    type: String,
    default: "Lilium's Glee"
  },
  logo: {
    type: String,
    default: ""
  },
  consultationFee: {
    type: Number,
    default: 500000
  },
  supportEmail: {
    type: String,
    default: ""
  },
  supportPhone: {
    type: String,
    default: ""
  },
  address: {
    type: String,
    default: ""
  },
  instagram: {
    type: String,
    default: ""
  },
  facebook: {
    type: String,
    default: ""
  },
  twitter: {
    type: String,
    default: ""
  },
  whatsapp: {
    type: String,
    default: ""
  }
}, { timestamps: true })

let SettingsModel = mongoose.model("Settings", settingsSchema)
export default SettingsModel