const Stripe = require("stripe");
const stripe = Stripe(process.env.Stripe_Secret_key);
const Checkout = require("../models/Checkout");
const Order = require("../models/Order");

exports.createPaymentIntent = async (req, res) => {
  try {
    const { amount } = req.body;
    if (!amount || typeof amount !== "number") {
      return res
        .status(400)
        .json({ error: "Amount is required and must be a number (in cents)." });
    }
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: "usd",
    });
    res.json({ client_secret: paymentIntent.client_secret });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Stripe webhook handler
exports.stripeWebhook = async (req, res) => {
  const sig = req.headers["stripe-signature"];
  let event;
  try {
    event = stripe.webhooks.constructEvent(
      req.rawBody, // Make sure to use raw body middleware for this route!
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  if (event.type === "payment_intent.succeeded") {
    const paymentIntent = event.data.object;
    const checkoutId = paymentIntent.metadata.checkoutId;
    const checkout = await Checkout.findOneAndUpdate(
      { checkoutId },
      { paymentStatus: "paid" },
      { new: true }
    );
    if (checkout) {
      // Optionally, update all related orders
      await Order.updateMany(
        { _id: { $in: checkout.orders } },
        { $set: { payment: "online", status: "pending" } }
      );
    }
  } else if (event.type === "payment_intent.payment_failed") {
    const paymentIntent = event.data.object;
    const checkoutId = paymentIntent.metadata.checkoutId;
    await Checkout.findOneAndUpdate(
      { checkoutId },
      { paymentStatus: "failed" }
    );
  }

  res.json({ received: true });
};

// GET endpoint for checkout status
exports.getCheckoutStatus = async (req, res) => {
  const { checkoutId } = req.params;
  const checkout = await Checkout.findOne({ checkoutId }).populate("orders");
  if (!checkout) {
    return res
      .status(404)
      .json({ success: false, message: "Checkout not found" });
  }
  res.json({ success: true, checkout });
};

// New: Get all checkouts for the authenticated client
exports.getAllCheckoutsForClient = async (req, res) => {
  const clientId = req.user._id || req.userId;
  const checkouts = await Checkout.find({ client_id: clientId })
    .populate("orders")
    .sort({ createdAt: -1 });
  res.json({ success: true, checkouts });
};
