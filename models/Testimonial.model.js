import mongoose from "mongoose"

let testimonialSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Provide the client's name"]
  },
  role: {
    type: String,
    default: "" // e.g. "Managing Director, BuildWell Nigeria Ltd."
  },
  quote: {
    type: String,
    required: [true, "Provide the testimonial text"]
  },
  avatar: {
    type: String,
    default: ""
  },
  rating: {
    type: Number,
    default: 5,
    min: 1,
    max: 5
  },
  project: {
    type: String,
    default: "" // e.g. "Commercial Complex" badge shown on the card
  },
  isFeatured: {
    type: Boolean,
    default: true // lets you hide one without deleting it
  },
  order: {
    type: Number,
    default: 0 // controls display order in the slider
  }
}, { timestamps: true })

testimonialSchema.index({ order: 1 })

let TestimonialModel = mongoose.model("Testimonial", testimonialSchema)
export default TestimonialModel