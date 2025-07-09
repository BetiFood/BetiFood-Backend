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
          quantity: m.quantity,
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
const { ApiResponse } = require("../utils/response");

// إضافة وجبة للكارت
const addToCart = asyncHandler(async (req, res) => {
  const { mealId, quantity = 1 } = req.body;
  const clientId = req.user._id;

  // التحقق من وجود الوجبة
  const meal = await Meal.findById(mealId);
  if (!meal) {
    return res.status(404).json(new ApiResponse(false, "الوجبة غير موجودة"));
  }

  // التحقق من توفر الكمية
  if (meal.quantity < quantity) {
    return res
      .status(400)
      .json(new ApiResponse(false, "الكمية المطلوبة غير متوفرة"));
  }

  // البحث عن كارت المستخدم أو إنشاء واحد جديد
  let cart = await Cart.findOne({ clientId })
    .populate({
      path: "meals.mealId",
      select: "name price image quantity",
    })
    .populate({
      path: "clientId",
      select: "name",
    });

  if (!cart) {
    // Populate clientId with user name from req.user if available
    cart = new Cart({ clientId, meals: [] });
    // إذا كان req.user.name موجود، حدث اسم العميل في الداتابيز
    if (req.user && req.user.name) {
      const User = require("../models/User");
      await User.updateOne(
        { _id: clientId },
        { $set: { name: req.user.name } }
      );
    }
  }

  // التحقق من وجود الوجبة في عربة الوجبات
  const existingItemIndex = cart.meals.findIndex(
    (item) => item.mealId._id.toString() === mealId
  );

  if (existingItemIndex > -1) {
    // تحديث الكمية إذا كانت الوجبة موجودة
    const newQuantity = cart.meals[existingItemIndex].quantity + quantity;
    if (newQuantity > meal.quantity) {
      return res
        .status(400)
        .json(new ApiResponse(false, "الكمية المطلوبة غير متوفرة"));
    }
    cart.meals[existingItemIndex].quantity = newQuantity;
  } else {
    // إضافة وجبة جديدة
    cart.meals.push({ mealId, quantity });
  }

  cart.updatedAt = new Date();
  await cart.save();

  // إعادة تحميل عربة الوجبات مع تفاصيل الوجبات واسم العميل
  await cart.populate({
    path: "meals.mealId",
    select: "name price image quantity",
  });
  await cart.populate({
    path: "clientId",
    select: "name",
  });

  // حساب الإجمالي
  const total = cart.meals.reduce((sum, item) => {
    return sum + item.mealId.price * item.quantity;
  }, 0);

  // تجهيز ملخص السلة
  const summary = buildCartSummary(cart, total, cart.getItemCount());
  res.status(200).json({
    success: true,
    message: "تم إضافة الوجبة للكارت بنجاح",
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
  const clientId = req.user._id;

  const cart = await Cart.findOne({ clientId })
    .populate({
      path: "meals.mealId",
      select: "name price image quantity description category",
    })
    .populate({
      path: "clientId",
      select: "name",
    });

  if (!cart || cart.meals.length === 0) {
    return res.status(200).json({
      success: true,
      message: "عربة الوجبات فارغ",
      cartId: null,
      clientId: clientId?.toString(),
      meals: [],
      lastUpdated: null,
      expiresOn: null,
      totalPrice: "0 جنيه",
      itemCount: 0,
    });
  }

  // حساب الإجمالي وعدد العناصر
  const total = cart.meals.reduce((sum, item) => {
    return sum + item.mealId.price * item.quantity;
  }, 0);

  const itemCount = cart.getItemCount();

  // تجهيز ملخص السلة
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
  // إذا كان req.user.name موجود، حدث اسم العميل في الداتابيز
  if (req.user && req.user.name) {
    const User = require("../models/User");
    await User.updateOne({ _id: clientId }, { $set: { name: req.user.name } });
  }
  const { mealId, quantity } = req.body;
  const clientId = req.user._id;

  if (quantity <= 0) {
    return res
      .status(400)
      .json(new ApiResponse(false, "الكمية يجب أن تكون أكبر من صفر"));
  }

  // التحقق من وجود الوجبة
  const meal = await Meal.findById(mealId);
  if (!meal) {
    return res.status(404).json(new ApiResponse(false, "الوجبة غير موجودة"));
  }

  // التحقق من توفر الكمية
  if (meal.quantity < quantity) {
    return res
      .status(400)
      .json(new ApiResponse(false, "الكمية المطلوبة غير متوفرة"));
  }

  const cart = await Cart.findOne({ clientId });
  if (!cart) {
    return res
      .status(404)
      .json(new ApiResponse(false, "عربة الوجبات غير موجود"));
  }

  const itemIndex = cart.meals.findIndex(
    (item) => item.mealId.toString() === mealId
  );

  if (itemIndex === -1) {
    return res
      .status(404)
      .json(new ApiResponse(false, "الوجبة غير موجودة في عربة الوجبات"));
  }

  cart.meals[itemIndex].quantity = quantity;
  cart.updatedAt = new Date();
  await cart.save();

  // إعادة تحميل عربة الوجبات مع التفاصيل واسم العميل
  await cart.populate({
    path: "meals.mealId",
    select: "name price image quantity",
  });
  await cart.populate({
    path: "clientId",
    select: "name",
  });

  const total = cart.meals.reduce((sum, item) => {
    return sum + item.mealId.price * item.quantity;
  }, 0);

  // تجهيز ملخص السلة
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
  // إذا كان req.user.name موجود، حدث اسم العميل في الداتابيز
  if (req.user && req.user.name) {
    const User = require("../models/User");
    await User.updateOne({ _id: clientId }, { $set: { name: req.user.name } });
  }
  const { mealId } = req.params;
  const clientId = req.user._id;

  const cart = await Cart.findOne({ clientId });
  if (!cart) {
    return res
      .status(404)
      .json(new ApiResponse(false, "عربة الوجبات غير موجود"));
  }

  const itemIndex = cart.meals.findIndex(
    (item) => item.mealId.toString() === mealId
  );

  if (itemIndex === -1) {
    return res
      .status(404)
      .json(new ApiResponse(false, "الوجبة غير موجودة في عربة الوجبات"));
  }

  cart.meals.splice(itemIndex, 1);
  cart.updatedAt = new Date();
  await cart.save();

  // إعادة تحميل عربة الوجبات مع التفاصيل واسم العميل
  await cart.populate({
    path: "meals.mealId",
    select: "name price image quantity",
  });
  await cart.populate({
    path: "clientId",
    select: "name",
  });

  const total = cart.meals.reduce((sum, item) => {
    return sum + item.mealId.price * item.quantity;
  }, 0);

  // تجهيز ملخص السلة
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
  // إذا كان req.user.name موجود، حدث اسم العميل في الداتابيز
  if (req.user && req.user.name) {
    const User = require("../models/User");
    await User.updateOne({ _id: clientId }, { $set: { name: req.user.name } });
  }
  const clientId = req.user._id;

  const cart = await Cart.findOne({ clientId });
  if (!cart) {
    return res
      .status(404)
      .json(new ApiResponse(false, "عربة الوجبات غير موجود"));
  }

  cart.meals = [];
  cart.updatedAt = new Date();
  await cart.save();

  // إعادة تحميل اسم العميل
  await cart.populate({
    path: "clientId",
    select: "name",
  });
  // تجهيز ملخص السلة
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
  const clientId = req.user._id;

  const cart = await Cart.findOne({ clientId }).populate({
    path: "items.mealId",
    select: "price",
  });

  if (!cart || cart.items.length === 0) {
    return res.status(200).json(
      new ApiResponse(true, "إحصائيات عربة الوجبات", {
        total: 0,
        itemCount: 0,
        uniqueItems: 0,
      })
    );
  }

  const total = cart.items.reduce((sum, item) => {
    return sum + item.mealId.price * item.quantity;
  }, 0);

  const itemCount = cart.getItemCount();
  const uniqueItems = cart.items.length;

  res.status(200).json(
    new ApiResponse(true, "إحصائيات عربة الوجبات", {
      total,
      itemCount,
      uniqueItems,
    })
  );
});

module.exports = {
  addToCart,
  getCart,
  updateCartItem,
  removeFromCart,
  clearCart,
  getCartStats,
};
