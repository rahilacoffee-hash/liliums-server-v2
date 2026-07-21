import mongoose from "mongoose"

let projectSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, "Provide a title"]
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
    default: "" // not shown on the slider card yet, but useful for a future project detail page
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