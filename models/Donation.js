const mongoose = require("mongoose");

const DonationSchema = new mongoose.Schema(
  {
    donor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    amount: { type: Number, required: true },
    toCharity: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Charity",
      required: true,
    },

    // Meal information (like regular order)
    meals: [
      {
        meal: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Meal",
          required: true,
        },
        quantity: { type: Number, required: true, default: 1 },
        price: { type: Number, required: true },
      },
    ],
    cook: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    message: { type: String },
    status: {
      type: String,
      enum: ["pending", "confirmed", "preparing", "completed", "cancelled"],
      default: "pending",
    },

    // Payment fields
    paymentMethod: {
      type: String,
      enum: ["online"],
      default: "online",
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed"],
      default: "pending",
    },
    stripePaymentIntentId: { type: String },
    stripeClientSecret: { type: String },

    // Email confirmation fields
    confirmationToken: { type: String },
    tokenExpiry: { type: Date },
    confirmedAt: { type: Date },

    // Order completion fields
    completedAt: { type: Date },
    completionNote: { type: String },

    // Admin fields
    adminNote: { type: String },
    proofImage: { type: String },

    logs: [
      {
        action: String,
        by: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        at: { type: Date, default: Date.now },
        note: String,
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Index for better query performance
DonationSchema.index({ donor: 1, status: 1 });
DonationSchema.index({ toCharity: 1, status: 1 });
DonationSchema.index({ cook: 1, status: 1 });
DonationSchema.index({ confirmationToken: 1 });
DonationSchema.index({ stripePaymentIntentId: 1 });

module.exports = mongoose.model("Donation", DonationSchema);
