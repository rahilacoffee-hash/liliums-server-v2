import mongoose from "mongoose"

let consultationSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: [true, "Provide full name"]
  },
  email: {
    type: String,
    required: [true, "Provide email"]
  },
  phone: {
    type: String,
    required: [true, "Provide phone number"]
  },
  projectType: {
    type: String,
    required: [true, "Provide project type"]
  },
    consultationFee: {
    type: Number,
    default: 500000 // ₦500,000
  },
  paymentStatus: {
    type: String,
    enum: ["Unpaid", "Paid", "Failed"],
    default: "Unpaid"
  },
  paystackReference: {
    type: String,
    default: null
  },
  paidAt: {
    type: Date,
    default: null
  },
  service: {
    type: String,
    required: [true, "Provide service needed"]
  },
  budget: {
    type: String,
    default: ""
  },
  preferredDate: {
    type: String,
    default: ""
  },
  preferredTime: {
    type: String,
    default: ""
  },
  message: {
    type: String,
    required: [true, "Tell us about your project"]
  },
  status: {
    type: String,
    enum: ["Pending", "Contacted", "Completed"],
    default: "Pending"
  },
  reply: {
    type: String,
    default: null
  },
  repliedAt: {
    type: Date,
    default: null
  }
}, { timestamps: true })

let ConsultationModel = mongoose.model("Consultation", consultationSchema)
export default ConsultationModel