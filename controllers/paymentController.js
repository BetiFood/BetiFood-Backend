const Stripe = require("stripe");
const stripe = Stripe(process.env.Stripe_Secret_key);

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
