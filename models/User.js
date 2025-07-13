const mongoose = require("mongoose");

// سكيما المستخدم
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  phone: { type: String },
  address: { type: String },
  role: { 
    type: String, 
    enum: ["client", "cook", "delivery", "admin"], 
    default: "client" 
  },
  isActive: { type: Boolean, default: true },
  isVerified: { type: Boolean, default: false }, // يتطلب تفعيل البريد الإلكتروني
  profileImage: { type: String },
  // معلومات إضافية للشيف
  specialization: { type: String }, // تخصص الشيف
  experience: { type: Number }, // سنوات الخبرة
  // معلومات إضافية لمندوب التوصيل
  vehicleType: { type: String }, // نوع المركبة
  licenseNumber: { type: String }, // رقم الرخصة
  currentLocation: {
    latitude: { type: Number },
    longitude: { type: Number }
  }
}, { timestamps: true });

module.exports = mongoose.model("User", userSchema);
