const Order = require('../models/Order');
const asyncHandler = require('../utils/asyncHandler');
const Cart = require('../models/Cart');
const Meal = require('../models/Meal');

exports.createOrder = asyncHandler(async (req, res) => {
  const { customer_name, phone, address, items, payment_method } = req.body;

  // Validation
  if (!customer_name || !phone || !address || !items || items.length === 0) {
    return res.status(400).json({ 
      message: 'جميع الحقول مطلوبة: customer_name, phone, address, items' 
    });
  }

  const total_price = items.reduce((acc, item) => {
    return acc + (item.quantity * item.unit_price);
  }, 0);

  const processedItems = items.map(item => ({
    ...item,
    total_price: item.quantity * item.unit_price
  }));

  // إضافة userId للطلب (المستخدم المسجل)
  const order = await Order.create({
    customer_name,
    phone,
    address,
    items: processedItems,
    total_price,
    payment_method,
    userId: req.user._id // إضافة معرف المستخدم
  });

  res.status(201).json({
    success: true,
    data: order
  });
});

exports.getAllOrders = asyncHandler(async (req, res) => {
  let orders;
  
  // طباخ أو delivery يرى جميع الطلبات
  if (req.user.role === "cook" || req.user.role === "delivery") {
    orders = await Order.find().sort({ createdAt: -1 });
  } 
  // العميل يرى طلباته فقط
  else if (req.user.role === "client") {
    orders = await Order.find({ userId: req.user._id }).sort({ createdAt: -1 });
  }
  // admin يرى جميع الطلبات
  else if (req.user.role === "admin") {
    orders = await Order.find().sort({ createdAt: -1 });
  }
  else {
    return res.status(403).json({ 
      message: "غير مصرح لك بعرض الطلبات" 
    });
  }

  res.json({
    success: true,
    count: orders.length,
    data: orders
  });
});

exports.getOrderById = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) {
    return res.status(404).json({ message: 'الطلب غير موجود' });
  }

  // التحقق من الصلاحيات
  // طباخ أو delivery أو admin يمكنهم رؤية أي طلب
  if (req.user.role === "cook" || req.user.role === "delivery" || req.user.role === "admin") {
    res.json({
      success: true,
      data: order
    });
  }
  // العميل يمكنه رؤية طلباته فقط
  else if (req.user.role === "client") {
    if (order.userId.toString() === req.user._id.toString()) {
      res.json({
        success: true,
        data: order
      });
    } else {
      return res.status(403).json({ 
        message: 'غير مصرح لك بعرض هذا الطلب' 
      });
    }
  }
  else {
    return res.status(403).json({ 
      message: 'غير مصرح لك بعرض الطلبات' 
    });
  }
});

exports.updateOrderStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  
  // Validation for status
  const validStatuses = ['pending', 'preparing', 'on_the_way', 'delivered', 'cancelled'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ 
      message: 'الحالة غير صحيحة. الحالات المتاحة: pending, preparing, on_the_way, delivered, cancelled' 
    });
  }

  const order = await Order.findById(req.params.id);
  if (!order) {
    return res.status(404).json({ message: 'الطلب غير موجود' });
  }

  // التحقق من الصلاحيات
  // العميل يمكنه تحديث طلباته فقط
  if (req.user.role === "client") {
    if (order.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ 
        message: 'غير مصرح لك بتحديث هذا الطلب' 
      });
    }
  }
  // طباخ أو delivery أو admin يمكنهم تحديث أي طلب
  else if (req.user.role === "cook" || req.user.role === "delivery" || req.user.role === "admin") {
    // يمكنهم التحديث
  }
  else {
    return res.status(403).json({ 
      message: 'غير مصرح لك بتحديث الطلبات' 
    });
  }

  const updatedOrder = await Order.findByIdAndUpdate(
    req.params.id,
    { status },
    { new: true }
  );
  
  res.json({
    success: true,
    data: updatedOrder
  });
});

exports.deleteOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) {
    return res.status(404).json({ message: 'الطلب غير موجود' });
  }

  // التحقق من الصلاحيات
  // العميل يمكنه حذف طلباته فقط
  if (req.user.role === "client") {
    if (order.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ 
        message: 'غير مصرح لك بحذف هذا الطلب' 
      });
    }
  }
  // طباخ أو delivery أو admin يمكنهم حذف أي طلب
  else if (req.user.role === "cook" || req.user.role === "delivery" || req.user.role === "admin") {
    // يمكنهم الحذف
  }
  else {
    return res.status(403).json({ 
      message: 'غير مصرح لك بحذف الطلبات' 
    });
  }

  await Order.findByIdAndDelete(req.params.id);
  res.json({ 
    success: true,
    message: 'تم حذف الطلب بنجاح' 
  });
});

exports.checkout = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { customer_name, phone, address, payment_method } = req.body;

  // تحقق من الحقول المطلوبة
  if (!customer_name || !phone || !address) {
    return res.status(400).json({ message: 'جميع الحقول مطلوبة: customer_name, phone, address' });
  }

  // جلب السلة الخاصة بالمستخدم
  const cart = await Cart.findOne({ userId });
  if (!cart || !cart.items || cart.items.length === 0) {
    return res.status(400).json({ message: 'السلة فارغة' });
  }

  // جلب بيانات الوجبات
  const mealIds = cart.items.map(item => item.mealId);
  const meals = await Meal.find({ _id: { $in: mealIds } });

  // بناء عناصر الطلب
  const items = cart.items.map(item => {
    const meal = meals.find(m => m._id.toString() === item.mealId.toString());
    if (!meal) return null;
    return {
      meal_id: meal._id,
      meal_name: meal.name,
      quantity: item.quantity,
      unit_price: meal.price,
      total_price: meal.price * item.quantity
    };
  }).filter(Boolean);

  if (items.length === 0) {
    return res.status(400).json({ message: 'لا توجد وجبات صالحة في السلة' });
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
    payment_method,
    userId
  });

  // تفريغ السلة
  cart.items = [];
  await cart.save();

  res.status(201).json({
    success: true,
    data: order
  });
});
