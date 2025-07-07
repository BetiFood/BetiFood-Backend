const mongoose = require("mongoose");

const mealReviewSchema = new mongoose.Schema({
  client: {
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
  },
  meal: {
    mealId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Meal",
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
  },
  rating: {
    type: Number,
    required: true,
    min: [1.0, "التقييم لا يمكن أن يكون أقل من 1"],
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
  comment: {
    type: String,
    required: true,
    trim: true,
    minlength: [10, "التعليق يجب أن يكون 10 أحرف على الأقل"],
    maxlength: [500, "التعليق لا يمكن أن يتجاوز 500 حرف"],
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Enable getters for the schema and exclude virtual id field
mealReviewSchema.set("toJSON", { getters: true, virtuals: false });
mealReviewSchema.set("toObject", { getters: true, virtuals: false });

// Update the updatedAt field before saving
mealReviewSchema.pre("save", function (next) {
  this.updatedAt = new Date();
  next();
});

// Ensure a client can only review a meal once
mealReviewSchema.index(
  { "client.clientId": 1, "meal.mealId": 1 },
  { unique: true }
);

module.exports = mongoose.model("MealReview", mealReviewSchema);
