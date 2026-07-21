import mongoose from "mongoose"

let statItemSchema = new mongoose.Schema({
  label: { type: String, required: true },
  value: { type: String, required: true } // string so "250+" / "98%" both work
}, { _id: false })

// Used by the "Why Choose" stats grid, which animates counting up to
// `value` then appends `suffix` (e.g. counts to 250, shows "+" after)
let whyChooseStatItemSchema = new mongoose.Schema({
  id: { type: Number, required: true },
  value: { type: Number, required: true },
  suffix: { type: String, default: "+" },
  label: { type: String, required: true }
}, { _id: false })

// Used by the CTA section's icon-cards
let ctaStatItemSchema = new mongoose.Schema({
  id: { type: Number, required: true },
  icon: {
    type: String,
    enum: ["Award", "Users", "Briefcase", "TrendingUp", "Star", "ThumbsUp"],
    default: "Award"
  },
  value: { type: String, required: true },
  label: { type: String, required: true }
}, { _id: false })

let buttonSchema = new mongoose.Schema({
  label: { type: String, default: "" },
  href: { type: String, default: "" }
}, { _id: false })

let showcaseItemSchema = new mongoose.Schema({
  id: { type: Number, required: true },
  icon: {
    type: String,
    enum: ["Armchair", "Columns3", "Building2", "ShoppingBag"],
    default: "Armchair"
  },
  title: { type: String, required: true },
  description: { type: String, default: "" },
  href: { type: String, default: "/services" }
}, { _id: false })

let siteContentSchema = new mongoose.Schema({
  hero: {
    eyebrow: {
      type: String,
      default: "Luxury Interior Design"
    },
    title: {
      type: String,
      default: "Designing Timeless Interiors That Inspire Living"
    },
    description: {
      type: String,
      default: "From concept to completion, we create beautiful, functional spaces tailored to your lifestyle."
    },
    backgroundImage: {
      type: String,
      default: ""
    },
    primaryButton: {
      type: buttonSchema,
      default: () => ({ label: "Explore Projects", href: "/shop" })
    },
    secondaryButton: {
      type: buttonSchema,
      default: () => ({ label: "Watch Showreel", href: "#" })
    },
    featuredCollection: {
      image: { type: String, default: "" },
      badge: { type: String, default: "Featured" },
      eyebrow: { type: String, default: "Featured Collection" },
      title: { type: String, default: "" },
      description: { type: String, default: "" },
      button: {
        type: buttonSchema,
        default: () => ({ label: "Explore Collection", href: "/shop" })
      }
    },
    showcase: {
      type: [showcaseItemSchema],
      default: [
        { id: 1, icon: "Armchair", title: "Interior Design", description: "Elegant & Functional Spaces", href: "/services" },
        { id: 2, icon: "Columns3", title: "Wall Treatments", description: "Panels, Mouldings & Wallpapers", href: "/services" },
        { id: 3, icon: "Building2", title: "Construction", description: "Quality You Can Trust", href: "/services" },
        { id: 4, icon: "ShoppingBag", title: "Shop Collection", description: "Premium Materials", href: "/shop" },
      ]
    }
  },
  about: {
    eyebrow: {
      type: String,
      default: "About Us"
    },
    title: {
      // FIXED: Mixed allows both String (old DB records) and Array (new editor saves)
      type: mongoose.Schema.Types.Mixed,
      default: ["Curating Spaces", "That Inspire Everyday Living"]
    },
    description: {
      type: String,
      default: "At Lilium's Glee, every project begins with understanding how you live, work, and connect."
    },
    image: {
      type: String,
      default: ""
    },
    button: {
      type: buttonSchema,
      default: () => ({ label: "Learn More", href: "/about" })
    }
  },
  stats: {
    type: [statItemSchema],
    default: [
      { label: "Projects Completed", value: "250+" },
      { label: "Happy Clients", value: "120+" },
      { label: "Awards Won", value: "15+" },
    ]
  },
  whyChooseStats: {
    type: [whyChooseStatItemSchema],
    default: [
      { id: 1, value: 250, suffix: "+", label: "Projects Completed" },
      { id: 2, value: 120, suffix: "+", label: "Happy Clients" },
      { id: 3, value: 15, suffix: "+", label: "Awards Won" },
      { id: 4, value: 98, suffix: "%", label: "Client Satisfaction" },
    ]
  },
  ctaStats: {
    type: [ctaStatItemSchema],
    default: [
      { id: 1, icon: "Award", value: "250+", label: "Projects Completed" },
      { id: 2, icon: "Users", value: "120+", label: "Happy Clients" },
      { id: 3, icon: "TrendingUp", value: "15+", label: "Awards Won" },
    ]
  }
}, { timestamps: true })

let SiteContentModel = mongoose.model("SiteContent", siteContentSchema)
export default SiteContentModel