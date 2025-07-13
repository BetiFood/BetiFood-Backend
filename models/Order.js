const mongoose = require("mongoose");

// عنصر وجبة في الطلب
const mealSchema = new mongoose.Schema({
  mealId: { type: mongoose.Schema.Types.ObjectId, ref: "Meal", required: true },
  mealName: { type: String, required: true }, // اسم الوجبة
  cookId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // معرف الطباخ
  cookName: { type: String, required: true }, // اسم الطباخ
  quantity: { type: Number, required: true },
  price: { type: Number, required: true }
}, { _id: false });

const orderSchema = new mongoose.Schema({
  client_name: { type: String, required: true },
  phone: { type: String, required: true },
  address: { type: String, required: true },
  client_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  meals: [mealSchema],
  total_price: { type: Number, required: true },
  status: {
    type: String,
    enum: ["pending", "preparing", "completed", "delivering", "delivered", "cancelled"],
    default: "pending"
  },
  assigned_cook: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  assigned_delivery: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  
  // معلومات الدفع
  payment: {
    method: { 
      type: String, 
      enum: ["cash", "online"], 
      default: "cash" 
    },
    status: { 
      type: String, 
      enum: ["pending", "paid", "failed"], 
      default: "pending" 
    },
    amount_due: { type: Number, required: true },
    paid: { type: Number, default: 0 },
    refunded: { type: Number, default: 0 }
  },
  
  // معلومات إضافية للدفع
  delivery_fee: { type: Number, default: 0 },
  tax_amount: { type: Number, default: 0 },
  discount_amount: { type: Number, default: 0 },
  final_amount: { type: Number, required: true },
  
  notes: { type: String },
  estimated_delivery_time: { type: Date },
  
  // حالة الاستلام
  delivery_status: {
    delivered_by_delivery: { type: Boolean, default: false },
    received_by_client: { type: Boolean, default: false },
    delivery_confirmed_at: { type: Date },
    client_confirmed_at: { type: Date }
  }
}, { timestamps: true });

// Middleware لحساب المبلغ النهائي
orderSchema.pre('save', function(next) {
  if (this.isModified('total_price') || this.isModified('delivery_fee') || 
      this.isModified('tax_amount') || this.isModified('discount_amount')) {
    this.final_amount = this.total_price + this.delivery_fee + this.tax_amount - this.discount_amount;
    this.payment.amount_due = this.final_amount;
  }
  next();
});

module.exports = mongoose.model("Order", orderSchema); 