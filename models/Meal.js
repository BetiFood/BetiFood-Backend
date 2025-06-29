const mongoose = require("mongoose");

const mealSchema = new mongoose.Schema({
  name: String,
  description: String,
  price: Number,
  category: String,
  cookId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  quantity: {
    type: Number,
    required: true,
    min: [5, "الكمية يجب ألا تقل عن 5"],
  },
  rate: { type: Number, default: 0.0 },
  image: {
    type: [String],
    validate: [(arr) => arr.length > 0, "At least one image is required"],
  },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Meal", mealSchema);
