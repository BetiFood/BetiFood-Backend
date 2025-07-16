const Order = require("../models/Order");
const Cart = require("../models/Cart");
const Meal = require("../models/Meal");
const asyncHandler = require("../utils/asyncHandler");
const { ApiResponse } = require("../utils/response");
const mongoose = require("mongoose");

// دالة ترجمة حالات الطلب
const translateStatus = (status) => {
  const statusTranslations = {
    pending: "انتظار",
    preparing: "قيد التحضير",
    completed: "مكتمل",
    delivering: "قيد التوصيل",
    delivered: "تم التوصيل",
    cancelled: "ملغي",
  };
  return statusTranslations[status] || status;
};

// دالة ترجمة طرق الدفع
const translatePaymentMethod = (method) => {
  const methodTranslations = {
    cash: "كاش",
    online: "إلكتروني",
  };
  return methodTranslations[method] || method;
};

// دالة ترجمة حالة الدفع
const translatePaymentStatus = (status) => {
  const statusTranslations = {
    pending: "انتظار",
    paid: "مدفوع",
    failed: "فشل",
  };
  return statusTranslations[status] || status;
};

// دالة مساعدة لترجمة الحالات في الرسائل
const translateStatusInMessage = (message) => {
  const statusTranslations = {
    pending: "انتظار",
    preparing: "قيد التحضير",
    completed: "مكتمل",
    delivering: "قيد التوصيل",
    delivered: "تم التوصيل",
    cancelled: "ملغي",
  };

  let translatedMessage = message;
  Object.keys(statusTranslations).forEach((englishStatus) => {
    const arabicStatus = statusTranslations[englishStatus];
    translatedMessage = translatedMessage.replace(
      new RegExp(englishStatus, "g"),
      arabicStatus
    );
  });

  return translatedMessage;
};

// Helper function to format order response
const formatOrderResponse = (order) => {
  return {
    order_id: order._id,
    client: {
      id: order.client_id._id || order.client_id,
      name: order.client_name,
      email: order.client_id.email || "",
      phone: order.phone,
      address: order.address,
    },
    meals: order.meals.map((meal) => ({
      id: meal.mealId._id || meal.mealId,
      name: meal.mealName || meal.mealId.name || "",
      cookId: meal.cookId,
      cookName: meal.cookName,
      unit_price: meal.price,
      quantity: meal.quantity,
      total_price: meal.price * meal.quantity,
    })),
    pricing: {
      sub_total: order.total_price,
      delivery_fee: order.delivery_fee,
      tax: order.tax_amount,
      discount: order.discount_amount,
      final_amount: order.final_amount,
    },
    payment: {
      method: translatePaymentMethod(order.payment.method),
      status: translatePaymentStatus(order.payment.status),
      amount_due: order.payment.amount_due,
      paid: order.payment.paid,
      refunded: order.payment.refunded,
    },
    status: translateStatus(order.status),
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
    { path: "meals.mealId", select: "name price" },
    { path: "client_id", select: "name email" },
    { path: "assigned_cook", select: "name" },
    { path: "assigned_delivery", select: "name" },
  ];

  // فلترة الطلبات حسب دور المستخدم
  switch (req.userRole) {
    case "client":
      filter = { client_id: new mongoose.Types.ObjectId(req.userId) };
      break;
    case "cook":
      filter = {
        "meals.cookId": new mongoose.Types.ObjectId(req.userId),
      };
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
          { assigned_delivery: new mongoose.Types.ObjectId(req.userId) },
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

  // استخدم formatOrderResponse فقط بدون أي معالجة إضافية
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
    "meals.cookId": new mongoose.Types.ObjectId(req.userId),
    $or: [{ assigned_cook: { $exists: false } }, { assigned_cook: null }],
  };

  const populateOptions = [
    { path: "meals.mealId", select: "name price image" },
    { path: "client_id", select: "name email" },
  ];

  const orders = await Order.find(filter)
    .populate(populateOptions)
    .sort({ createdAt: -1 });

  // استخدم formatOrderResponse فقط
  const formattedOrders = orders.map((order) => formatOrderResponse(order));

  res.status(200).json({
    success: true,
    message: "تم جلب الطلبات المتاحة بنجاح",
    orders: formattedOrders,
    count: formattedOrders.length,
  });
});

// جلب طلبات الطباخ الخاصة (التي قام بإنشائها)
const getMyCookOrders = asyncHandler(async (req, res) => {
  const filter = {
    "meals.cookId": new mongoose.Types.ObjectId(req.userId),
  };

  const populateOptions = [
    { path: "meals.mealId", select: "name price image" },
    { path: "client_id", select: "name email" },
    { path: "assigned_delivery", select: "name" },
  ];

  const orders = await Order.find(filter)
    .populate(populateOptions)
    .sort({ createdAt: -1 });

  // استخدم formatOrderResponse فقط
  const formattedOrders = orders.map((order) => formatOrderResponse(order));

  res.status(200).json({
    success: true,
    message: "تم جلب طلباتك بنجاح",
    orders: formattedOrders,
    count: formattedOrders.length,
  });
});

// جلب الطلبات المتاحة لمندوب التوصيل (completed وغير مخصصة)
const getAvailableOrdersForDelivery = asyncHandler(async (req, res) => {
  if (!req.user.isIdentityVerified) {
    return res.status(403).json({
      success: false,
      message: "لا يمكنك رؤية الطلبات حتى يتم توثيق هويتك من الإدارة.",
    });
  }
  const filter = {
    status: "completed",
    $or: [
      { assigned_delivery: { $exists: false } },
      { assigned_delivery: null },
    ],
  };

  const populateOptions = [
    { path: "meals.mealId", select: "name price image" },
    { path: "client_id", select: "name email phone address" },
    { path: "assigned_cook", select: "name" },
  ];

  const orders = await Order.find(filter)
    .populate(populateOptions)
    .sort({ createdAt: -1 });

  // استخدم formatOrderResponse فقط
  const formattedOrders = orders.map((order) => formatOrderResponse(order));

  res.status(200).json({
    success: true,
    message: `تم جلب ${formattedOrders.length} طلب متاح للتوصيل بنجاح`,
    orders: formattedOrders,
    count: formattedOrders.length,
  });
});

// جلب طلبات مندوب التوصيل الخاصة (التي قبلها)
const getMyDeliveryOrders = asyncHandler(async (req, res) => {
  if (!req.user.isIdentityVerified) {
    return res.status(403).json({
      success: false,
      message: "لا يمكنك رؤية الطلبات حتى يتم توثيق هويتك من الإدارة.",
    });
  }
  const filter = {
    assigned_delivery: new mongoose.Types.ObjectId(req.userId),
  };

  const populateOptions = [
    { path: "meals.mealId", select: "name price image" },
    { path: "client_id", select: "name email phone address" },
    { path: "assigned_cook", select: "name" },
  ];

  const orders = await Order.find(filter)
    .populate(populateOptions)
    .sort({ createdAt: -1 });

  // استخدم formatOrderResponse فقط
  const formattedOrders = orders.map((order) => formatOrderResponse(order));

  res.status(200).json({
    success: true,
    message: `تم جلب ${formattedOrders.length} طلب من طلباتك بنجاح`,
    orders: formattedOrders,
    count: formattedOrders.length,
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
    phone,
    address,
    meals,
    delivery_confirmed,
    client_received,
  } = req.body;

  const order = await Order.findById(id).populate([
    { path: "meals.mealId", select: "name price image" },
    { path: "client_id", select: "name email" },
    { path: "assigned_cook", select: "name" },
    { path: "assigned_delivery", select: "name" },
  ]);

  if (!order) {
    return res.status(404).json({
      success: false,
      message: "الطلب غير موجود",
    });
  }

  // التحقق من الصلاحيات حسب الدور
  let canUpdate = false;
  let allowedStatuses = [];
  let updateMessage = "";

  switch (req.userRole) {
    case "client": {
      // العميل يمكنه فقط تحديث الطلبات التي تخصه
      const orderClientId = order.client_id._id
        ? order.client_id._id.toString()
        : order.client_id.toString();
      if (orderClientId !== req.userId.toString()) {
        return res.status(403).json({
          success: false,
          message: "غير مصرح لك بتحديث هذا الطلب - الطلب لا يخصك",
        });
      }
      // إلغاء الطلب
      if (status === "cancelled" && order.status === "pending") {
        canUpdate = true;
        order.status = status;
        updateMessage = "تم إلغاء الطلب بنجاح";
      }
      // تحديث البيانات الشخصية
      else if (
        order.status === "pending" &&
        (client_name || phone || address)
      ) {
        canUpdate = true;
        updateMessage = "تم تحديث البيانات الشخصية بنجاح";
        if (client_name) order.client_name = client_name;
        if (phone) order.phone = phone;
        if (address) order.address = address;
      }
      // تحديث الكميات
      else if (order.status === "pending" && meals) {
        canUpdate = true;
        updateMessage = "تم تحديث الكميات بنجاح";
        order.meals = meals;
        // إعادة حساب السعر الإجمالي
        order.total_price = meals.reduce(
          (sum, meal) => sum + meal.price * meal.quantity,
          0
        );
        order.final_amount =
          order.total_price +
          order.delivery_fee +
          order.tax_amount -
          order.discount_amount;
        order.payment.amount_due = order.final_amount;
      }
      // تأكيد استلام الطلب
      else if (client_received && order.status === "delivering") {
        canUpdate = true;
        order.delivery_status.received_by_client = true;
        order.delivery_status.client_confirmed_at = new Date();
        updateMessage = "تم تأكيد استلام الطلب";
      }
      // تحديث الملاحظات فقط
      else if (notes && order.status === "pending") {
        canUpdate = true;
        updateMessage = "تم تحديث الملاحظات بنجاح";
        order.notes = notes;
      }
      // إذا لم يتم تحديد أي تحديث محدد
      else if (
        !status &&
        !client_name &&
        !phone &&
        !address &&
        !meals &&
        !client_received &&
        !notes
      ) {
        return res.status(400).json({
          success: false,
          message: "يجب تحديد ما تريد تحديثه",
        });
      }
      // إذا كان الطلب في حالة لا تسمح بالتحديث
      else if (order.status !== "pending" && order.status !== "delivering") {
        return res.status(400).json({
          success: false,
          message: `لا يمكن تحديث الطلب في حالة ${translateStatus(
            order.status
          )}`,
        });
      }
      // حماية: تجاهل أي حقول تخص cook أو delivery
      break;
    }
    case "cook": {
      allowedStatuses = ["completed", "cancelled"];
      // الشيف يمكنه فقط تحديث الطلبات التي تحتوي على وجبات من صنعه
      const hasCookMeals = order.meals.some(
        (meal) => meal.cookId.toString() === req.userId.toString()
      );
      if (!hasCookMeals) {
        return res.status(403).json({
          success: false,
          message:
            "غير مصرح لك بتحديث هذا الطلب - الطلب لا يحتوي على وجبات من صنعك",
        });
      }
      // قبول الطلب (من pending إلى preparing)
      if (status === "preparing" && order.status === "pending") {
        canUpdate = true;
        order.status = status;
        order.assigned_cook = req.userId;
        updateMessage = "تم قبول الطلب بنجاح";
      }
      // إلغاء الطلب من قبل الشيف
      if (status === "cancelled" && ["pending", "preparing"].includes(order.status)) {
        canUpdate = true;
        order.status = status;
        updateMessage = "تم إلغاء الطلب بواسطة الشيف بنجاح";
      }
      // تحديث الحالة الأخرى (مثلاً من preparing إلى completed أو cancelled)
      else if (status && allowedStatuses.includes(status)) {
        canUpdate = true;
        order.status = status;
        updateMessage = `تم تحديث حالة الطلب إلى ${translateStatus(status)}`;
      }
      // تحديث الملاحظات فقط
      else if (notes && !status) {
        canUpdate = true;
        updateMessage = "تم تحديث الملاحظات بنجاح";
        order.notes = notes;
      }
      // إذا لم يتم تحديد أي تحديث محدد
      else if (!status && !notes) {
        return res.status(400).json({
          success: false,
          message: "يجب تحديد الحالة أو الملاحظات للتحديث",
        });
      }
      // إذا كانت الحالة غير مسموحة
      else if (status && !allowedStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: `الحالة ${translateStatus(
            status
          )} غير مسموحة للشيف. الحالات المسموحة: ${allowedStatuses
            .map((s) => translateStatus(s))
            .join(", ")}`,
        });
      }
      // حماية: تجاهل أي حقول تخص بيانات العميل أو التوصيل
      break;
    }
    case "delivery": {
      allowedStatuses = ["delivering", "delivered"];
      // مندوب التوصيل يمكنه فقط تحديث الطلبات المخصصة له
      const orderAssignedDelivery = order.assigned_delivery?._id
        ? order.assigned_delivery._id.toString()
        : order.assigned_delivery?.toString();
      if (orderAssignedDelivery !== req.userId.toString()) {
        return res.status(403).json({
          success: false,
          message: "غير مصرح لك بتحديث هذا الطلب - الطلب غير مخصص لك",
        });
      }
      // قبول الطلب للتوصيل (من completed إلى delivering)
      if (
        status === "delivering" &&
        order.status === "completed" &&
        !order.assigned_delivery
      ) {
        canUpdate = true;
        order.assigned_delivery = req.userId;
        order.status = status;
        updateMessage = "تم قبول الطلب للتوصيل";
      }
      // تحديث طلب مخصص له
      else if (status && allowedStatuses.includes(status)) {
        canUpdate = true;
        order.status = status;
        updateMessage = `تم تحديث حالة التوصيل إلى ${translateStatus(status)}`;
      }
      // تأكيد تسليم الطلب
      else if (delivery_confirmed && order.status === "delivering") {
        canUpdate = true;
        order.delivery_status.delivered_by_delivery = true;
        order.delivery_status.delivery_confirmed_at = new Date();
        updateMessage = "تم تأكيد تسليم الطلب";
      }
      // تحديث الملاحظات فقط
      else if (notes && !status && !delivery_confirmed) {
        canUpdate = true;
        updateMessage = "تم تحديث الملاحظات بنجاح";
        order.notes = notes;
      }
      // إذا لم يتم تحديد أي تحديث محدد
      else if (!status && !delivery_confirmed && !notes) {
        return res.status(400).json({
          success: false,
          message: "يجب تحديد الحالة أو تأكيد التسليم أو الملاحظات للتحديث",
        });
      }
      // إذا كانت الحالة غير مسموحة
      else if (status && !allowedStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: `الحالة ${translateStatus(
            status
          )} غير مسموحة لمندوب التوصيل. الحالات المسموحة: ${allowedStatuses
            .map((s) => translateStatus(s))
            .join(", ")}`,
        });
      }
      // حماية: تجاهل أي حقول تخص بيانات العميل أو الطباخ
      break;
    }
    case "admin": {
      // المدير يمكنه تحديث أي شيء
      canUpdate = true;
      if (status) {
        order.status = status;
        updateMessage = `تم تحديث حالة الطلب إلى ${translateStatus(status)}`;
      } else {
        updateMessage = "تم تحديث الطلب بنجاح";
      }
      // الأدمن يقدر يعدل أي حاجة
      if (notes) order.notes = notes;
      if (estimated_delivery_time)
        order.estimated_delivery_time = estimated_delivery_time;
      if (client_name) order.client_name = client_name;
      if (phone) order.phone = phone;
      if (address) order.address = address;
      if (meals) order.meals = meals;
      if (order.meals) {
        order.total_price = order.meals.reduce(
          (sum, meal) => sum + meal.price * meal.quantity,
          0
        );
        order.final_amount =
          order.total_price +
          order.delivery_fee +
          order.tax_amount -
          order.discount_amount;
        order.payment.amount_due = order.final_amount;
      }
      if (order.assigned_cook) updateData.assigned_cook = order.assigned_cook;
      if (order.assigned_delivery)
        updateData.assigned_delivery = order.assigned_delivery;
      if (order.delivery_status)
        updateData.delivery_status = order.delivery_status;
      break;
    }
    default:
      return res.status(403).json({
        success: false,
        message: "دور غير معروف",
      });
  }

  if (!canUpdate) {
    return res.status(403).json({
      success: false,
      message: "غير مصرح لك بتحديث هذا الطلب",
    });
  }

  // حفظ التحديثات باستخدام findByIdAndUpdate
  const updateData = {};

  // فقط الحقول المسموحة حسب الدور
  switch (req.userRole) {
    case "client":
      if (order.status) updateData.status = order.status;
      if (order.notes) updateData.notes = order.notes;
      if (order.client_name) updateData.client_name = order.client_name;
      if (order.phone) updateData.phone = order.phone;
      if (order.address) updateData.address = order.address;
      if (order.meals) updateData.meals = order.meals;
      if (order.total_price) updateData.total_price = order.total_price;
      if (order.final_amount) updateData.final_amount = order.final_amount;
      if (order.payment) updateData.payment = order.payment;
      if (order.delivery_status)
        updateData.delivery_status = order.delivery_status;
      break;
    case "cook":
      if (order.status) updateData.status = order.status;
      if (order.notes) updateData.notes = order.notes;
      if (order.assigned_cook) updateData.assigned_cook = order.assigned_cook;
      break;
    case "delivery":
      if (order.status) updateData.status = order.status;
      if (order.notes) updateData.notes = order.notes;
      if (order.assigned_delivery)
        updateData.assigned_delivery = order.assigned_delivery;
      if (order.delivery_status)
        updateData.delivery_status = order.delivery_status;
      break;
    case "admin":
      if (order.status) updateData.status = order.status;
      if (order.notes) updateData.notes = order.notes;
      if (order.estimated_delivery_time)
        updateData.estimated_delivery_time = order.estimated_delivery_time;
      if (order.client_name) updateData.client_name = order.client_name;
      if (order.phone) updateData.phone = order.phone;
      if (order.address) updateData.address = order.address;
      if (order.meals) updateData.meals = order.meals;
      if (order.total_price) updateData.total_price = order.total_price;
      if (order.final_amount) updateData.final_amount = order.final_amount;
      if (order.payment) updateData.payment = order.payment;
      if (order.assigned_cook) updateData.assigned_cook = order.assigned_cook;
      if (order.assigned_delivery)
        updateData.assigned_delivery = order.assigned_delivery;
      if (order.delivery_status)
        updateData.delivery_status = order.delivery_status;
      break;
  }

  await Order.findByIdAndUpdate(id, updateData, { new: true });

  // إعادة جلب الطلب المحدث مع البيانات المحدثة
  const updatedOrder = await Order.findById(id).populate([
    { path: "meals.mealId", select: "name price image" },
    { path: "client_id", select: "name email" },
    { path: "assigned_cook", select: "name" },
    { path: "assigned_delivery", select: "name" },
  ]);

  const formattedOrder = formatOrderResponse(updatedOrder);

  res.status(200).json({
    success: true,
    message: updateMessage || "تم تحديث الطلب بنجاح",
    order: formattedOrder,
  });
});

// إنشاء طلب جديد (checkout)
const checkout = asyncHandler(async (req, res) => {
  const {
    client_name,
    phone,
    address,
    notes,
    payment_method = "cash",
    delivery_fee = 20,
    tax_amount = 10,
    discount_amount = 5,
  } = req.body;

  // التحقق من وجود سلة مشتريات
  const cart = await Cart.findOne({ clientId: req.userId }).populate({
    path: "meals.mealId",
    select: "name price image quantity",
  });

  if (!cart || cart.meals.length === 0) {
    return res.status(400).json({
      success: false,
      message: "سلة المشتريات فارغة",
    });
  }

  // التحقق من توفر الكميات
  for (const item of cart.meals) {
    if (item.mealId.quantity < item.quantity) {
      return res.status(400).json({
        success: false,
        message: `الكمية المطلوبة غير متوفرة للوجبة: ${item.mealId.name}`,
      });
    }
  }

  // إنشاء الطلب مع جميع بيانات الوجبة والطباخ
  const orderMeals = cart.meals.map((item) => ({
    mealId: item.mealId._id,
    mealName: item.mealName,
    cookId: item.cookId,
    cookName: item.cookName,
    quantity: item.quantity,
    price: item.price,
  }));

  const total_price = cart.meals.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  const final_amount =
    total_price + delivery_fee + tax_amount - discount_amount;

  const order = await Order.create({
    client_name: client_name || req.user.name,
    phone: phone || req.user.phone || "",
    address: address || req.user.address || "",
    client_id: req.userId,
    meals: orderMeals,
    total_price,
    delivery_fee,
    tax_amount,
    discount_amount,
    final_amount,
    payment: {
      method: payment_method,
      status: "pending",
      amount_due: final_amount,
      paid: 0,
      refunded: 0,
    },
    notes,
    status: "pending",
  });

  // تحديث كميات الوجبات
  for (const item of cart.meals) {
    await Meal.findByIdAndUpdate(item.mealId._id, {
      $inc: { quantity: -item.quantity },
    });
  }

  // مسح سلة المشتريات
  cart.meals = [];
  await cart.save();

  const populatedOrder = await Order.findById(order._id).populate([
    { path: "meals.mealId", select: "name price image" },
    { path: "client_id", select: "name email" },
  ]);

  const formattedOrder = formatOrderResponse(populatedOrder);

  res.status(201).json({
    success: true,
    message: "تم إنشاء الطلب بنجاح",
    order: formattedOrder,
  });
});

// جلب طلب واحد
const getOrder = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const order = await Order.findById(id).populate([
    { path: "meals.mealId", select: "name price image description" },
    { path: "client_id", select: "name email" },
    { path: "assigned_cook", select: "name" },
    { path: "assigned_delivery", select: "name" },
  ]);

  if (!order) {
    return res.status(404).json({
      success: false,
      message: "الطلب غير موجود",
    });
  }

  // التحقق من الصلاحيات
  if (req.userRole === "client") {
    // تحويل client_id إلى string للمقارنة
    const orderClientId = order.client_id._id
      ? order.client_id._id.toString()
      : order.client_id.toString();
    if (orderClientId !== req.userId.toString()) {
      return res.status(403).json({
        success: false,
        message: "غير مصرح لك بعرض هذا الطلب",
      });
    }
  } else if (req.userRole === "cook") {
    // التحقق من أن الطلب يحتوي على وجبات من صنع هذا الطباخ
    const hasCookMeals = order.meals.some(
      (meal) => meal.cookId.toString() === req.userId.toString()
    );
    if (!hasCookMeals) {
      return res.status(403).json({
        success: false,
        message:
          "غير مصرح لك بعرض هذا الطلب - الطلب لا يحتوي على وجبات من صنعك",
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
    { path: "meals.mealId", select: "name price image" },
    { path: "client_id", select: "name email" },
  ]);

  if (!order) {
    return res.status(404).json({
      success: false,
      message: "الطلب غير موجود",
    });
  }

  // التحقق من أن الطلب في حالة pending وغير مخصص
  if (order.status !== "pending") {
    return res.status(400).json({
      success: false,
      message: "يمكن قبول الطلبات في حالة انتظار فقط",
    });
  }

  if (order.assigned_cook) {
    return res.status(400).json({
      success: false,
      message: "الطلب مخصص لشيف آخر بالفعل",
    });
  }

  // التحقق من أن الطلب يحتوي على وجبات من صنع هذا الطباخ
  const hasCookMeals = order.meals.some(
    (meal) => meal.cookId.toString() === req.userId.toString()
  );
  if (!hasCookMeals) {
    return res.status(403).json({
      success: false,
      message: "لا يمكنك قبول هذا الطلب - الطلب لا يحتوي على وجبات من صنعك",
    });
  }

  // قبول الطلب
  order.assigned_cook = req.userId;
  order.status = "preparing";
  if (notes) order.notes = notes;

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

  const order = await Order.findById(id).populate([
    { path: "meals.mealId", select: "name price image" },
    { path: "client_id", select: "name email" },
    { path: "assigned_cook", select: "name" },
  ]);

  if (!order) {
    return res.status(404).json({
      success: false,
      message: "الطلب غير موجود",
    });
  }

  // التحقق من أن الطلب في حالة completed وغير مخصص
  if (order.status !== "completed") {
    return res.status(400).json({
      success: false,
      message: "يمكن قبول الطلبات في حالة مكتمل فقط",
    });
  }

  if (order.assigned_delivery) {
    return res.status(400).json({
      success: false,
      message: "الطلب مخصص لمندوب توصيل آخر بالفعل",
    });
  }

  // قبول الطلب
  order.assigned_delivery = req.userId;
  order.status = "delivering";
  if (notes) order.notes = notes;

  await order.save();

  const formattedOrder = formatOrderResponse(order);

  res.status(200).json({
    success: true,
    message: "تم قبول الطلب للتوصيل بنجاح",
    order: formattedOrder,
  });
});

module.exports = {
  getAllOrders,
  updateOrder,
  checkout,
  getOrder,
  getAvailableOrdersForCook,
  getMyCookOrders,
  getAvailableOrdersForDelivery,
  getMyDeliveryOrders,
  acceptOrderByCook,
  acceptOrderByDelivery,
};
