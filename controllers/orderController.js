const Order = require("../models/Order");
const asyncHandler = require("../utils/asyncHandler");
const Cart = require("../models/Cart");
const Meal = require("../models/Meal");
const User = require("../models/User");

exports.createOrder = asyncHandler(async (req, res) => {
  const { customer_name, phone, address, items, payment_method } = req.body;

  // Validation
  if (!customer_name || !phone || !address || !items || items.length === 0) {
    return res.status(400).json({
      message: "جميع الحقول مطلوبة: customer_name, phone, address, items",
    });
  }

  const total_price = items.reduce((acc, item) => {
    return acc + item.quantity * item.unit_price;
  }, 0);

  const processedItems = items.map((item) => ({
    ...item,
    total_price: item.quantity * item.unit_price,
  }));

  // إضافة clientId للطلب (المستخدم المسجل)
  const order = await Order.create({
    customer_name,
    phone,
    address,
    items: processedItems,
    total_price,
    payment_method,
    clientId: req.user._id, // إضافة معرف العميل
  });

  res.status(201).json({
    success: true,
    data: order,
  });
});

exports.getAllOrders = asyncHandler(async (req, res) => {
  // يرجع فقط طلبات العميل
  const orders = await Order.find({ clientId: req.user._id }).sort({
    createdAt: -1,
  });
  res.json({
    success: true,
    count: orders.length,
    data: orders,
  });
});

exports.getOrderById = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) {
    return res.status(404).json({ message: "الطلب غير موجود" });
  }

  // التحقق من الصلاحيات
  // طباخ أو delivery أو admin يمكنهم رؤية أي طلب
  if (
    req.user.role === "cook" ||
    req.user.role === "delivery" ||
    req.user.role === "admin"
  ) {
    res.json({
      success: true,
      data: order,
    });
  }
  // العميل يمكنه رؤية طلباته فقط
  else if (req.user.role === "client") {
    if (order.clientId.toString() === req.user._id.toString()) {
      res.json({
        success: true,
        data: order,
      });
    } else {
      return res.status(403).json({
        message: "غير مصرح لك بعرض هذا الطلب",
      });
    }
  } else {
    return res.status(403).json({
      message: "غير مصرح لك بعرض الطلبات",
    });
  }
});

exports.updateOrderStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;

  // Validation for status
  const validStatuses = [
    "pending",
    "preparing",
    "on_the_way",
    "delivered",
    "cancelled",
  ];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({
      message:
        "الحالة غير صحيحة. الحالات المتاحة: pending, preparing, on_the_way, delivered, cancelled",
    });
  }

  const order = await Order.findById(req.params.id);
  if (!order) {
    return res.status(404).json({ message: "الطلب غير موجود" });
  }

  // التحقق من الصلاحيات
  // العميل يمكنه تحديث طلباته فقط
  if (req.user.role === "client") {
    if (order.clientId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        message: "غير مصرح لك بتحديث هذا الطلب",
      });
    }
  }
  // طباخ أو delivery أو admin يمكنهم تحديث أي طلب
  else if (
    req.user.role === "cook" ||
    req.user.role === "delivery" ||
    req.user.role === "admin"
  ) {
    // يمكنهم التحديث
  } else {
    return res.status(403).json({
      message: "غير مصرح لك بتحديث الطلبات",
    });
  }

  const updatedOrder = await Order.findByIdAndUpdate(
    req.params.id,
    { status },
    { new: true }
  );

  res.json({
    success: true,
    data: updatedOrder,
  });
});

exports.deleteOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) {
    return res.status(404).json({ message: "الطلب غير موجود" });
  }

  // التحقق من الصلاحيات
  // العميل يمكنه حذف طلباته فقط
  if (req.user.role === "client") {
    if (order.clientId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        message: "غير مصرح لك بحذف هذا الطلب",
      });
    }
  }
  // طباخ أو delivery أو admin يمكنهم حذف أي طلب
  else if (
    req.user.role === "cook" ||
    req.user.role === "delivery" ||
    req.user.role === "admin"
  ) {
    // يمكنهم الحذف
  } else {
    return res.status(403).json({
      message: "غير مصرح لك بحذف الطلبات",
    });
  }

  await Order.findByIdAndDelete(req.params.id);
  res.json({
    success: true,
    message: "تم حذف الطلب بنجاح",
  });
});

exports.checkout = asyncHandler(async (req, res) => {
  const clientId = req.user._id;

  // جلب بيانات المستخدم
  const user = await User.findById(clientId);
  if (!user) {
    return res
      .status(404)
      .json({ success: false, message: "المستخدم غير موجود." });
  }

  const customer_name = user.name;
  const phone = user.phone;
  const address = user.address;

  if (!customer_name || !phone || !address) {
    return res.status(400).json({
      success: false,
      message:
        "يرجى استكمال بياناتك الشخصية (الاسم، رقم الهاتف، العنوان) قبل تنفيذ الطلب.",
    });
  }

  // تحقق من وجود عناصر في السلة فقط
  const cart = await Cart.findOne({ clientId });
  if (cart && cart.items && cart.items.length > 0) {
    // جلب بيانات الوجبات
    const mealIds = cart.items.map((item) => item.mealId);
    const meals = await Meal.find({ _id: { $in: mealIds } });
    const items = cart.items
      .map((item) => {
        const meal = meals.find(
          (m) => m._id.toString() === item.mealId.toString()
        );
        if (!meal) return null;
        return {
          meal_id: meal._id,
          meal_name: meal.name,
          quantity: item.quantity,
          unit_price: meal.price,
          total_price: meal.price * item.quantity,
        };
      })
      .filter(Boolean);

    if (items.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "لا توجد وجبات صالحة في السلة." });
    }

    // حساب الإجمالي
    const total_price = items.reduce((sum, item) => sum + item.total_price, 0);

    // إنشاء الطلب
    const order = await Order.create({
      customer_name,
      phone,
      address,
      items,
      total_price,
      payment_method: "cash",
      clientId,
    });

    // تفريغ السلة
    cart.items = [];
    await cart.save();

    return res.status(201).json({
      success: true,
      message: "تم إنشاء الطلب من السلة بنجاح.",
      data: order,
    });
  }

  // السلة فارغة
  return res.status(400).json({
    success: false,
    message: "السلة فارغة، لا توجد عناصر متاحة لإتمام الطلب.",
  });
});
