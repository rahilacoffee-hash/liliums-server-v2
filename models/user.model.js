import mongoose from "mongoose"

const savedAddressSchema = new mongoose.Schema({
  label: { type: String, default: "Home", trim: true },
  fullName: { type: String, required: true, trim: true },
  phone: { type: String, required: true, trim: true },
  address: { type: String, required: true, trim: true },
  city: { type: String, required: true, trim: true },
  state: { type: String, required: true, trim: true },
  country: { type: String, default: "Nigeria", trim: true },
}, { _id: true });

let userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Provide name"]
  },
  email: {
    type: String,
    required: [true, "Provide email"],
    unique: true
  },
  password: {
    type: String,
    required: [true, "Provide password"]
  },
  mobile: {
    type: String,
    default: null
  },
  avatar: {
    type: String,
    default: ""
  },
  avatarPublicId: {
    type: String,
    default: ""
  },
  refresh_token: {
    type: String,
    default: ""
  },
  verify_email: {
    type: Boolean,
    default: false
  },
  last_login_date: {
    type: Date,
    default: null
  },
  status: {
    type: String,
    enum: ["Active", "Inactive", "Suspended"],
    default: "Active"
  },
  otp: {
    type: String,
    default: null
  },
  otpExpiry: {
    type: Date,
    default: null
  },
  passwordResetExpires: {
    type: Date,
    default: null
  },
  role: {
    type: String,
    enum: ["ADMIN", "USER"],
    default: "USER"
  },
  savedAddresses: { type: [savedAddressSchema], default: [] }
}, { timestamps: true })

let UserModel = mongoose.model("User", userSchema)
export default UserModel
