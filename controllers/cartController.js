const Cart = require("../models/Cart");
const Meal = require("../models/Meal");
const asyncHandler = require("../utils/asyncHandler");
const { ApiResponse } = require("../utils/response");

// إضافة وجبة للكارت
const addToCart = asyncHandler(async (req, res) => {
  const { mealId, quantity = 1 } = req.body;
  const userId = req.user._id;

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
  let cart = await Cart.findOne({ userId }).populate({
    path: "items.mealId",
    select: "name price image quantity",
  });

  if (!cart) {
    cart = new Cart({ userId, items: [] });
  }

  // التحقق من وجود الوجبة في عربة الوجبات
  const existingItemIndex = cart.items.findIndex(
    (item) => item.mealId._id.toString() === mealId
  );

  if (existingItemIndex > -1) {
    // تحديث الكمية إذا كانت الوجبة موجودة
    const newQuantity = cart.items[existingItemIndex].quantity + quantity;
    if (newQuantity > meal.quantity) {
      return res
        .status(400)
        .json(new ApiResponse(false, "الكمية المطلوبة غير متوفرة"));
    }
    cart.items[existingItemIndex].quantity = newQuantity;
  } else {
    // إضافة وجبة جديدة
    cart.items.push({ mealId, quantity });
  }

  cart.updatedAt = new Date();
  await cart.save();

  // إعادة تحميل عربة الوجبات مع تفاصيل الوجبات
  await cart.populate({
    path: "items.mealId",
    select: "name price image quantity",
  });

  // حساب الإجمالي
  const total = cart.items.reduce((sum, item) => {
    return sum + item.mealId.price * item.quantity;
  }, 0);

  res.status(200).json(
    new ApiResponse(true, "تم إضافة الوجبة للكارت بنجاح", {
      cart,
      total,
      itemCount: cart.getItemCount(),
    })
  );
});

// عرض عربة الوجبات
const getCart = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const cart = await Cart.findOne({ userId }).populate({
    path: "items.mealId",
    select: "name price image quantity description category",
  });

  if (!cart || cart.items.length === 0) {
    return res.status(200).json(
      new ApiResponse(true, "عربة الوجبات فارغ", {
        cart: { items: [] },
        total: 0,
        itemCount: 0,
      })
    );
  }

  // حساب الإجمالي وعدد العناصر
  const total = cart.items.reduce((sum, item) => {
    return sum + item.mealId.price * item.quantity;
  }, 0);

  const itemCount = cart.getItemCount();

  res.status(200).json(
    new ApiResponse(true, "تم جلب عربة الوجبات بنجاح", {
      cart,
      total,
      itemCount,
    })
  );
});

// تحديث كمية وجبة في عربة الوجبات
const updateCartItem = asyncHandler(async (req, res) => {
  const { mealId, quantity } = req.body;
  const userId = req.user._id;

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

  const cart = await Cart.findOne({ userId });
  if (!cart) {
    return res
      .status(404)
      .json(new ApiResponse(false, "عربة الوجبات غير موجود"));
  }

  const itemIndex = cart.items.findIndex(
    (item) => item.mealId.toString() === mealId
  );

  if (itemIndex === -1) {
    return res
      .status(404)
      .json(new ApiResponse(false, "الوجبة غير موجودة في عربة الوجبات"));
  }

  cart.items[itemIndex].quantity = quantity;
  cart.updatedAt = new Date();
  await cart.save();

  // إعادة تحميل عربة الوجبات مع التفاصيل
  await cart.populate({
    path: "items.mealId",
    select: "name price image quantity",
  });

  const total = cart.items.reduce((sum, item) => {
    return sum + item.mealId.price * item.quantity;
  }, 0);

  res.status(200).json(
    new ApiResponse(true, "تم تحديث عربة الوجبات بنجاح", {
      cart,
      total,
      itemCount: cart.getItemCount(),
    })
  );
});

// حذف وجبة من عربة الوجبات
const removeFromCart = asyncHandler(async (req, res) => {
  const { mealId } = req.params;
  const userId = req.user._id;

  const cart = await Cart.findOne({ userId });
  if (!cart) {
    return res
      .status(404)
      .json(new ApiResponse(false, "عربة الوجبات غير موجود"));
  }

  const itemIndex = cart.items.findIndex(
    (item) => item.mealId.toString() === mealId
  );

  if (itemIndex === -1) {
    return res
      .status(404)
      .json(new ApiResponse(false, "الوجبة غير موجودة في عربة الوجبات"));
  }

  cart.items.splice(itemIndex, 1);
  cart.updatedAt = new Date();
  await cart.save();

  // إعادة تحميل عربة الوجبات مع التفاصيل
  await cart.populate({
    path: "items.mealId",
    select: "name price image quantity",
  });

  const total = cart.items.reduce((sum, item) => {
    return sum + item.mealId.price * item.quantity;
  }, 0);

  res.status(200).json(
    new ApiResponse(true, "تم حذف الوجبة من عربة الوجبات بنجاح", {
      cart,
      total,
      itemCount: cart.getItemCount(),
    })
  );
});

// مسح عربة الوجبات بالكامل
const clearCart = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const cart = await Cart.findOne({ userId });
  if (!cart) {
    return res
      .status(404)
      .json(new ApiResponse(false, "عربة الوجبات غير موجود"));
  }

  cart.items = [];
  cart.updatedAt = new Date();
  await cart.save();

  res.status(200).json(
    new ApiResponse(true, "تم مسح عربة الوجبات بنجاح", {
      cart,
      total: 0,
      itemCount: 0,
    })
  );
});

// الحصول على إحصائيات عربة الوجبات
const getCartStats = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const cart = await Cart.findOne({ userId }).populate({
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
