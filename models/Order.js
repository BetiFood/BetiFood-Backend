const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // client
  meals: [
    {
      mealId: { type: mongoose.Schema.Types.ObjectId, ref: "Meal" },
      quantity: Number,
    },
  ],
  total: { type: Number, required: true }, // إجمالي السعر
  isDonation: Boolean,
  shippingAddress: String,
  cookId: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // cook
  status: { 
    type: String, 
    enum: ["pending", "confirmed", "preparing", "ready", "delivered", "cancelled"], 
    default: "pending" 
  },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Order", orderSchema);
