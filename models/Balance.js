const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["credit", "debit"],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: [0, "المبلغ لا يمكن أن يكون سالب"],
    },
    description: {
      type: String,
      required: true,
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
    },
    donationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Donation",
    },
    checkoutId: {
      type: String,
    },
    paymentIntentId: {
      type: String,
    },
    platformFee: {
      type: Number,
      default: 0,
    },
    cookAmount: {
      type: Number,
      default: 0,
    },
    totalAmount: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "completed", "failed"],
      default: "pending",
    },
  },
  { timestamps: true }
);

const balanceSchema = new mongoose.Schema(
  {
    cookId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    currentBalance: {
      type: Number,
      default: 0,
      min: [0, "الرصيد لا يمكن أن يكون سالب"],
    },
    totalEarned: {
      type: Number,
      default: 0,
      min: [0, "إجمالي الأرباح لا يمكن أن يكون سالب"],
    },
    totalWithdrawn: {
      type: Number,
      default: 0,
      min: [0, "إجمالي المسحوبات لا يمكن أن يكون سالب"],
    },
    platformFees: {
      type: Number,
      default: 0,
      min: [0, "رسوم المنصة لا يمكن أن تكون سالبة"],
    },
    transactions: [transactionSchema],
    lastUpdated: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Index for efficient queries
balanceSchema.index({ cookId: 1 });
balanceSchema.index({ "transactions.createdAt": -1 });

// Pre-save hook to update lastUpdated
balanceSchema.pre("save", function (next) {
  this.lastUpdated = new Date();
  next();
});

// Method to add a transaction and update balance
balanceSchema.methods.addTransaction = async function (transactionData) {
  // Calculate the split (90% for cook, 10% for platform)
  const totalAmount = transactionData.totalAmount;
  const cookAmount = Math.round(totalAmount * 0.9 * 100) / 100; // 90% for cook
  const platformFee = Math.round(totalAmount * 0.1 * 100) / 100; // 10% for platform

  const transaction = {
    ...transactionData,
    cookAmount,
    platformFee,
    status: "completed",
  };

  // Add transaction to the array
  this.transactions.push(transaction);

  // Update balance based on transaction type
  if (transaction.type === "credit") {
    this.currentBalance += cookAmount;
    this.totalEarned += cookAmount;
  } else if (transaction.type === "debit") {
    this.currentBalance -= transaction.amount;
    this.totalWithdrawn += transaction.amount;
  }

  // Update platform fees
  this.platformFees += platformFee;

  // Save the updated balance
  await this.save();
  return transaction;
};

// Method to get recent transactions
balanceSchema.methods.getRecentTransactions = function (limit = 10) {
  return this.transactions
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, limit);
};

// Method to get transaction summary
balanceSchema.methods.getTransactionSummary = function () {
  const totalCredits = this.transactions
    .filter((t) => t.type === "credit")
    .reduce((sum, t) => sum + t.cookAmount, 0);

  const totalDebits = this.transactions
    .filter((t) => t.type === "debit")
    .reduce((sum, t) => sum + t.amount, 0);

  return {
    totalCredits,
    totalDebits,
    totalTransactions: this.transactions.length,
    platformFees: this.platformFees,
  };
};

module.exports = mongoose.model("Balance", balanceSchema);
