const mongoose = require("mongoose");

const verificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true, // Each user can have only one verification
    },
    nationalId: {
      type: String,
      required: false,
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
      required: false,
    },
    idCardBackImage: {
      type: String,
      required: false,
    },
    criminalRecord: {
      type: String,
      required: false,
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
  { timestamps: true }
);

module.exports = mongoose.model("Verification", verificationSchema);
