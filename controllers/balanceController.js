const Balance = require("../models/Balance");
const User = require("../models/User");
const asyncHandler = require("../utils/asyncHandler");

// Helper function to get or create balance for a cook
const getOrCreateBalance = async (cookId) => {
  let balance = await Balance.findOne({ cookId });
  if (!balance) {
    balance = await Balance.create({ cookId });
  }
  return balance;
};

// Get cook's balance and recent transactions
exports.getCookBalance = asyncHandler(async (req, res) => {
  const cookId = req.userId;

  // Verify user is a cook
  const user = await User.findById(cookId);
  if (!user || user.role !== "cook") {
    return res.status(403).json({
      success: false,
      message: "غير مصرح لك بالوصول إلى هذه البيانات",
    });
  }

  const balance = await getOrCreateBalance(cookId);
  const recentTransactions = balance.getRecentTransactions(10);
  const summary = balance.getTransactionSummary();

  // Update user's balance field for backward compatibility
  await User.findByIdAndUpdate(cookId, { balance: balance.currentBalance });

  res.status(200).json({
    success: true,
    balance: {
      currentBalance: balance.currentBalance,
      totalEarned: balance.totalEarned,
      totalWithdrawn: balance.totalWithdrawn,
      platformFees: balance.platformFees,
      lastUpdated: balance.lastUpdated,
    },
    recentTransactions,
    summary,
  });
});

// Get cook's transaction history with pagination
exports.getTransactionHistory = asyncHandler(async (req, res) => {
  const cookId = req.userId;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;

  // Verify user is a cook
  const user = await User.findById(cookId);
  if (!user || user.role !== "cook") {
    return res.status(403).json({
      success: false,
      message: "غير مصرح لك بالوصول إلى هذه البيانات",
    });
  }

  const balance = await getOrCreateBalance(cookId);

  // Get paginated transactions
  const transactions = balance.transactions
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(skip, skip + limit);

  const totalTransactions = balance.transactions.length;
  const totalPages = Math.ceil(totalTransactions / limit);

  res.status(200).json({
    success: true,
    transactions,
    pagination: {
      currentPage: page,
      totalPages,
      totalTransactions,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
  });
});

// Withdraw balance (for future implementation)
exports.withdrawBalance = asyncHandler(async (req, res) => {
  const cookId = req.userId;
  const { amount, withdrawalMethod } = req.body;

  // Verify user is a cook
  const user = await User.findById(cookId);
  if (!user || user.role !== "cook") {
    return res.status(403).json({
      success: false,
      message: "غير مصرح لك بالوصول إلى هذه البيانات",
    });
  }

  if (!amount || amount <= 0) {
    return res.status(400).json({
      success: false,
      message: "يجب تحديد مبلغ صحيح للسحب",
    });
  }

  const balance = await getOrCreateBalance(cookId);

  if (balance.currentBalance < amount) {
    return res.status(400).json({
      success: false,
      message: "الرصيد غير كافي للسحب المطلوب",
    });
  }

  // Add withdrawal transaction
  const transaction = await balance.addTransaction({
    type: "debit",
    amount,
    description: `سحب رصيد - ${withdrawalMethod || "غير محدد"}`,
    totalAmount: amount,
  });

  // Update user's balance field for backward compatibility
  await User.findByIdAndUpdate(cookId, { balance: balance.currentBalance });

  res.status(200).json({
    success: true,
    message: "تم سحب الرصيد بنجاح",
    transaction,
    newBalance: balance.currentBalance,
  });
});

// Get balance statistics (for admin)
exports.getBalanceStats = asyncHandler(async (req, res) => {
  // Verify user is admin
  const user = await User.findById(req.userId);
  if (!user || user.role !== "admin") {
    return res.status(403).json({
      success: false,
      message: "غير مصرح لك بالوصول إلى هذه البيانات",
    });
  }

  const balances = await Balance.find().populate("cookId", "name email");

  const totalPlatformFees = balances.reduce(
    (sum, balance) => sum + balance.platformFees,
    0
  );
  const totalCookEarnings = balances.reduce(
    (sum, balance) => sum + balance.totalEarned,
    0
  );
  const totalWithdrawals = balances.reduce(
    (sum, balance) => sum + balance.totalWithdrawn,
    0
  );
  const totalCurrentBalances = balances.reduce(
    (sum, balance) => sum + balance.currentBalance,
    0
  );

  res.status(200).json({
    success: true,
    stats: {
      totalCooks: balances.length,
      totalPlatformFees,
      totalCookEarnings,
      totalWithdrawals,
      totalCurrentBalances,
      averageBalancePerCook:
        balances.length > 0 ? totalCurrentBalances / balances.length : 0,
    },
    balances: balances.map((balance) => ({
      cookId: balance.cookId._id,
      cookName: balance.cookId.name,
      cookEmail: balance.cookId.email,
      currentBalance: balance.currentBalance,
      totalEarned: balance.totalEarned,
      totalWithdrawn: balance.totalWithdrawn,
      platformFees: balance.platformFees,
      lastUpdated: balance.lastUpdated,
    })),
  });
});

// Add credit to cook's balance (used by payment webhooks)
exports.addCreditToCook = async (cookId, transactionData) => {
  try {
    const balance = await getOrCreateBalance(cookId);
    const transaction = await balance.addTransaction({
      type: "credit",
      ...transactionData,
    });

    // Update user's balance field for backward compatibility
    await User.findByIdAndUpdate(cookId, { balance: balance.currentBalance });

    return transaction;
  } catch (error) {
    console.error("Error adding credit to cook balance:", error);
    throw error;
  }
};

// Get specific cook's balance (for admin)
exports.getCookBalanceByAdmin = asyncHandler(async (req, res) => {
  // Verify user is admin
  const user = await User.findById(req.userId);
  if (!user || user.role !== "admin") {
    return res.status(403).json({
      success: false,
      message: "غير مصرح لك بالوصول إلى هذه البيانات",
    });
  }

  const { cookId } = req.params;

  // Verify the cook exists and is actually a cook
  const cook = await User.findById(cookId);
  if (!cook || cook.role !== "cook") {
    return res.status(404).json({
      success: false,
      message: "الطباخ غير موجود",
    });
  }

  const balance = await getOrCreateBalance(cookId);
  const recentTransactions = balance.getRecentTransactions(20);
  const summary = balance.getTransactionSummary();

  res.status(200).json({
    success: true,
    cook: {
      id: cook._id,
      name: cook.name,
      email: cook.email,
    },
    balance: {
      currentBalance: balance.currentBalance,
      totalEarned: balance.totalEarned,
      totalWithdrawn: balance.totalWithdrawn,
      platformFees: balance.platformFees,
      lastUpdated: balance.lastUpdated,
    },
    recentTransactions,
    summary,
  });
});
