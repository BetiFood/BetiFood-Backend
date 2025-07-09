const mongoose = require("mongoose");

const orderItemSchema = new mongoose.Schema({
  meal_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Meal",
    required: true,
  },
  meal_name: String,
  quantity: { type: Number, required: true },
  unit_price: { type: Number, required: true },
  total_price: { type: Number, required: true },
});

const orderSchema = new mongoose.Schema(
  {
    customer_name: { type: String, required: true },
    phone: { type: String, required: true },
    address: { type: String, required: true },
    items: [orderItemSchema],
    total_price: { type: Number, required: true },
    status: {
      type: String,
      enum: ["pending", "preparing", "on_the_way", "delivered", "cancelled"],
      default: "pending",
    },
    payment_method: {
      type: String,
      enum: ["cash", "online"],
      default: "cash",
    },
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Order", orderSchema);
