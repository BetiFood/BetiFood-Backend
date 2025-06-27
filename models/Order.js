const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // client
  meals: [
    {
      mealId: { type: mongoose.Schema.Types.ObjectId, ref: "Meal" },
      quantity: Number,
    },
  ],
  isDonation: Boolean,
  shippingAddress: String,
  cookId: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // cook
  shippingType: String,
  status: String,
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Order", orderSchema);
