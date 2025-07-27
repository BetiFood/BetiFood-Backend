const Order = require("../models/Order");
const Cart = require("../models/Cart");
const Meal = require("../models/Meal");
const User = require("../models/User");
const asyncHandler = require("../utils/asyncHandler");
const { ApiResponse } = require("../utils/response");
const mongoose = require("mongoose");
const Checkout = require("../models/Checkout");
const Stripe = require("stripe");
const stripe = process.env.Stripe_Secret_key
  ? Stripe(process.env.Stripe_Secret_key)
  : null;

// Helper function to calculate distance between two points using Haversine formula
const calculateDistance = (lat1, lng1, lat2, lng2) => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in kilometers
};

// Helper function to format order response for the new schema
const formatOrderResponse = (order) => {
  // Extract cook info
  let cookPhone = "";
  let cookAddress = null;
  let cookLocation = null;
  if (order.cook_id) {
    cookPhone = order.cook_id.phone || "";
    if (order.cook_id.verificationRef) {
      cookAddress = order.cook_id.verificationRef.address || null;
      cookLocation = order.cook_id.verificationRef.location || null;
    }
  }
  return {
    order_id: order._id,
    checkout_id: order.checkoutId,
    client: {
      id: order.client_id?._id || order.client_id,
      name: order.client_name,
      email: order.client_id?.email || "",
      phone: order.client_phone,
      address: order.client_address,
      location: order.location,
    },
    cook: {
      id: order.cook_id?._id || order.cook_id,
      name: order.cook_name,
      phone: cookPhone,
      address: cookAddress,
      location: cookLocation,
    },
    meals: order.meals.map((meal) => ({
      id: meal.mealId,
      name: meal.mealName,
      cookId: meal.cookId,
      cookName: meal.cookName,
      unit_price: meal.price,
      quantity: meal.quantity,
      total_price: meal.price * meal.quantity,
    })),
    delivery: {
      id: order.delivery?.id || order.delivery_id?._id || order.delivery_id,
      name: order.delivery?.name || order.delivery_name,
      status: order.delivery?.status || order.delivery_status,
      fee: order.delivery_fee,
      distance_km: order.delivery_distance_km,
      picked_up_at: order.picked_up_at,
      delivered_at: order.delivered_at,
    },
    pricing: {
      total_delivery_fee: order.total_delivery_fee,
      tax: order.tax,
      discount: order.discount,
      final_amount: order.final_amount,
    },
    payment: {
      method: order.payment, // English only
      status: "pending", // Simplified for now
    },
    status: order.status, // Return status in English only
    notes: order.notes,
    timestamps: {
      created: formatArabicDate(order.createdAt),
      updated: formatArabicDate(order.updatedAt),
    },
  };
};

// Helper function to format Arabic date
const formatArabicDate = (date) => {
  if (!date) return "";
  const months = [
    "يناير",
    "فبراير",
    "مارس",
    "إبريل",
    "مايو",
    "يونيو",
    "يوليو",
    "أغسطس",
    "سبتمبر",
    "أكتوبر",
    "نوفمبر",
    "ديسمبر",
  ];
  const d = new Date(date);
  const day = d.getDate();
  const month = months[d.getMonth()];
  const year = d.getFullYear();
  const hour = d.getHours().toString().padStart(2, "0");
  const min = d.getMinutes().toString().padStart(2, "0");
  return `${day} ${month} ${year} - ${hour}:${min}`;
};

// جلب جميع الطلبات حسب الدور
const getAllOrders = asyncHandler(async (req, res) => {
  let filter = {};
  let populateOptions = [
    {
      path: "cook_id",
      select: "name email phone verificationRef",
      populate: { path: "verificationRef", select: "address location" },
    },
    { path: "delivery.id", select: "name email" }, // updated for nested delivery
    { path: "client_id", select: "name email" },
  ];

  // فلترة الطلبات حسب دور المستخدم
  switch (req.userRole) {
    case "client":
      filter = { client_id: new mongoose.Types.ObjectId(req.userId) };
      break;
    case "cook":
      filter = { cook_id: new mongoose.Types.ObjectId(req.userId) };
      break;
    case "delivery":
      if (!req.user.isIdentityVerified) {
        return res.status(403).json({
          success: false,
          message: "لا يمكنك رؤية الطلبات حتى يتم توثيق هويتك من الإدارة.",
        });
      }
      filter = {
        $or: [
          { delivery_id: new mongoose.Types.ObjectId(req.userId) },
          { status: { $in: ["completed", "delivering"] } },
        ],
      };
      break;
    case "admin":
      // المدير يرى جميع الطلبات
      break;
    default:
      return res.status(403).json({
        success: false,
        message: "دور غير معروف",
      });
  }

  const orders = await Order.find(filter)
    .populate(populateOptions)
    .sort({ createdAt: -1 });

  // Automatic payment status check for pending orders with Stripe IDs
  if (stripe) {
    for (const order of orders) {
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
            await Order.findByIdAndUpdate(order._id, {
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
                `✅ Auto-updated payment status for order ${order._id}: ${order.final_amount}`
              );
            } catch (error) {
              console.error(
                `❌ Error adding credit to cook ${order.cook_id._id}:`,
                error
              );
            }

            // Update the order object for response
            order.paymentStatus = "paid";
            order.payment = "online";
          }
        } catch (stripeError) {
          console.error(
            "Error checking payment status with Stripe:",
            stripeError
          );
        }
      }
    }
  }

  const formattedOrders = orders.map((order) => formatOrderResponse(order));

  res.status(200).json({
    success: true,
    message: "تم جلب الطلبات بنجاح",
    orders: formattedOrders,
    count: formattedOrders.length,
  });
});

// جلب الطلبات المتاحة للشيف (pending وغير مخصصة)
const getAvailableOrdersForCook = asyncHandler(async (req, res) => {
  const filter = {
    status: "pending",
    cook_id: new mongoose.Types.ObjectId(req.userId),
    $or: [{ delivery_id: { $exists: false } }, { delivery_id: null }],
  };

  const populateOptions = [
    {
      path: "cook_id",
      select: "name email phone verificationRef",
      populate: { path: "verificationRef", select: "address location" },
    },
    { path: "client_id", select: "name email" },
  ];

  const orders = await Order.find(filter)
    .populate(populateOptions)
    .sort({ createdAt: -1 });

  // Automatic payment status check for pending orders with Stripe IDs
  if (stripe) {
    for (const order of orders) {
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
            await Order.findByIdAndUpdate(order._id, {
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
                `✅ Auto-updated payment status for order ${order._id}: ${order.final_amount}`
              );
            } catch (error) {
              console.error(
                `❌ Error adding credit to cook ${order.cook_id._id}:`,
                error
              );
            }

            // Update the order object for response
            order.paymentStatus = "paid";
            order.payment = "online";
          }
        } catch (stripeError) {
          console.error(
            "Error checking payment status with Stripe:",
            stripeError
          );
        }
      }
    }
  }

  const formattedOrders = orders.map((order) => formatOrderResponse(order));

  res.status(200).json({
    success: true,
    message: "تم جلب الطلبات المتاحة بنجاح",
    orders: formattedOrders,
    count: formattedOrders.length,
  });
});

// جلب الطلبات المتاحة لمندوب التوصيل مع فلترة حسب الموقع
const getAvailableOrdersForDelivery = asyncHandler(async (req, res) => {
  if (!req.user.isIdentityVerified) {
    return res.status(403).json({
      success: false,
      message: "لا يمكنك رؤية الطلبات حتى يتم توثيق هويتك من الإدارة.",
    });
  }
  if (!req.user.location || !req.user.location.lat || !req.user.location.lng) {
    return res.status(400).json({
      success: false,
      message: "يجب تحديث موقعك أولاً لرؤية الطلبات المتاحة.",
    });
  }
  const deliveryLocation = req.user.location;
  const maxDistance = 3; // 3 km

  // Only show orders where cook has accepted (preparing) and is verified
  const filter = {
    status: { $in: ["preparing", "completed"] },
    $or: [{ delivery_id: { $exists: false } }, { delivery_id: null }],
  };

  const populateOptions = [
    {
      path: "cook_id",
      select: "name email phone verificationRef",
      populate: { path: "verificationRef", select: "location status" },
    },
    { path: "client_id", select: "name email phone" },
  ];

  const orders = await Order.find(filter)
    .populate(populateOptions)
    .sort({ createdAt: -1 });

  const availableOrders = [];
  for (const order of orders) {
    const cook = order.cook_id;
    // Only allow if cook is verified and has a location
    if (
      cook &&
      cook.verificationRef &&
      cook.verificationRef.status === "approved" &&
      cook.verificationRef.location &&
      typeof cook.verificationRef.location.latitude === "number" &&
      typeof cook.verificationRef.location.longitude === "number"
    ) {
      const cookLat = cook.verificationRef.location.latitude;
      const cookLng = cook.verificationRef.location.longitude;
      const deliveryLat = req.user.location.lat;
      const deliveryLng = req.user.location.lng;
      const distance = calculateDistance(
        deliveryLat,
        deliveryLng,
        cookLat,
        cookLng
      );
      if (distance <= maxDistance) {
        const formatted = formatOrderResponse(order);
        formatted.distance_from_delivery = distance;
        availableOrders.push(formatted);
      }
    }
  }

  // Sort by closest first
  availableOrders.sort(
    (a, b) => a.distance_from_delivery - b.distance_from_delivery
  );

  // Debug log: print order IDs and their distances
  console.log(
    "DELIVERY ORDERS:",
    availableOrders.map((o) => ({
      id: o.order_id,
      distance: o.distance_from_delivery,
    }))
  );

  res.status(200).json({
    success: true,
    message: `تم جلب ${availableOrders.length} طلب متاح للتوصيل بنجاح`,
    orders: availableOrders,
    count: availableOrders.length,
    delivery_location: req.user.location,
    max_distance_km: maxDistance,
  });
});

// Shared function to create orders and checkout
async function createOrdersAndCheckout(
  {
    client_name,
    client_phone,
    client_address,
    location,
    notes,
    payment = "cash",
    tax = 0,
    discount = 0,
    meals,
  },
  user
) {
  // Normalize payment method (accept Arabic and English)
  let normalizedPayment = payment;
  if (payment === "نقدي" || payment === "cash") {
    normalizedPayment = "cash";
  } else if (payment === "الكتروني" || payment === "online") {
    normalizedPayment = "online";
  } else {
    return {
      success: false,
      message: "طريقة الدفع غير مدعومة نقدي او الكتروني",
    };
  }

  // Validate required fields
  if (
    !client_name ||
    !client_phone ||
    !client_address ||
    !location ||
    !meals ||
    !Array.isArray(meals)
  ) {
    return {
      success: false,
      message:
        "يجب توفير جميع البيانات المطلوبة: client_name, client_phone, client_address, location, meals",
    };
  }

  // Validate client_address structure
  if (
    !client_address.city ||
    !client_address.street ||
    !client_address.building_number
  ) {
    return {
      success: false,
      message: "يجب توفير city, street, building_number في client_address",
    };
  }

  // Validate location structure
  if (typeof location.lat !== "number" || typeof location.lng !== "number") {
    return {
      success: false,
      message: "يجب توفير lat و lng كأرقام في location",
    };
  }

  if (meals.length === 0) {
    return {
      success: false,
      message: "يجب توفير وجبة واحدة على الأقل في الطلب",
    };
  }

  // Group meals by cook_id
  const mealsByCook = {};
  for (const meal of meals) {
    if (!meal.meal_id || !meal.quantity || meal.quantity < 1) {
      return {
        success: false,
        message: "كل وجبة يجب أن تحتوي على meal_id و quantity >= 1",
      };
    }
    // Fetch meal info
    const mealDoc = await Meal.findById(meal.meal_id);
    if (!mealDoc) {
      return {
        success: false,
        message: `الوجبة غير موجودة: ${meal.meal_id}`,
      };
    }
    // Fetch cook info from mealDoc.cook.cookId
    if (!mealDoc.cook || !mealDoc.cook.cookId) {
      return {
        success: false,
        message: `الوجبة ${mealDoc.name} لا تحتوي على طباخ معرف`,
      };
    }
    const cookId = mealDoc.cook.cookId.toString();
    if (!mealsByCook[cookId]) mealsByCook[cookId] = [];
    mealsByCook[cookId].push({
      mealDoc,
      quantity: meal.quantity,
    });
  }

  // Generate a unique checkoutId (ObjectId as string)
  const checkoutId = new mongoose.Types.ObjectId().toString();

  let totalAmount = 0;
  let totalTax = 0;
  let totalDiscount = 0;
  let totalDeliveryFee = 0;
  const orderIds = [];
  const createdOrders = [];

  // For each cook, create an order
  for (const cookId in mealsByCook) {
    // Use cook name from the first meal in the group
    const cookName = mealsByCook[cookId][0].mealDoc.cook.name;
    const cook = await User.findById(cookId);
    if (!cook || cook.role !== "cook") {
      return {
        success: false,
        message: `الطباخ غير موجود أو غير صالح: ${cookId}`,
      };
    }
    const cookMeals = mealsByCook[cookId];
    let subtotal = 0;
    const orderMeals = [];
    for (const { mealDoc, quantity } of cookMeals) {
      orderMeals.push({
        mealId: mealDoc._id,
        mealName: mealDoc.name,
        cookId: cook._id,
        cookName: cookName,
        quantity,
        price: mealDoc.price,
      });
      subtotal += mealDoc.price * quantity;
    }
    // Delivery fee and distance can be set to 0 or calculated if needed
    const delivery_fee = 0;
    const delivery_distance_km = 0;
    // Calculate order total (tax/discount split equally or as needed)
    const orderTax = tax ? tax / Object.keys(mealsByCook).length : 0;
    const orderDiscount = discount
      ? discount / Object.keys(mealsByCook).length
      : 0;
    const final_amount = subtotal + delivery_fee + orderTax - orderDiscount;
    // Create the order
    const order = await Order.create({
      client_id: user._id || user.userId,
      client_name,
      client_phone,
      client_address,
      location,
      cook_id: cook._id,
      cook_name: cookName,
      meals: orderMeals,
      payment: normalizedPayment,
      paymentStatus: "pending",
      tax: orderTax,
      discount: orderDiscount,
      notes,
      status: "pending",
      delivery_fee,
      delivery_distance_km,
      checkoutId,
    });
    orderIds.push(order._id);
    createdOrders.push(order);
    totalAmount += final_amount;
    totalTax += orderTax;
    totalDiscount += orderDiscount;
    totalDeliveryFee += delivery_fee;
  }

  // Create Checkout document
  let checkoutDoc = null;
  let stripeClientSecret = null;
  let stripePaymentIntentId = null;

  if (normalizedPayment === "online") {
    if (!stripe) {
      return {
        success: false,
        message: "خدمة الدفع الإلكتروني غير متاحة حالياً",
      };
    }
    // Stripe expects amount in cents
    const amountInCents = Math.round(totalAmount * 100);
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: "usd",
      metadata: { checkoutId },
    });
    stripeClientSecret = paymentIntent.client_secret;
    stripePaymentIntentId = paymentIntent.id;

    // Update all orders with the payment intent ID
    await Order.updateMany(
      { _id: { $in: orderIds } },
      { stripePaymentIntentId: stripePaymentIntentId }
    );

    checkoutDoc = await Checkout.create({
      checkoutId,
      client_id: user._id || user.userId,
      orders: orderIds,
      totalAmount,
      paymentMethod: normalizedPayment,
      paymentStatus: "pending",
      stripePaymentIntentId,
      stripeClientSecret,
    });
  } else {
    checkoutDoc = await Checkout.create({
      checkoutId,
      client_id: user._id || user.userId,
      orders: orderIds,
      totalAmount,
      paymentMethod: normalizedPayment,
      paymentStatus: "pending",
    });
  }

  // Populate orders with full details
  await checkoutDoc.populate("orders");

  // Remove the orders field with just IDs from the checkout object
  const checkoutObj = checkoutDoc.toObject();
  const ordersDetails = checkoutObj.orders;
  delete checkoutObj.orders;

  // Remove _id from the checkout object (keep only checkoutId)
  delete checkoutObj._id;

  // Remove isDonation from each order in ordersDetails (legacy, but safe)
  if (Array.isArray(ordersDetails)) {
    for (const order of ordersDetails) {
      if (order && typeof order === "object" && "isDonation" in order) {
        delete order.isDonation;
      }
    }
  }

  // At the end of createOrdersAndCheckout, return only the checkout object and full orders details
  return {
    success: true,
    message: "تم إنشاء الطلبات بنجاح",
    checkout: checkoutObj,
    orders: ordersDetails,
    stripeClientSecret: stripeClientSecret || undefined,
  };
}

// إنشاء طلب جديد (checkout) - نموذج جديد: طلب واحد لكل طباخ مع checkoutId
const checkout = asyncHandler(async (req, res) => {
  const result = await createOrdersAndCheckout(
    req.body,
    req.user || { _id: req.userId }
  );
  if (result.success) {
    res.status(201).json(result);
  } else {
    res.status(400).json(result);
  }
});

// جلب طلب واحد
const getOrder = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const order = await Order.findById(id).populate([
    {
      path: "cook_id",
      select: "name email phone verificationRef",
      populate: { path: "verificationRef", select: "address location" },
    },
    { path: "delivery.id", select: "name email" }, // updated for nested delivery
    { path: "client_id", select: "name email" },
  ]);
  if (!order) {
    return res.status(404).json({
      success: false,
      message: "الطلب غير موجود",
    });
  }

  // Automatic payment status check - if payment is pending and has Stripe ID, check with Stripe
  if (
    order.paymentStatus === "pending" &&
    order.stripePaymentIntentId &&
    stripe
  ) {
    try {
      const paymentIntent = await stripe.paymentIntents.retrieve(
        order.stripePaymentIntentId
      );

      if (
        paymentIntent.status === "succeeded" &&
        order.paymentStatus !== "paid"
      ) {
        // Update payment status in database
        await Order.findByIdAndUpdate(order._id, {
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
            `✅ Auto-updated payment status for order ${order._id}: ${order.final_amount}`
          );
        } catch (error) {
          console.error(
            `❌ Error adding credit to cook ${order.cook_id._id}:`,
            error
          );
        }

        // Update the order object for response
        order.paymentStatus = "paid";
        order.payment = "online";
      }
    } catch (stripeError) {
      console.error("Error checking payment status with Stripe:", stripeError);
    }
  }

  // التحقق من الصلاحيات
  if (req.userRole === "client") {
    const orderClientId =
      order.client_id?._id?.toString() || order.client_id?.toString();
    if (orderClientId !== req.userId.toString()) {
      return res.status(403).json({
        success: false,
        message: "غير مصرح لك بعرض هذا الطلب",
      });
    }
  } else if (req.userRole === "cook") {
    if (
      (order.cook_id?._id?.toString() || order.cook_id?.toString()) !==
      req.userId.toString()
    ) {
      return res.status(403).json({
        success: false,
        message:
          "غير مصرح لك بعرض هذا الطلب - الطلب لا يحتوي على وجبات من صنعك",
      });
    }
  } else if (req.userRole === "delivery") {
    if (
      (order.delivery_id?._id?.toString() || order.delivery_id?.toString()) !==
      req.userId.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: "غير مصرح لك بعرض هذا الطلب - الطلب لا يحتوي على توصيل منك",
      });
    }
  }
  const formattedOrder = formatOrderResponse(order);
  res.status(200).json({
    success: true,
    message: "تم جلب الطلب بنجاح",
    order: formattedOrder,
  });
});

// قبول الطلب للشيف
const acceptOrderByCook = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { notes } = req.body;
  const order = await Order.findById(id).populate([
    {
      path: "cook_id",
      select: "name email phone verificationRef",
      populate: { path: "verificationRef", select: "address location" },
    },
    { path: "client_id", select: "name email" },
  ]);
  if (!order) {
    return res.status(404).json({
      success: false,
      message: "الطلب غير موجود",
    });
  }

  // Automatic payment status check - if payment is pending and has Stripe ID, check with Stripe
  if (
    order.paymentStatus === "pending" &&
    order.stripePaymentIntentId &&
    stripe
  ) {
    try {
      const paymentIntent = await stripe.paymentIntents.retrieve(
        order.stripePaymentIntentId
      );

      if (
        paymentIntent.status === "succeeded" &&
        order.paymentStatus !== "paid"
      ) {
        // Update payment status in database
        await Order.findByIdAndUpdate(order._id, {
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
            `✅ Auto-updated payment status for order ${order._id}: ${order.final_amount}`
          );
        } catch (error) {
          console.error(
            `❌ Error adding credit to cook ${order.cook_id._id}:`,
            error
          );
        }

        // Update the order object for response
        order.paymentStatus = "paid";
        order.payment = "online";
      }
    } catch (stripeError) {
      console.error("Error checking payment status with Stripe:", stripeError);
    }
  }

  // Only allow cook to accept if payment is paid for online payments
  if (order.payment === "online" && order.paymentStatus !== "paid") {
    return res.status(400).json({
      success: false,
      message: "لا يمكن للطباخ قبول الطلب حتى يتم دفع الطلب بنجاح.",
    });
  }
  if (order.status !== "pending") {
    return res.status(400).json({
      success: false,
      message: "يمكن قبول الطلبات في حالة انتظار فقط",
    });
  }
  if (
    (order.cook_id?._id?.toString() || order.cook_id?.toString()) !==
    req.userId.toString()
  ) {
    return res.status(403).json({
      success: false,
      message: "غير مصرح لك بقبول هذا الطلب - الطلب لا يحتوي على وجبات من صنعك",
    });
  }
  order.status = "preparing";
  if (notes) {
    order.notes = notes;
  }
  await order.save();
  const formattedOrder = formatOrderResponse(order);
  res.status(200).json({
    success: true,
    message: "تم قبول الطلب بنجاح",
    order: formattedOrder,
  });
});

// قبول الطلب لمندوب التوصيل
const acceptOrderByDelivery = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { notes } = req.body;
  if (!req.user.isIdentityVerified) {
    return res.status(403).json({
      success: false,
      message: "لا يمكنك قبول الطلبات حتى يتم توثيق هويتك من الإدارة.",
    });
  }
  const order = await Order.findById(id).populate([
    {
      path: "cook_id",
      select: "name email phone verificationRef",
      populate: { path: "verificationRef", select: "address location" },
    },
    { path: "client_id", select: "name email" },
  ]);
  if (!order) {
    return res.status(404).json({
      success: false,
      message: "الطلب غير موجود",
    });
  }
  if (order.status !== "completed" && order.status !== "preparing") {
    return res.status(400).json({
      success: false,
      message: "يمكن قبول الطلبات في حالة قيد التحضير أو مكتمل فقط",
    });
  }
  if (order.delivery && order.delivery.status === "accepted") {
    return res.status(400).json({
      success: false,
      message: "تم قبول هذا الطلب بالفعل من قبل مندوب توصيل آخر.",
    });
  }
  if (!req.user.location || !req.user.location.lat || !req.user.location.lng) {
    return res.status(400).json({
      success: false,
      message: "يجب تحديث موقعك أولاً لقبول الطلبات.",
    });
  }
  const cook = order.cook_id;
  if (
    !cook ||
    !cook.verificationRef ||
    !cook.verificationRef.location ||
    typeof cook.verificationRef.location.latitude !== "number" ||
    typeof cook.verificationRef.location.longitude !== "number"
  ) {
    return res.status(400).json({
      success: false,
      message: "موقع الطباخ غير متوفر، لا يمكن قبول الطلب.",
    });
  }
  const distance = calculateDistance(
    req.user.location.lat,
    req.user.location.lng,
    cook.verificationRef.location.latitude,
    cook.verificationRef.location.longitude
  );
  const maxDistance = 3;
  if (distance > maxDistance) {
    return res.status(400).json({
      success: false,
      message: `المسافة بينك والطباخ (${distance.toFixed(
        1
      )} كم) أكبر من الحد المسموح (${maxDistance} كم).`,
    });
  }
  // Set delivery object and status (do NOT change order.status)
  order.delivery = {
    id: req.userId,
    name: req.user.name,
    status: "accepted",
  };
  if (notes) {
    order.notes = notes;
  }
  await order.save();
  const formattedOrder = formatOrderResponse(order);
  res.status(200).json({
    success: true,
    message: "تم قبول الطلب الخاص بك بنجاح. تم تعيينك كمندوب توصيل لهذا الطلب.",
    order: formattedOrder,
    distance_to_cook_km: distance.toFixed(1),
  });
});

// تحديث الطلب
const updateOrder = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const {
    status,
    notes,
    estimated_delivery_time,
    client_name,
    client_phone,
    client_address,
    delivery_confirmed,
    client_received,
  } = req.body;
  const order = await Order.findById(id).populate([
    {
      path: "cook_id",
      select: "name email phone verificationRef",
      populate: { path: "verificationRef", select: "address location" },
    },
    { path: "client_id", select: "name email" },
  ]);
  if (!order) {
    return res.status(404).json({
      success: false,
      message: "الطلب غير موجود",
    });
  }
  let canUpdate = false;
  let updateMessage = "";
  switch (req.userRole) {
    case "client": {
      const orderClientId =
        order.client_id?._id?.toString() || order.client_id?.toString();
      if (orderClientId !== req.userId.toString()) {
        return res.status(403).json({
          success: false,
          message: "غير مصرح لك بتحديث هذا الطلب - الطلب لا يخصك",
        });
      }
      if (status === "cancelled") {
        if (order.status === "pending") {
          // Restore meal quantities on cancel
          for (const meal of order.meals) {
            await Meal.findByIdAndUpdate(meal.mealId, {
              $inc: { quantity: meal.quantity },
            });
          }
          order.status = "cancelled";
          canUpdate = true;
          updateMessage = "تم إلغاء الطلب بنجاح";
        } else {
          return res.status(400).json({
            success: false,
            message: "لا يمكن إلغاء الطلب بعد قبوله.",
          });
        }
      } else if (
        order.status === "pending" &&
        (client_name || client_phone || client_address)
      ) {
        canUpdate = true;
        updateMessage = "تم تحديث البيانات الشخصية بنجاح";
        if (client_name) order.client_name = client_name;
        if (client_phone) order.client_phone = client_phone;
        if (client_address) order.client_address = client_address;
      } else if (
        (status === "confirmed" || client_received) &&
        order.status === "delivered"
      ) {
        canUpdate = true;
        order.status = "confirmed";
        updateMessage =
          "تم تأكيد استلام الطلب من العميل بنجاح. الطلب الآن مؤكد.";
      } else if (notes && order.status === "pending") {
        canUpdate = true;
        updateMessage = "تم تحديث الملاحظات بنجاح";
        order.notes = notes;
      }
      break;
    }
    case "cook": {
      if (
        (order.cook_id?._id?.toString() || order.cook_id?.toString()) !==
        req.userId.toString()
      ) {
        return res.status(403).json({
          success: false,
          message: "غير مصرح لك بتحديث هذا الطلب",
        });
      }
      // Allow cook to cancel (reject) a pending order
      if (status === "cancelled") {
        if (order.status === "pending") {
          // Restore meal quantities on cancel
          for (const meal of order.meals) {
            await Meal.findByIdAndUpdate(meal.mealId, {
              $inc: { quantity: meal.quantity },
            });
          }
          order.status = "cancelled";
          canUpdate = true;
          updateMessage = "تم إلغاء الطلب بنجاح من قبل الطباخ.";
        } else {
          return res.status(400).json({
            success: false,
            message: "لا يمكن للطباخ إلغاء الطلب بعد قبوله أو تغييره.",
          });
        }
      } else if (
        status &&
        ["preparing", "completed", "cancelled"].includes(status)
      ) {
        order.status = status;
        canUpdate = true;
        if (status === "completed") {
          updateMessage =
            "تم تحديث حالة الطلب الخاص بك بنجاح. الطلب جاهز الآن ويمكن للمندوب استلامه من الطباخ.";
        } else {
          updateMessage = "تم تحديث حالة الطلب الخاص بك بنجاح";
        }
      }
      if (notes) {
        order.notes = notes;
        canUpdate = true;
        if (!updateMessage)
          updateMessage = "تم تحديث ملاحظات الطلب الخاص بك بنجاح";
      }
      break;
    }
    case "delivery": {
      if (
        !order.delivery ||
        order.delivery.id?.toString() !== req.userId.toString()
      ) {
        return res.status(403).json({
          success: false,
          message: "غير مصرح لك بتحديث هذا الطلب",
        });
      }
      if (status === "delivering") {
        canUpdate = true;
        order.status = "delivering";
        updateMessage = "تم تحديث حالة الطلب إلى جاري التوصيل.";
      }
      // Accept both status === "delivered" and delivery_confirmed
      if (delivery_confirmed || status === "delivered") {
        canUpdate = true;
        order.status = "delivered";
        order.delivered_at = new Date();
        updateMessage = "تم تأكيد التوصيل";
      }
      break;
    }
    case "admin": {
      canUpdate = true;
      if (status) order.status = status;
      if (notes) order.notes = notes;
      if (estimated_delivery_time)
        order.estimated_delivery_time = estimated_delivery_time;
      if (client_name) order.client_name = client_name;
      if (client_phone) order.client_phone = client_phone;
      if (client_address) order.client_address = client_address;
      updateMessage = "تم تحديث الطلب بنجاح";
      break;
    }
    default:
      return res.status(403).json({
        success: false,
        message: "دور غير معروف",
      });
  }
  if (!canUpdate) {
    return res.status(400).json({
      success: false,
      message: "لا يمكن تحديث الطلب في هذه الحالة",
    });
  }
  await order.save();
  const formattedOrder = formatOrderResponse(order);
  res.status(200).json({
    success: true,
    message: updateMessage,
    order: formattedOrder,
  });
});

// التحقق من إمكانية قبول طلب جديد
const checkDeliveryAvailability = asyncHandler(async (req, res) => {
  // التحقق من توثيق هوية مندوب التوصيل
  if (!req.user.isIdentityVerified) {
    return res.status(403).json({
      success: false,
      message: "لا يمكنك الوصول لهذه الميزة حتى يتم توثيق هويتك من الإدارة.",
    });
  }

  // التحقق من الطلبات الحالية لمندوب التوصيل
  const currentOrders = await Order.find({
    delivery_id: new mongoose.Types.ObjectId(req.userId),
    status: { $in: ["preparing", "completed", "delivering"] },
  });

  const hasActiveOrder = currentOrders.length > 0;
  const lastAcceptedOrder =
    currentOrders.length > 0
      ? currentOrders.sort(
          (a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)
        )[0]
      : null;

  let canAcceptNewOrder = true;
  let timeUntilNextOrder = null;
  let timeSinceLastOrder = null;

  if (hasActiveOrder && lastAcceptedOrder) {
    timeSinceLastOrder =
      Date.now() - new Date(lastAcceptedOrder.updatedAt).getTime();
    const tenMinutesInMs = 10 * 60 * 1000;

    if (timeSinceLastOrder < tenMinutesInMs) {
      canAcceptNewOrder = false;
      timeUntilNextOrder = Math.ceil(
        (tenMinutesInMs - timeSinceLastOrder) / 60000
      );
    }
  }

  res.status(200).json({
    success: true,
    can_accept_new_order: canAcceptNewOrder,
    has_active_order: hasActiveOrder,
    active_orders_count: currentOrders.length,
    time_until_next_order_minutes: timeUntilNextOrder,
    time_since_last_order_minutes: timeSinceLastOrder
      ? Math.floor(timeSinceLastOrder / 60000)
      : null,
    last_accepted_order: lastAcceptedOrder
      ? {
          order_id: lastAcceptedOrder._id,
          status: lastAcceptedOrder.status,
          accepted_at: lastAcceptedOrder.updatedAt,
        }
      : null,
  });
});

// تحديث موقع مندوب التوصيل
const updateDeliveryLocation = asyncHandler(async (req, res) => {
  const { lat, lng } = req.body;

  // التحقق من توثيق هوية مندوب التوصيل
  if (!req.user.isIdentityVerified) {
    return res.status(403).json({
      success: false,
      message: "لا يمكنك تحديث موقعك حتى يتم توثيق هويتك من الإدارة.",
    });
  }

  // التحقق من صحة البيانات
  if (typeof lat !== "number" || typeof lng !== "number") {
    return res.status(400).json({
      success: false,
      message: "يجب توفير lat و lng كأرقام صحيحة.",
    });
  }

  // التحقق من نطاق الإحداثيات
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return res.status(400).json({
      success: false,
      message:
        "إحداثيات غير صحيحة. يجب أن تكون lat بين -90 و 90، و lng بين -180 و 180.",
    });
  }

  // تحديث موقع مندوب التوصيل
  const updatedUser = await User.findByIdAndUpdate(
    req.userId,
    {
      location: {
        lat,
        lng,
        lastUpdated: new Date(),
      },
    },
    { new: true, select: "name email role location isIdentityVerified" }
  );

  res.status(200).json({
    success: true,
    message: "تم تحديث موقعك بنجاح",
    delivery_person: {
      id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      role: updatedUser.role,
      isIdentityVerified: updatedUser.isIdentityVerified,
      location: updatedUser.location,
    },
  });
});

module.exports = {
  getAllOrders,
  getAvailableOrdersForCook,
  getAvailableOrdersForDelivery,
  checkout,
  getOrder,
  acceptOrderByCook,
  acceptOrderByDelivery,
  updateOrder,
  updateDeliveryLocation,
  checkDeliveryAvailability,
  formatOrderResponse,
  createOrdersAndCheckout,
};
