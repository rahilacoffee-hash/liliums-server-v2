import mongoose from "mongoose"

let projectSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, "Provide a title"]
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    sparse: true,
    lowercase: true,
    trim: true,
  },
  category: {
    type: String,
    required: [true, "Provide a category"]
  },
  location: {
    type: String,
    default: ""
  },
  year: {
    type: String,
    default: ""
  },
  description: {
    type: String,
    default: ""
  },
  storyTitle: {
    type: String,
    default: ""
  },
  designApproach: {
    type: String,
    default: ""
  },
  highlights: {
    type: [String],
    default: []
  },
  process: {
    type: [{
      title: { type: String, default: "" },
      description: { type: String, default: "" }
    }],
    default: []
  },
  image: {
    type: String,
    default: ""
  },
  isFeatured: {
    type: Boolean,
    default: true // controls whether it shows in the homepage slider
  },
  order: {
    type: Number,
    default: 0
  }
}, { timestamps: true })

projectSchema.index({ isFeatured: 1, order: 1 })

let ProjectModel = mongoose.model("Project", projectSchema)
export default ProjectModel
