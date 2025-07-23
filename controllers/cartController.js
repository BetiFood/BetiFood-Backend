// Helper to format date in Arabic
function formatArabicDate(date) {
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
}

// Helper to build cart summary
function buildCartSummary(cart, total, itemCount) {
  let clientObj = null;
  if (
    cart.clientId &&
    typeof cart.clientId === "object" &&
    cart.clientId.name
  ) {
    clientObj = {
      id: cart.clientId._id?.toString() || cart.clientId.toString(),
      name: cart.clientId.name,
    };
  } else {
    clientObj = {
      id: cart.clientId?._id?.toString() || cart.clientId?.toString(),
      name: undefined,
    };
  }
  return {
    cartId: cart._id?.toString(),
    client: clientObj,
    meals: Array.isArray(cart.meals)
      ? cart.meals.map((m) => ({
          mealId: m.mealId?._id?.toString() || m.mealId?.toString(),
          mealName: m.mealName,
          cookId: m.cookId?.toString(),
          cookName: m.cookName,
          quantity: m.quantity,
          price: m.price,
        }))
      : [],
    lastUpdated: formatArabicDate(cart.updatedAt),
    expiresOn: formatArabicDate(cart.expiresAt),
    totalPrice: `${total} جنيه`,
    itemCount: itemCount,
  };
}

const Cart = require("../models/Cart");
const Meal = require("../models/Meal");
const asyncHandler = require("../utils/asyncHandler");
const { createOrdersAndCheckout } = require("../controllers/orderController");

// إضافة وجبة للكارت
const addToCart = asyncHandler(async (req, res) => {
  if (!req.user || !req.user._id || req.user.role !== "client") {
    return res
      .status(403)
      .json({ success: false, message: "غير مصرح لك بإضافة وجبات إلى الكارت" });
  }
  const clientId = req.user._id;
  const { mealId, quantity = 1 } = req.body;

  // جلب الوجبة مع بيانات الطباخ
  const meal = await Meal.findById(mealId);
  if (!meal) {
    return res
      .status(404)
      .json({ success: false, message: "الوجبة غير موجودة" });
  }
  if (meal.quantity < quantity) {
    return res
      .status(400)
      .json({ success: false, message: "الكمية المطلوبة غير متوفرة" });
  }
  if (!meal.cook || !meal.cook.cookId) {
    return res
      .status(400)
      .json({ success: false, message: "الوجبة غير مرتبطة بطباخ" });
  }

  let cart = await Cart.findOne({ clientId })
    .populate({ path: "meals.mealId", select: "name price image quantity" })
    .populate({ path: "clientId", select: "name" });

  if (!cart) {
    cart = new Cart({ clientId, meals: [] });
    if (req.user && req.user.name) {
      const User = require("../models/User");
      await User.updateOne(
        { _id: clientId },
        { $set: { name: req.user.name } }
      );
    }
  }

  const existingItemIndex = cart.meals.findIndex((item) => {
    const id = item.mealId._id ? item.mealId._id : item.mealId;
    return id.toString() === String(mealId);
  });

  if (existingItemIndex > -1) {
    const newQuantity = cart.meals[existingItemIndex].quantity + quantity;
    if (newQuantity > meal.quantity) {
      return res
        .status(400)
        .json({ success: false, message: "الكمية المطلوبة غير متوفرة" });
    }
    cart.meals[existingItemIndex].quantity = newQuantity;
  } else {
    cart.meals.push({
      mealId,
      mealName: meal.name,
      cookId: meal.cook.cookId,
      cookName: meal.cook.name,
      quantity,
      price: meal.price,
    });
  }

  cart.updatedAt = new Date();
  await cart.save();

  await cart.populate({
    path: "meals.mealId",
    select: "name price image quantity",
  });
  await cart.populate({ path: "clientId", select: "name" });

  const total = cart.meals.reduce(
    (sum, item) => sum + item.mealId.price * item.quantity,
    0
  );
  const summary = buildCartSummary(cart, total, cart.getItemCount());
  res.status(200).json({
    success: true,
    message: "تم إضافة الوجبة لعربة الوجبات بنجاح",
    cartId: summary.cartId,
    client: summary.client,
    meals: summary.meals,
    lastUpdated: summary.lastUpdated,
    expiresOn: summary.expiresOn,
    totalPrice: summary.totalPrice,
    itemCount: summary.itemCount,
  });
});

// عرض عربة الوجبات
const getCart = asyncHandler(async (req, res) => {
  if (!req.user || !req.user._id) {
    return res
      .status(401)
      .json({ success: false, message: "يجب تسجيل الدخول أولاً" });
  }
  const clientId = req.user._id;

  const cart = await Cart.findOne({ clientId })
    .populate({
      path: "meals.mealId",
      select: "name price image quantity description category",
    })
    .populate({ path: "clientId", select: "name" });

  if (!cart || cart.meals.length === 0) {
    return res.status(200).json({
      success: true,
      message: "عربة الوجبات فارغة",
      cartId: null,
      clientId: clientId?.toString(),
      meals: [],
      lastUpdated: null,
      expiresOn: null,
      totalPrice: "0 جنيه",
      itemCount: 0,
    });
  }

  const total = cart.meals.reduce(
    (sum, item) => sum + item.mealId.price * item.quantity,
    0
  );
  const itemCount = cart.getItemCount();
  const summary = buildCartSummary(cart, total, itemCount);
  res.status(200).json({
    success: true,
    message: "تم جلب عربة الوجبات بنجاح",
    cartId: summary.cartId,
    client: summary.client,
    meals: summary.meals,
    lastUpdated: summary.lastUpdated,
    expiresOn: summary.expiresOn,
    totalPrice: summary.totalPrice,
    itemCount: summary.itemCount,
  });
});

// تحديث كمية وجبة في عربة الوجبات
const updateCartItem = asyncHandler(async (req, res) => {
  if (!req.user || !req.user._id) {
    return res
      .status(401)
      .json({ success: false, message: "يجب تسجيل الدخول أولاً" });
  }
  const clientId = req.user._id;

  const { mealId, quantity } = req.body;

  if (typeof quantity !== "number" || quantity <= 0) {
    return res
      .status(400)
      .json({ success: false, message: "الكمية يجب أن تكون أكبر من صفر" });
  }

  const meal = await Meal.findById(mealId);
  if (!meal) {
    return res
      .status(404)
      .json({ success: false, message: "الوجبة غير موجودة" });
  }
  if (meal.quantity < quantity) {
    return res
      .status(400)
      .json({ success: false, message: "الكمية المطلوبة غير متوفرة" });
  }

  const cart = await Cart.findOne({ clientId });
  if (!cart) {
    return res
      .status(404)
      .json({ success: false, message: "عربة الوجبات غير موجود" });
  }

  const itemIndex = cart.meals.findIndex((item) => {
    const id = item.mealId._id ? item.mealId._id : item.mealId;
    return id.toString() === String(mealId);
  });

  if (itemIndex === -1) {
    return res
      .status(404)
      .json({ success: false, message: "الوجبة غير موجودة في عربة الوجبات" });
  }

  cart.meals[itemIndex].quantity = quantity;
  cart.updatedAt = new Date();
  await cart.save();

  await cart.populate({
    path: "meals.mealId",
    select: "name price image quantity",
  });
  await cart.populate({ path: "clientId", select: "name" });

  const total = cart.meals.reduce(
    (sum, item) => sum + item.mealId.price * item.quantity,
    0
  );
  const summary = buildCartSummary(cart, total, cart.getItemCount());
  res.status(200).json({
    success: true,
    message: "تم تحديث عربة الوجبات بنجاح",
    cartId: summary.cartId,
    client: summary.client,
    meals: summary.meals,
    lastUpdated: summary.lastUpdated,
    expiresOn: summary.expiresOn,
    totalPrice: summary.totalPrice,
    itemCount: summary.itemCount,
  });
});

// حذف وجبة من عربة الوجبات
const removeFromCart = asyncHandler(async (req, res) => {
  if (!req.user || !req.user._id) {
    return res
      .status(401)
      .json({ success: false, message: "يجب تسجيل الدخول أولاً" });
  }
  const clientId = req.user._id;
  const { mealId } = req.params;

  const cart = await Cart.findOne({ clientId });
  if (!cart) {
    return res
      .status(404)
      .json({ success: false, message: "عربة الوجبات غير موجود" });
  }

  const itemIndex = cart.meals.findIndex((item) => {
    const id = item.mealId._id ? item.mealId._id : item.mealId;
    return id.toString() === String(mealId);
  });

  if (itemIndex === -1) {
    return res
      .status(404)
      .json({ success: false, message: "الوجبة غير موجودة في عربة الوجبات" });
  }

  cart.meals.splice(itemIndex, 1);
  cart.updatedAt = new Date();
  await cart.save();

  await cart.populate({
    path: "meals.mealId",
    select: "name price image quantity",
  });
  await cart.populate({ path: "clientId", select: "name" });

  const total = cart.meals.reduce(
    (sum, item) => sum + item.mealId.price * item.quantity,
    0
  );
  const summary = buildCartSummary(cart, total, cart.getItemCount());
  res.status(200).json({
    success: true,
    message: "تم حذف الوجبة من عربة الوجبات بنجاح",
    cartId: summary.cartId,
    client: summary.client,
    meals: summary.meals,
    lastUpdated: summary.lastUpdated,
    expiresOn: summary.expiresOn,
    totalPrice: summary.totalPrice,
    itemCount: summary.itemCount,
  });
});

// مسح عربة الوجبات بالكامل
const clearCart = asyncHandler(async (req, res) => {
  if (!req.user || !req.user._id) {
    return res
      .status(401)
      .json({ success: false, message: "يجب تسجيل الدخول أولاً" });
  }
  const clientId = req.user._id;

  const cart = await Cart.findOne({ clientId });
  if (!cart) {
    return res
      .status(404)
      .json({ success: false, message: "عربة الوجبات غير موجود" });
  }

  cart.meals = [];
  cart.updatedAt = new Date();
  await cart.save();

  await cart.populate({ path: "clientId", select: "name" });

  const summary = buildCartSummary(cart, 0, 0);
  res.status(200).json({
    success: true,
    message: "تم مسح عربة الوجبات بنجاح",
    cartId: summary.cartId,
    client: summary.client,
    meals: summary.meals,
    lastUpdated: summary.lastUpdated,
    expiresOn: summary.expiresOn,
    totalPrice: summary.totalPrice,
    itemCount: summary.itemCount,
  });
});

// الحصول على إحصائيات عربة الوجبات
const getCartStats = asyncHandler(async (req, res) => {
  if (!req.user || !req.user._id) {
    return res
      .status(401)
      .json({ success: false, message: "يجب تسجيل الدخول أولاً" });
  }
  const clientId = req.user._id;

  const cart = await Cart.findOne({ clientId }).populate({
    path: "meals.mealId",
    select: "price",
  });

  if (!cart || cart.meals.length === 0) {
    return res.status(200).json({
      success: true,
      message: "إحصائيات عربة الوجبات",
      data: {
        totalPrice: 0,
        itemCount: 0,
        uniqueItems: 0,
      },
    });
  }

  const total = cart.meals.reduce(
    (sum, item) => sum + item.mealId.price * item.quantity,
    0
  );
  const itemCount = cart.getItemCount();
  const uniqueItems = cart.meals.length;

  res.status(200).json({
    success: true,
    message: "إحصائيات عربة الوجبات",
    data: {
      totalPrice: total,
      itemCount,
      uniqueItems,
    },
  });
});

// تحويل عربة الوجبات إلى طلب (Checkout)
const checkoutFromCart = asyncHandler(async (req, res, next) => {
  if (!req.user || !req.user._id || req.user.role !== "client") {
    return res
      .status(403)
      .json({ success: false, message: "غير مصرح لك بإتمام الطلب" });
  }
  const clientId = req.user._id;
  const {
    client_name,
    client_phone,
    client_address,
    location,
    notes,
    payment = "cash",
    tax = 0,
    discount = 0,
  } = req.body;
  // جلب عربة الوجبات مع بيانات الوجبة فقط
  const cart = await Cart.findOne({ clientId }).populate({
    path: "meals.mealId",
    select: "name price quantity",
  });
  if (!cart || cart.meals.length === 0) {
    return res.status(400).json({
      success: false,
      message: "عربة الوجبات فارغة، لا يمكن إتمام الطلب",
    });
  }
  // Build meals array for checkout
  const meals = cart.meals.map((item) => ({
    meal_id: item.mealId._id,
    quantity: item.quantity,
  }));
  // Call the shared order/checkout logic
  const result = await createOrdersAndCheckout(
    {
      client_name,
      client_phone,
      client_address,
      location,
      notes,
      payment,
      tax,
      discount,
      meals,
    },
    req.user
  );
  if (result.success) {
    // Clear the cart after successful checkout
    cart.meals = [];
    cart.updatedAt = new Date();
    await cart.save();
    result.cart_cleared = true;
    return res.status(201).json(result);
  } else {
    return res.status(400).json(result);
  }
});

module.exports = {
  addToCart,
  getCart,
  updateCartItem,
  removeFromCart,
  clearCart,
  getCartStats,
  checkoutFromCart,
};
