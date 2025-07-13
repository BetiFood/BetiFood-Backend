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
    isActive: { type: Boolean, default: true },
    isVerified: { type: Boolean, default: false },
    profileImage: { type: String },
    // cook
    specialization: { type: String }, // specialization
    experience: { type: Number }, // experience
    // delivery
    vehicleType: { type: String }, // vehicle type
    licenseNumber: { type: String }, // license number
    currentLocation: {
      latitude: { type: Number },
      longitude: { type: Number },
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
    verification: {
      nationalId: {
        type: String,
        required: function () {
          return this.role === "cook" || this.role === "delivery";
        },
        validate: {
          validator: function (v) {
            // Egyptian National ID validation (14 digits)
            return /^\d{14}$/.test(v);
          },
          message: "الرقم القومي يجب أن يكون 14 رقم",
        },
      },
      idCardFrontImage: {
        type: String,
        required: function () {
          return this.role === "cook" || this.role === "delivery";
        },
      },
      idCardBackImage: {
        type: String,
        required: function () {
          return this.role === "cook" || this.role === "delivery";
        },
      },
      criminalRecord: {
        type: String,
        required: function () {
          return this.role === "cook" || this.role === "delivery";
        },
      },
      status: {
        type: String,
        enum: ["pending", "approved", "rejected"],
        default: "pending",
      },
      submittedAt: {
        type: Date,
        default: Date.now,
      },
      reviewedAt: {
        type: Date,
        default: null,
      },
      reviewNotes: {
        type: String,
        default: null,
      },
      reviewedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
      },
    },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// Enable getters for the schema and exclude virtual id field
userSchema.set("toJSON", { getters: true, virtuals: false });
userSchema.set("toObject", { getters: true, virtuals: false });

// Pre-save middleware to ensure non-cook users have 0.0 for rate and popularity
userSchema.pre("save", function (next) {
  if (this.role !== "cook") {
    this.rate = null;
    this.popularity = null;
  }
  next();
});

module.exports = mongoose.model("User", userSchema);
