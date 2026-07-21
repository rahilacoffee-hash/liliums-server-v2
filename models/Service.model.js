import mongoose from "mongoose"

let serviceSchema = new mongoose.Schema({
  number: {
    type: String,
    required: true // displayed as "01", "02" etc - kept as string for flexible formatting
  },
  title: {
    type: String,
    required: [true, "Provide a title"]
  },
  description: {
    type: String,
    required: [true, "Provide a description"]
  },
  features: {
    type: [String],
    default: []
  },
  image: {
    type: String,
    default: ""
  },
  order: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, { timestamps: true })

serviceSchema.index({ order: 1 })

let ServiceModel = mongoose.model("Service", serviceSchema)
export default ServiceModel