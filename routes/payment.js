const express = require("express");
const router = express.Router();
const paymentController = require("../controllers/paymentController");
const {
  protect,
  requireClientRole,
  requireAdminRole,
} = require("../middleware/authMiddleware");

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
router.get(
  "/checkout/:checkoutId",
  protect,
  paymentController.getCheckoutStatus
);

// GET endpoint for all checkouts for the authenticated client
router.get("/checkout", protect, paymentController.getAllCheckoutsForClient);

// GET endpoint for order payment status (with fallback check)
router.get(
  "/order/:orderId/payment-status",
  protect,
  paymentController.getOrderPaymentStatus
);

// POST endpoint for admin to sync all pending order payments
router.post(
  "/sync-order-payment-status",
  protect,
  requireAdminRole,
  paymentController.syncOrderPaymentStatus
);

module.exports = router;
