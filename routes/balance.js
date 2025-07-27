const express = require("express");
const router = express.Router();
const balanceController = require("../controllers/balanceController");
const { protect } = require("../middleware/authMiddleware");
const checkRole = require("../middleware/roles");

// Cook routes
router.get(
  "/cook",
  protect,
  checkRole("cook"),
  balanceController.getCookBalance
);
router.get(
  "/cook/transactions",
  protect,
  checkRole("cook"),
  balanceController.getTransactionHistory
);
router.post(
  "/cook/withdraw",
  protect,
  checkRole("cook"),
  balanceController.withdrawBalance
);

// Withdrawal request routes (cook)
router.post(
  "/cook/withdrawal-request",
  protect,
  checkRole("cook"),
  balanceController.requestWithdrawal
);
router.get(
  "/cook/withdrawal-requests",
  protect,
  checkRole("cook"),
  balanceController.getWithdrawalRequests
);

// Admin routes
router.get(
  "/stats",
  protect,
  checkRole("admin"),
  balanceController.getBalanceStats
);
router.get(
  "/cook/:cookId",
  protect,
  checkRole("admin"),
  balanceController.getCookBalanceByAdmin
);

// Admin withdrawal request routes
router.get(
  "/withdrawal-requests",
  protect,
  checkRole("admin"),
  balanceController.getAllWithdrawalRequests
);
router.patch(
  "/withdrawal-requests/:requestId/process",
  protect,
  checkRole("admin"),
  balanceController.processWithdrawalRequest
);

module.exports = router;
