const mongoose = require("mongoose");

// سكيما الوجبة
const mealSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  price: { type: Number, required: true },
  category: {
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
    },
    categoryName: String,
  },
  cook: {
    cookId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    name: String,
  },
  quantity: { type: Number, required: true },
  images: [String],
  createdAt: { type: Date, default: Date.now },
});

mealSchema.set("toJSON", { getters: true, virtuals: false });
mealSchema.set("toObject", { getters: true, virtuals: false });

module.exports = mongoose.model("Meal", mealSchema);
