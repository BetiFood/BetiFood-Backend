const mongoose = require("mongoose");

// User Schema
const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, unique: true, required: true },
    password: { type: String, required: true },
    phone: { type: String, required: true },
    address: { type: String, required: true },
    image: {
      type: String,
      default: null,
      description: "User profile image URL or path",
    },
    role: {
      type: String,
      enum: ["client", "cook", "admin", "delivery"],
      default: "client",
    },
    isVerified: { type: Boolean, default: false }, // for email verification
    // cook
    specialization: { type: String }, // specialization
    experience: { type: Number }, // experience
    // Removed delivery-specific fields from User model
    // isIdentityVerified remains
    isIdentityVerified: { type: Boolean }, // for document verification
    profileImage: { type: String },
    balance: { type: Number, default: 0 }, // for cook balances only
    // Delivery and cook person location tracking
    location: {
      lat: { type: Number },
      lng: { type: Number },
      lastUpdated: { type: Date, default: Date.now },
    },
    rate: {
      type: Number,
      default: 0.0,
      min: [0.0, "التقييم لا يمكن أن يكون أقل من 0"],
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
    popularity: {
      type: Number,
      default: 0.0,
      min: [0.0, "القيمة لا يمكن أن تكون أقل من 0"],
      description: "عدد التقييمات أو مؤشر الشعبية",
      set: function (val) {
        // Ensure the value is stored as a float with up to 2 decimal places
        return Math.round(val * 100) / 100;
      },
      get: function (val) {
        // Return the value as a float
        return parseFloat(val);
      },
    },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Add a reference to the Verification document
userSchema.add({
  verificationRef: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Verification",
    default: null,
  },
});

// Custom toJSON/toObject transform to remove sensitive fields
function userTransform(doc, ret, options) {
  delete ret.resetPasswordToken;
  delete ret.resetPasswordExpires;
  // Remove balance unless explicitly allowed (set by controller)
  if (!ret._showBalance) {
    delete ret.balance;
  }
  delete ret._showBalance;
  return ret;
}

userSchema.set("toJSON", {
  getters: true,
  virtuals: false,
  transform: userTransform,
});
userSchema.set("toObject", {
  getters: true,
  virtuals: false,
  transform: userTransform,
});

// Pre-save middleware to ensure non-cook users have 0.0 for rate and popularity
userSchema.pre("save", function (next) {
  if (this.role !== "cook") {
    this.rate = null;
    this.popularity = null;
  }
  next();
});

module.exports = mongoose.model("User", userSchema);
