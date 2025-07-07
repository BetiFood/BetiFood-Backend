const mongoose = require("mongoose");

const mealSchema = new mongoose.Schema({
  name: String,
  description: String,
  price: Number,
  category: {
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },
    categoryName: {
      type: String,
      required: true,
    },
  },
  cook: {
    cookId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
  },
  quantity: {
    type: Number,
    required: true,
    min: [5, "الكمية يجب ألا تقل عن 5"],
  },
  rate: {
    type: Number,
    default: 0.0,
    min: [0.0, "التقييم لا يمكن أن يكون أقل من 0"],
    max: [5.0, "التقييم لا يمكن أن يكون أكثر من 5"],
    set: function (val) {
      // Ensure the value is stored as a float with up to 1 decimal place
      return Math.round(val * 10) / 10;
    },
    get: function (val) {
      // Return the value as a float
      return parseFloat(val);
    },
  },
  popularity: {
    type: Number,
    default: 0.0,
    min: [0.0, "القيمة لا يمكن أن تكون أقل من 0"],
    description: "عدد مرات البيع أو مؤشر الأكثر مبيعاً",
    set: function (val) {
      // Ensure the value is stored as a float with up to 2 decimal places
      return Math.round(val * 100) / 100;
    },
    get: function (val) {
      // Return the value as a float
      return parseFloat(val);
    },
  },
  images: {
    type: [String],
    validate: [(arr) => arr.length > 0, "At least one image is required"],
  },
  createdAt: { type: Date, default: Date.now },
});

// Enable getters for the schema and exclude virtual id field
mealSchema.set("toJSON", { getters: true, virtuals: false });
mealSchema.set("toObject", { getters: true, virtuals: false });

module.exports = mongoose.model("Meal", mealSchema);
