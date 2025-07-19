const express = require("express");
const router = express.Router();
const paymentController = require("../controllers/paymentController");
const { protect, requireClientRole } = require("../middleware/authMiddleware");

router.post(
  "/create-payment-intent",
  protect,
  requireClientRole,
  paymentController.createPaymentIntent
);

module.exports = router;
