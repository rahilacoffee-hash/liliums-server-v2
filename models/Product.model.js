import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Provide product name"],
      trim: true,
    },

    slug: {
      type: String,
      required: [true, "Provide slug"],
      unique: true,
      lowercase: true,
      trim: true,
    },

    category: {
      type: String,
      required: [true, "Provide category"],
      trim: true,
    },

    description: {
      type: String,
      required: [true, "Provide description"],
      trim: true,
    },

    price: {
      type: Number,
      required: [true, "Provide price"],
      min: 0,
    },

    comparePrice: {
      type: Number,
      default: 0,
      min: 0,
    },

    sku: {
      type: String,
      default: "",
      trim: true,
    },

    // Multiple Images
    images: [
      {
        url: {
          type: String,
          required: true,
        },

        public_id: {
          type: String,
          required: true,
        },
      },
    ],

    badge: {
      type: String,
      default: null,
    },

    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },

    numReviews: {
      type: Number,
      default: 0,
    },

    isFeatured: {
      type: Boolean,
      default: false,
    },

    stock: {
      type: Number,
      default: 0,
      min: 0,
    },

    status: {
      type: String,
      enum: ["Active", "Draft", "Archived"],
      default: "Active",
    },
  },
  {
    timestamps: true,
  }
);

productSchema.index({ category: 1 });
productSchema.index({ isFeatured: 1 });

productSchema.index({ status: 1 });

const ProductModel = mongoose.model("Product", productSchema);

export default ProductModel;