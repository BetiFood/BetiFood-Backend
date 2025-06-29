const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  phone: { type: String, required: true },
  address: { type: String, required: true },
  role: {
    type: String,
    enum: ["client", "cook", "admin", "delivery"],
    default: "client",
  },
  createdAt: { type: Date, default: Date.now },
  isVerified: { type: Boolean, default: false },
});

module.exports = mongoose.model("User", userSchema);
