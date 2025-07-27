const mongoose = require("mongoose");

const withdrawalRequestSchema = new mongoose.Schema(
  {
    cookId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: [0, "المبلغ لا يمكن أن يكون سالب"],
    },
    withdrawalMethod: {
      type: String,
      enum: ["bank_transfer", "paypal", "cash", "other"],
      required: true,
    },
    bankDetails: {
      bankName: String,
      accountNumber: String,
      accountHolderName: String,
      iban: String,
    },
    paypalEmail: String,
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "completed"],
      default: "pending",
    },
    adminNotes: String,
    processedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    processedAt: Date,
    requestNotes: String, // Notes from cook
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

// Index for efficient queries
withdrawalRequestSchema.index({ cookId: 1, status: 1 });
withdrawalRequestSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model("WithdrawalRequest", withdrawalRequestSchema);
