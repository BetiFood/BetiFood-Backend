const mongoose = require("mongoose");

const cartSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  items: [
    {
      mealId: { type: mongoose.Schema.Types.ObjectId, ref: "Meal" },
      quantity: Number,
    },
  ],
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Cart", cartSchema);
