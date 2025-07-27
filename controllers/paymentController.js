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

  console.log("Order webhook received:", {
    signature: sig ? "present" : "missing",
    bodyLength: req.body ? req.body.length : 0,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET_ORDERS
      ? "present"
      : "missing",
  });

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET_ORDERS
    );
    console.log("Order webhook event verified:", event.type);
  } catch (err) {
    console.error("Order webhook signature verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  if (event.type === "payment_intent.succeeded") {
    const paymentIntent = event.data.object;
    console.log("Payment intent succeeded:", {
      paymentIntentId: paymentIntent.id,
      metadata: paymentIntent.metadata,
      amount: paymentIntent.amount,
    });

    const checkoutId = paymentIntent.metadata.checkoutId;
    console.log("Processing checkout payment:", checkoutId);

    const checkout = await Checkout.findOneAndUpdate(
      { checkoutId },
      { paymentStatus: "paid" },
      { new: true }
    );

    if (checkout) {
      console.log(
        `Checkout ${checkoutId} payment succeeded, updating ${checkout.orders.length} orders`
      );

      // Update all related orders with payment status
      await Order.updateMany(
        { _id: { $in: checkout.orders } },
        {
          $set: {
            payment: "online",
            paymentStatus: "paid",
            stripePaymentIntentId: paymentIntent.id,
            status: "pending",
          },
        }
      );

      // Add balance credits for cooks (90/10 split)
      const { addCreditToCook } = require("./balanceController");

      // Get all orders for this checkout
      const orders = await Order.find({
        _id: { $in: checkout.orders },
      }).populate("cook_id", "name email");

      console.log(
        `Found ${orders.length} orders for balance credit processing`
      );

      // Group orders by cook and add credits
      const cookOrders = {};
      for (const order of orders) {
        const cookId = order.cook_id._id.toString();
        if (!cookOrders[cookId]) {
          cookOrders[cookId] = {
            cook: order.cook_id,
            orders: [],
            totalAmount: 0,
          };
        }
        cookOrders[cookId].orders.push(order);
        cookOrders[cookId].totalAmount += order.final_amount;
      }

      console.log(
        `Processing balance credits for ${Object.keys(cookOrders).length} cooks`
      );

      // Add credits for each cook
      for (const cookId in cookOrders) {
        const cookData = cookOrders[cookId];
        try {
          await addCreditToCook(cookId, {
            amount: cookData.totalAmount,
            totalAmount: cookData.totalAmount,
            description: `دفع طلب - ${cookData.orders.length} طلب`,
            orderId: cookData.orders[0]._id, // Reference to first order
            checkoutId: checkoutId,
            paymentIntentId: paymentIntent.id,
          });
          console.log(
            `✅ Added credit to cook ${cookId}: ${cookData.totalAmount} (${cookData.orders.length} orders)`
          );
        } catch (error) {
          console.error(`❌ Error adding credit to cook ${cookId}:`, error);
        }
      }
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

// Get order payment status with fallback check
exports.getOrderPaymentStatus = async (req, res) => {
  try {
    const { orderId } = req.params;

    const order = await Order.findById(orderId)
      .select(
        "paymentStatus stripePaymentIntentId final_amount cook_id client_id"
      )
      .populate("cook_id", "_id name email")
      .populate("client_id", "_id name email");

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "الطلب غير موجود",
      });
    }

    // Check if user has permission to view this order's payment status
    const userIsClient =
      order.client_id._id.toString() === req.userId.toString();
    const userIsCook = order.cook_id._id.toString() === req.userId.toString();
    const userIsAdmin = req.user && req.user.role === "admin";

    if (!userIsClient && !userIsCook && !userIsAdmin) {
      return res.status(403).json({
        success: false,
        message: "غير مصرح لك بالوصول إلى حالة دفع هذا الطلب",
      });
    }

    // If payment status is still pending, check with Stripe directly
    if (order.paymentStatus === "pending" && order.stripePaymentIntentId) {
      try {
        const paymentIntent = await stripe.paymentIntents.retrieve(
          order.stripePaymentIntentId
        );

        if (
          paymentIntent.status === "succeeded" &&
          order.paymentStatus !== "paid"
        ) {
          // Update payment status in database
          await Order.findByIdAndUpdate(orderId, {
            paymentStatus: "paid",
            payment: "online",
          });

          // Add balance credit for cook (90/10 split)
          const { addCreditToCook } = require("./balanceController");

          try {
            await addCreditToCook(order.cook_id._id, {
              amount: order.final_amount,
              totalAmount: order.final_amount,
              description: `دفع طلب - 1 طلب`,
              orderId: order._id,
              paymentIntentId: paymentIntent.id,
            });
            console.log(
              `Added credit to cook ${order.cook_id._id}: ${order.final_amount}`
            );
          } catch (error) {
            console.error(
              `Error adding credit to cook ${order.cook_id._id}:`,
              error
            );
          }

          // Return updated status
          return res.status(200).json({
            success: true,
            paymentStatus: "paid",
            amount: order.final_amount,
            paymentIntentId: order.stripePaymentIntentId,
            updated: true,
          });
        }
      } catch (stripeError) {
        console.error(
          "Error checking payment status with Stripe:",
          stripeError
        );
      }
    }

    res.status(200).json({
      success: true,
      paymentStatus: order.paymentStatus,
      amount: order.final_amount,
      paymentIntentId: order.stripePaymentIntentId,
    });
  } catch (error) {
    console.error("Error in getOrderPaymentStatus:", error);
    res.status(500).json({
      success: false,
      message: "فشل في جلب حالة الدفع",
      error: error.message,
    });
  }
};

// Manual sync payment status for all pending orders (for admin/testing)
exports.syncOrderPaymentStatus = async (req, res) => {
  try {
    // Verify user is admin
    if (!req.user || req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "غير مصرح لك بالوصول إلى هذه البيانات",
      });
    }

    const pendingOrders = await Order.find({
      paymentStatus: "pending",
      stripePaymentIntentId: { $exists: true, $ne: null },
    }).populate("cook_id", "name email");

    const results = {
      total: pendingOrders.length,
      updated: 0,
      errors: 0,
      details: [],
    };

    for (const order of pendingOrders) {
      try {
        const paymentIntent = await stripe.paymentIntents.retrieve(
          order.stripePaymentIntentId
        );

        if (paymentIntent.status === "succeeded") {
          // Update payment status
          await Order.findByIdAndUpdate(order._id, {
            paymentStatus: "paid",
            payment: "online",
          });

          // Add balance credit for cook
          const { addCreditToCook } = require("./balanceController");

          await addCreditToCook(order.cook_id._id, {
            amount: order.final_amount,
            totalAmount: order.final_amount,
            description: `دفع طلب - 1 طلب`,
            orderId: order._id,
            paymentIntentId: paymentIntent.id,
          });

          results.updated++;
          results.details.push({
            orderId: order._id,
            status: "updated",
            paymentIntentId: order.stripePaymentIntentId,
            cookName: order.cook_id.name,
          });
        } else {
          results.details.push({
            orderId: order._id,
            status: "still_pending",
            stripeStatus: paymentIntent.status,
          });
        }
      } catch (error) {
        results.errors++;
        results.details.push({
          orderId: order._id,
          status: "error",
          error: error.message,
        });
      }
    }

    res.status(200).json({
      success: true,
      message: `تم مزامنة ${results.updated} طلب من أصل ${results.total}`,
      results,
    });
  } catch (error) {
    console.error("Error in syncOrderPaymentStatus:", error);
    res.status(500).json({
      success: false,
      message: "فشل في مزامنة حالة الدفع",
      error: error.message,
    });
  }
};

// All functions are already exported using exports.functionName syntax
