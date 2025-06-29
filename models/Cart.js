const mongoose = require("mongoose");

const cartSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  items: [
    {
      mealId: { type: mongoose.Schema.Types.ObjectId, ref: "Meal", required: true },
      quantity: { type: Number, required: true, min: 1 },
    },
  ],
  updatedAt: { type: Date, default: Date.now },
  expiresAt: { 
    type: Date, 
    default: function() {
      // انتهاء صلاحية الكارت بعد 30 يوم
      return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    }
  }
});

// Index للبحث السريع
cartSchema.index({ userId: 1 });
cartSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Middleware لحساب الإجمالي
cartSchema.methods.calculateTotal = function() {
  if (!this.items || this.items.length === 0) return 0;
  
  return this.items.reduce((sum, item) => {
    return sum + (item.mealId.price * item.quantity);
  }, 0);
};

// Middleware لحساب عدد العناصر
cartSchema.methods.getItemCount = function() {
  if (!this.items || this.items.length === 0) return 0;
  
  return this.items.reduce((sum, item) => {
    return sum + item.quantity;
  }, 0);
};

module.exports = mongoose.model("Cart", cartSchema);
