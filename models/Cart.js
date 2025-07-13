const mongoose = require("mongoose");

const cartSchema = new mongoose.Schema({
  clientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  meals: [
    {
      mealId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Meal",
        required: true,
      },
      mealName: { type: String, required: true }, // اسم الوجبة
      cookId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
      cookName: { type: String, required: true }, // اسم الطباخ
      quantity: { type: Number, required: true, min: 1 },
      price: { type: Number, required: true }, // سعر الوحدة
    },
  ],
  updatedAt: { type: Date, default: Date.now },
  expiresAt: {
    type: Date,
    default: function () {
      // انتهاء صلاحية الكارت بعد 30 يوم
      return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    },
  },
});

// Index للبحث السريع
cartSchema.index({ clientId: 1 });
cartSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Middleware لحساب الإجمالي
cartSchema.methods.calculateTotal = function () {
  if (!this.meals || this.meals.length === 0) return 0;

  return this.meals.reduce((sum, item) => {
    return sum + item.mealId.price * item.quantity;
  }, 0);
};

// Middleware لحساب عدد العناصر
cartSchema.methods.getItemCount = function () {
  if (!this.meals || this.meals.length === 0) return 0;

  return this.meals.reduce((sum, item) => {
    return sum + item.quantity;
  }, 0);
};

module.exports = mongoose.model("Cart", cartSchema);
