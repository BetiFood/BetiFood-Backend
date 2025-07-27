const Balance = require("../models/Balance");
const User = require("../models/User");
const WithdrawalRequest = require("../models/WithdrawalRequest");
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

// Request withdrawal (cook creates withdrawal request)
exports.requestWithdrawal = asyncHandler(async (req, res) => {
  const cookId = req.userId;
  const { amount, withdrawalMethod, bankDetails, paypalEmail, requestNotes } =
    req.body;

  // Verify user is a cook
  const user = await User.findById(cookId);
  if (!user || user.role !== "cook") {
    return res.status(403).json({
      success: false,
      message: "غير مصرح لك بالوصول إلى هذه البيانات",
    });
  }

  // Validate amount
  if (!amount || amount <= 0) {
    return res.status(400).json({
      success: false,
      message: "يجب تحديد مبلغ صحيح للسحب",
    });
  }

  // Check minimum withdrawal amount
  const minWithdrawal = 50; // Minimum 50 EGP
  if (amount < minWithdrawal) {
    return res.status(400).json({
      success: false,
      message: `الحد الأدنى للسحب هو ${minWithdrawal} جنية مصري`,
    });
  }

  // Check current balance
  const balance = await getOrCreateBalance(cookId);
  if (balance.currentBalance < amount) {
    return res.status(400).json({
      success: false,
      message: "الرصيد غير كافي للسحب المطلوب",
    });
  }

  // Validate withdrawal method and required details
  if (
    withdrawalMethod === "bank_transfer" &&
    (!bankDetails || !bankDetails.bankName || !bankDetails.accountNumber)
  ) {
    return res.status(400).json({
      success: false,
      message: "يجب توفير تفاصيل البنك للسحب البنكي",
    });
  }

  if (withdrawalMethod === "paypal" && !paypalEmail) {
    return res.status(400).json({
      success: false,
      message: "يجب توفير بريد إلكتروني PayPal",
    });
  }

  // Check if there's already a pending request
  const pendingRequest = await WithdrawalRequest.findOne({
    cookId,
    status: "pending",
  });

  if (pendingRequest) {
    return res.status(400).json({
      success: false,
      message: "لديك طلب سحب معلق بالفعل. يرجى انتظار معالجة الطلب الحالي",
    });
  }

  // Create withdrawal request
  const withdrawalRequest = await WithdrawalRequest.create({
    cookId,
    amount,
    withdrawalMethod,
    bankDetails,
    paypalEmail,
    requestNotes,
    logs: [
      {
        action: "request_created",
        by: cookId,
        note: "تم إنشاء طلب السحب",
      },
    ],
  });

  // Populate cook info
  await withdrawalRequest.populate("cookId", "name email");

  res.status(201).json({
    success: true,
    message: "تم إنشاء طلب السحب بنجاح وتم إرساله للمراجعة",
    withdrawalRequest: {
      id: withdrawalRequest._id,
      amount: withdrawalRequest.amount,
      withdrawalMethod: withdrawalRequest.withdrawalMethod,
      status: withdrawalRequest.status,
      createdAt: withdrawalRequest.createdAt,
      requestNotes: withdrawalRequest.requestNotes,
    },
  });
});

// Get cook's withdrawal requests
exports.getWithdrawalRequests = asyncHandler(async (req, res) => {
  const cookId = req.userId;
  const { status, page = 1, limit = 10 } = req.query;
  const skip = (page - 1) * limit;

  // Verify user is a cook
  const user = await User.findById(cookId);
  if (!user || user.role !== "cook") {
    return res.status(403).json({
      success: false,
      message: "غير مصرح لك بالوصول إلى هذه البيانات",
    });
  }

  let query = { cookId };

  // Filter by status if provided
  if (status) {
    query.status = status;
  }

  const requests = await WithdrawalRequest.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit))
    .populate("processedBy", "name email");

  const total = await WithdrawalRequest.countDocuments(query);

  res.status(200).json({
    success: true,
    requests: requests.map((req) => ({
      id: req._id,
      amount: req.amount,
      withdrawalMethod: req.withdrawalMethod,
      status: req.status,
      createdAt: req.createdAt,
      processedAt: req.processedAt,
      adminNotes: req.adminNotes,
      requestNotes: req.requestNotes,
      processedBy: req.processedBy
        ? {
            name: req.processedBy.name,
            email: req.processedBy.email,
          }
        : null,
    })),
    pagination: {
      current: parseInt(page),
      total: Math.ceil(total / limit),
      count: requests.length,
      totalCount: total,
    },
  });
});

// Admin: Get all withdrawal requests
exports.getAllWithdrawalRequests = asyncHandler(async (req, res) => {
  // Verify user is admin
  const user = await User.findById(req.userId);
  if (!user || user.role !== "admin") {
    return res.status(403).json({
      success: false,
      message: "غير مصرح لك بالوصول إلى هذه البيانات",
    });
  }

  const { status, page = 1, limit = 20 } = req.query;
  const skip = (page - 1) * limit;

  let query = {};

  // Filter by status if provided
  if (status) {
    query.status = status;
  }

  const requests = await WithdrawalRequest.find(query)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit))
    .populate("cookId", "name email")
    .populate("processedBy", "name email");

  const total = await WithdrawalRequest.countDocuments(query);

  res.status(200).json({
    success: true,
    requests: requests.map((req) => ({
      id: req._id,
      cook: {
        id: req.cookId._id,
        name: req.cookId.name,
        email: req.cookId.email,
      },
      amount: req.amount,
      withdrawalMethod: req.withdrawalMethod,
      bankDetails: req.bankDetails,
      paypalEmail: req.paypalEmail,
      status: req.status,
      createdAt: req.createdAt,
      processedAt: req.processedAt,
      adminNotes: req.adminNotes,
      requestNotes: req.requestNotes,
      processedBy: req.processedBy
        ? {
            name: req.processedBy.name,
            email: req.processedBy.email,
          }
        : null,
    })),
    pagination: {
      current: parseInt(page),
      total: Math.ceil(total / limit),
      count: requests.length,
      totalCount: total,
    },
  });
});

// Admin: Process withdrawal request (approve/reject)
exports.processWithdrawalRequest = asyncHandler(async (req, res) => {
  // Verify user is admin
  const user = await User.findById(req.userId);
  if (!user || user.role !== "admin") {
    return res.status(403).json({
      success: false,
      message: "غير مصرح لك بالوصول إلى هذه البيانات",
    });
  }

  const { requestId } = req.params;
  const { action, adminNotes } = req.body; // action: "approve" or "reject"

  if (!action || !["approve", "reject"].includes(action)) {
    return res.status(400).json({
      success: false,
      message: "يجب تحديد إجراء صحيح: approve أو reject",
    });
  }

  const withdrawalRequest = await WithdrawalRequest.findById(
    requestId
  ).populate("cookId", "name email");

  if (!withdrawalRequest) {
    return res.status(404).json({
      success: false,
      message: "طلب السحب غير موجود",
    });
  }

  if (withdrawalRequest.status !== "pending") {
    return res.status(400).json({
      success: false,
      message: "لا يمكن معالجة طلب تم معالجته بالفعل",
    });
  }

  const newStatus = action === "approve" ? "approved" : "rejected";

  // Update withdrawal request
  withdrawalRequest.status = newStatus;
  withdrawalRequest.adminNotes = adminNotes;
  withdrawalRequest.processedBy = req.userId;
  withdrawalRequest.processedAt = new Date();
  withdrawalRequest.logs.push({
    action: action === "approve" ? "request_approved" : "request_rejected",
    by: req.userId,
    note:
      adminNotes || `تم ${action === "approve" ? "الموافقة على" : "رفض"} الطلب`,
  });

  await withdrawalRequest.save();

  // If approved, deduct from balance
  if (action === "approve") {
    const balance = await getOrCreateBalance(withdrawalRequest.cookId._id);

    if (balance.currentBalance < withdrawalRequest.amount) {
      return res.status(400).json({
        success: false,
        message: "رصيد الطباخ غير كافي لمعالجة الطلب",
      });
    }

    // Add withdrawal transaction
    await balance.addTransaction({
      type: "debit",
      amount: withdrawalRequest.amount,
      description: `سحب رصيد - ${withdrawalRequest.withdrawalMethod}`,
      totalAmount: withdrawalRequest.amount,
    });

    // Update user's balance field for backward compatibility
    await User.findByIdAndUpdate(withdrawalRequest.cookId._id, {
      balance: balance.currentBalance,
    });

    // Update withdrawal request status to completed
    withdrawalRequest.status = "completed";
    withdrawalRequest.logs.push({
      action: "withdrawal_completed",
      by: req.userId,
      note: "تم خصم المبلغ من الرصيد",
    });
    await withdrawalRequest.save();
  }

  res.status(200).json({
    success: true,
    message: `تم ${
      action === "approve" ? "الموافقة على" : "رفض"
    } طلب السحب بنجاح`,
    withdrawalRequest: {
      id: withdrawalRequest._id,
      status: withdrawalRequest.status,
      amount: withdrawalRequest.amount,
      cookName: withdrawalRequest.cookId.name,
      processedAt: withdrawalRequest.processedAt,
    },
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
