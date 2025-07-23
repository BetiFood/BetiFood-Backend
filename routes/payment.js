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

// Stripe webhook endpoint (must use raw body for Stripe signature verification)
router.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  paymentController.stripeWebhook
);

// GET endpoint for checkout status
router.get("/checkout/:checkoutId", paymentController.getCheckoutStatus);

module.exports = router;
