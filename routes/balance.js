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

module.exports = router;
