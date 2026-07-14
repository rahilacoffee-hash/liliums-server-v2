import mongoose from "mongoose"

let reviewSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.ObjectId,
    ref: "Product",
    required: true
  },
  user: {
    type: mongoose.Schema.ObjectId,
    ref: "User",
    required: true
  },
  rating: {
    type: Number,
    required: [true, "Provide a rating"],
    min: 1,
    max: 5
  },
  comment: {
    type: String,
    required: [true, "Provide a comment"],
    trim: true
  }
}, { timestamps: true })

// one review per user per product
reviewSchema.index({ product: 1, user: 1 }, { unique: true })

let ReviewModel = mongoose.model("Review", reviewSchema)
export default ReviewModel