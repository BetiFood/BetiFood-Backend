const Order = require("../models/Order");
const Cart = require("../models/Cart");
const Meal = require("../models/Meal");
const User = require("../models/User");
const asyncHandler = require("../utils/asyncHandler");
const { ApiResponse } = require("../utils/response");
const mongoose = require("mongoose");

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

// Helper function to format order response with sub-orders
const formatOrderResponse = (order) => {
  return {
    order_id: order._id,
    client: {
      id: order.client_id?._id || order.client_id,
      name: order.client_name,
      email: order.client_id?.email || "",
      phone: order.client_phone,
      address: order.client_address,
      location: order.location,
    },
    subOrders: order.subOrders.map((subOrder) => ({
      sub_order_id: subOrder._id,
      cook: {
        id: subOrder.cook_id?._id || subOrder.cook_id,
        name: subOrder.cook_name,
      },
      meals: subOrder.meals.map((meal) => ({
        id: meal.mealId,
        name: meal.mealName,
        cookId: meal.cookId,
        cookName: meal.cookName,
        unit_price: meal.price,
        quantity: meal.quantity,
        total_price: meal.price * meal.quantity,
      })),
      delivery: {
        id: subOrder.delivery_id?._id || subOrder.delivery_id,
        name: subOrder.delivery_name,
        status: subOrder.delivery_status,
        fee: subOrder.delivery_fee,
        distance_km: subOrder.delivery_distance_km,
        picked_up_at: subOrder.picked_up_at,
        delivered_at: subOrder.delivered_at,
      },
    })),
    pricing: {
      total_delivery_fee: order.total_delivery_fee,
      tax: order.tax,
      discount: order.discount,
      final_amount: order.final_amount,
    },
    payment: {
      method: translatePaymentMethod(order.payment),
      status: "pending", // Simplified for now
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

// Helper function to translate payment method
const translatePaymentMethod = (method) => {
  const methods = {
    cash: "نقدي",
    online: "إلكتروني",
  };
  return methods[method] || method;
};

// Helper function to translate status
const translateStatus = (status) => {
  const statuses = {
    pending: "في الانتظار",
    preparing: "قيد التحضير",
    completed: "مكتمل",
    delivering: "قيد التوصيل",
    delivered: "تم التوصيل",
    cancelled: "ملغي",
  };
  return statuses[status] || status;
};

// جلب جميع الطلبات حسب الدور
const getAllOrders = asyncHandler(async (req, res) => {
  let filter = {};
  let populateOptions = [
    { path: "subOrders.cook_id", select: "name email" },
    { path: "subOrders.delivery_id", select: "name email" },
    { path: "client_id", select: "name email" },
  ];

  // فلترة الطلبات حسب دور المستخدم
  switch (req.userRole) {
    case "client":
      filter = { client_id: new mongoose.Types.ObjectId(req.userId) };
      break;
    case "cook":
      filter = {
        "subOrders.cook_id": new mongoose.Types.ObjectId(req.userId),
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
          { "subOrders.delivery_id": new mongoose.Types.ObjectId(req.userId) },
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
    "subOrders.cook_id": new mongoose.Types.ObjectId(req.userId),
    $or: [
      { "subOrders.delivery_id": { $exists: false } },
      { "subOrders.delivery_id": null },
    ],
  };

  const populateOptions = [
    { path: "subOrders.cook_id", select: "name email" },
    { path: "client_id", select: "name email" },
  ];

  const orders = await Order.find(filter)
    .populate(populateOptions)
    .sort({ createdAt: -1 });

  const formattedOrders = orders.map((order) => formatOrderResponse(order));

  res.status(200).json({
    success: true,
    message: "تم جلب الطلبات المتاحة بنجاح",
    orders: formattedOrders,
    count: formattedOrders.length,
  });
});

// جلب طلبات الطباخ الخاصة
const getMyCookOrders = asyncHandler(async (req, res) => {
  const filter = {
    "subOrders.cook_id": new mongoose.Types.ObjectId(req.userId),
  };

  // Only populate the cook_id for subOrders to minimize data
  const populateOptions = [{ path: "subOrders.cook_id", select: "name email" }];

  const orders = await Order.find(filter)
    .populate(populateOptions)
    .sort({ createdAt: -1 });

  // For each order, return only the sub-orders belonging to this cook, and the main order ID
  const cookOrders = orders.map((order) => {
    const mySubOrders = order.subOrders.filter((subOrder) => {
      const cookId =
        subOrder.cook_id && subOrder.cook_id._id
          ? subOrder.cook_id._id
          : subOrder.cook_id;
      return cookId.toString() === req.userId.toString();
    });
    return {
      order_id: order._id,
      subOrders: mySubOrders.map((subOrder) => ({
        sub_order_id: subOrder._id,
        meals: subOrder.meals, // You can further filter meal fields if needed
        delivery_status: subOrder.delivery_status,
        status: subOrder.status,
        delivery_id: subOrder.delivery_id,
        delivery_name: subOrder.delivery_name,
        delivery_fee: subOrder.delivery_fee,
        delivery_distance_km: subOrder.delivery_distance_km,
        picked_up_at: subOrder.picked_up_at,
        delivered_at: subOrder.delivered_at,
        // Add any other fields you want the cook to see
      })),
    };
  });

  res.status(200).json({
    success: true,
    message: "تم جلب طلباتك بنجاح",
    orders: cookOrders,
    count: cookOrders.length,
  });
});

// جلب الطلبات المتاحة لمندوب التوصيل مع فلترة حسب الموقع
const getAvailableOrdersForDelivery = asyncHandler(async (req, res) => {
  // التحقق من توثيق هوية مندوب التوصيل
  if (!req.user.isIdentityVerified) {
    return res.status(403).json({
      success: false,
      message: "لا يمكنك رؤية الطلبات حتى يتم توثيق هويتك من الإدارة.",
    });
  }

  // التحقق من وجود موقع مندوب التوصيل
  if (!req.user.location || !req.user.location.lat || !req.user.location.lng) {
    return res.status(400).json({
      success: false,
      message: "يجب تحديث موقعك أولاً لرؤية الطلبات المتاحة.",
    });
  }

  const deliveryLocation = req.user.location;
  const maxDistance = 50; // أقصى مسافة بالكيلومترات
  const urgentDistance = 5; // مسافة الطلبات العاجلة (5 كم)
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000); // 10 دقائق مضت

  // التحقق من الطلبات الحالية لمندوب التوصيل
  const currentOrders = await Order.find({
    "subOrders.delivery_id": new mongoose.Types.ObjectId(req.userId),
    status: { $in: ["preparing", "completed", "delivering"] },
  });

  const hasActiveOrder = currentOrders.length > 0;
  const lastAcceptedOrder =
    currentOrders.length > 0
      ? currentOrders.sort(
          (a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)
        )[0]
      : null;

  // إذا كان لديه طلب نشط، تحقق من الوقت
  let canAcceptNewOrder = true;
  let timeUntilNextOrder = null;

  if (hasActiveOrder && lastAcceptedOrder) {
    const timeSinceLastOrder =
      Date.now() - new Date(lastAcceptedOrder.updatedAt).getTime();
    const tenMinutesInMs = 10 * 60 * 1000;

    if (timeSinceLastOrder < tenMinutesInMs) {
      canAcceptNewOrder = false;
      timeUntilNextOrder = Math.ceil(
        (tenMinutesInMs - timeSinceLastOrder) / 60000
      ); // بالدقائق
    }
  }

  // جلب الطلبات المتاحة (preparing أو completed)
  const filter = {
    status: { $in: ["preparing", "completed"] },
    $or: [
      { "subOrders.delivery_id": { $exists: false } },
      { "subOrders.delivery_id": null },
    ],
  };

  const populateOptions = [
    {
      path: "subOrders.cook_id",
      select: "name email location verificationRef",
      populate: { path: "verificationRef", select: "location" },
    },
    { path: "client_id", select: "name email phone" },
  ];

  const orders = await Order.find(filter)
    .populate(populateOptions)
    .sort({ createdAt: -1 });

  // فلترة الطلبات حسب المسافة من مندوب التوصيل
  const availableOrders = [];
  const urgentOrders = []; // الطلبات العاجلة (10+ دقائق)

  for (const order of orders) {
    const orderWithDistance = {
      ...order.toObject(),
      subOrders: order.subOrders.map((subOrder) => {
        const cook = subOrder.cook_id;
        // Use cook.location if present, otherwise use cook.verificationRef.location
        const cookLocation =
          cook && cook.location && cook.location.lat && cook.location.lng
            ? cook.location
            : cook.verificationRef &&
              cook.verificationRef.location &&
              cook.verificationRef.location.lat &&
              cook.verificationRef.location.lng
            ? cook.verificationRef.location
            : null;
        if (cookLocation && cookLocation.lat && cookLocation.lng) {
          const distance = calculateDistance(
            deliveryLocation.lat,
            deliveryLocation.lng,
            cookLocation.lat,
            cookLocation.lng
          );

          return {
            ...subOrder.toObject(),
            distance_from_delivery: distance,
            is_within_range: distance <= maxDistance,
            is_urgent_distance: distance <= urgentDistance,
          };
        }
        return {
          ...subOrder.toObject(),
          distance_from_delivery: null,
          is_within_range: false,
          is_urgent_distance: false,
        };
      }),
    };

    // إضافة الطلب إذا كان هناك طباخ واحد على الأقل ضمن النطاق
    const hasCookInRange = orderWithDistance.subOrders.some(
      (subOrder) => subOrder.is_within_range
    );

    if (hasCookInRange) {
      // تحقق من وقت الطلب
      const orderAge = Date.now() - new Date(order.createdAt).getTime();
      const isUrgentOrder = orderAge > 10 * 60 * 1000; // أكثر من 10 دقائق

      if (isUrgentOrder) {
        // للطلبات العاجلة، تحقق من المسافة القريبة
        const hasUrgentDistance = orderWithDistance.subOrders.some(
          (subOrder) => subOrder.is_urgent_distance
        );

        if (hasUrgentDistance) {
          urgentOrders.push({
            ...orderWithDistance,
            is_urgent: true,
            waiting_time_minutes: Math.floor(orderAge / 60000),
          });
        }
      } else {
        availableOrders.push(orderWithDistance);
      }
    }
  }

  // ترتيب الطلبات حسب المسافة (الأقرب أولاً)
  availableOrders.sort((a, b) => {
    const minDistanceA = Math.min(
      ...a.subOrders
        .filter((so) => so.is_within_range)
        .map((so) => so.distance_from_delivery)
    );
    const minDistanceB = Math.min(
      ...b.subOrders
        .filter((so) => so.is_within_range)
        .map((so) => so.distance_from_delivery)
    );
    return minDistanceA - minDistanceB;
  });

  // ترتيب الطلبات العاجلة حسب المسافة (الأقرب أولاً)
  urgentOrders.sort((a, b) => {
    const minDistanceA = Math.min(
      ...a.subOrders
        .filter((so) => so.is_urgent_distance)
        .map((so) => so.distance_from_delivery)
    );
    const minDistanceB = Math.min(
      ...b.subOrders
        .filter((so) => so.is_urgent_distance)
        .map((so) => so.distance_from_delivery)
    );
    return minDistanceA - minDistanceB;
  });

  // دمج الطلبات العادية والعاجلة
  let finalOrders = [];
  let showUrgentNotification = false;

  if (canAcceptNewOrder) {
    finalOrders = [...availableOrders, ...urgentOrders];
  } else if (urgentOrders.length > 0) {
    // إذا كان لا يمكن قبول طلبات عادية، اعرض الطلبات العاجلة فقط
    finalOrders = urgentOrders;
    showUrgentNotification = true;
  }

  const formattedOrders = finalOrders.map((order) => {
    const formatted = formatOrderResponse(order);
    // إضافة معلومات المسافة للاستجابة
    formatted.subOrders = formatted.subOrders.map((subOrder, index) => ({
      ...subOrder,
      distance_from_delivery: order.subOrders[index].distance_from_delivery,
      is_within_range: order.subOrders[index].is_within_range,
      is_urgent_distance: order.subOrders[index].is_urgent_distance,
    }));

    // إضافة معلومات الطلب العاجل
    if (order.is_urgent) {
      formatted.is_urgent = true;
      formatted.waiting_time_minutes = order.waiting_time_minutes;
    }

    return formatted;
  });

  // تحضير رسالة الاستجابة
  let message = `تم جلب ${formattedOrders.length} طلب متاح للتوصيل بنجاح`;
  let notification = null;

  if (!canAcceptNewOrder && !showUrgentNotification) {
    message = `لديك طلب نشط. يمكنك قبول طلب جديد بعد ${timeUntilNextOrder} دقيقة.`;
    notification = {
      type: "wait",
      message: `انتظر ${timeUntilNextOrder} دقيقة قبل قبول طلب جديد`,
      time_remaining_minutes: timeUntilNextOrder,
    };
  } else if (!canAcceptNewOrder && showUrgentNotification) {
    message = `لديك طلب نشط، لكن هناك ${urgentOrders.length} طلب عاجل قريب منك يمكنك قبوله!`;
    notification = {
      type: "urgent_available",
      message: `يمكنك قبول طلب عاجل قريب منك (${urgentOrders.length} طلب)`,
      urgent_orders_count: urgentOrders.length,
      time_until_normal_order_minutes: timeUntilNextOrder,
    };
  } else if (hasActiveOrder) {
    message = `تم جلب ${formattedOrders.length} طلب متاح للتوصيل. يمكنك قبول طلب جديد الآن!`;
    notification = {
      type: "can_accept",
      message: "يمكنك قبول طلب جديد الآن",
      time_since_last_order_minutes: Math.floor(
        (Date.now() - new Date(lastAcceptedOrder.updatedAt).getTime()) / 60000
      ),
    };
  }

  res.status(200).json({
    success: true,
    message: message,
    orders: formattedOrders,
    count: formattedOrders.length,
    delivery_location: {
      lat: deliveryLocation.lat,
      lng: deliveryLocation.lng,
      last_updated: deliveryLocation.lastUpdated,
    },
    max_distance_km: maxDistance,
    urgent_distance_km: urgentDistance,
    delivery_status: {
      has_active_order: hasActiveOrder,
      can_accept_new_order: canAcceptNewOrder,
      time_until_next_order_minutes: timeUntilNextOrder,
      active_orders_count: currentOrders.length,
    },
    notification: notification,
    urgent_orders_count: urgentOrders.length,
    normal_orders_count: availableOrders.length,
  });
});

// جلب طلبات مندوب التوصيل الخاصة
const getMyDeliveryOrders = asyncHandler(async (req, res) => {
  // التحقق من توثيق هوية مندوب التوصيل
  if (!req.user.isIdentityVerified) {
    return res.status(403).json({
      success: false,
      message: "لا يمكنك رؤية الطلبات حتى يتم توثيق هويتك من الإدارة.",
    });
  }

  const filter = {
    "subOrders.delivery_id": new mongoose.Types.ObjectId(req.userId),
  };

  const populateOptions = [
    { path: "subOrders.cook_id", select: "name email location" },
    { path: "client_id", select: "name email phone" },
  ];

  const orders = await Order.find(filter)
    .populate(populateOptions)
    .sort({ createdAt: -1 });

  const formattedOrders = orders.map((order) => formatOrderResponse(order));

  res.status(200).json({
    success: true,
    message: `تم جلب ${formattedOrders.length} طلب من طلباتك بنجاح`,
    orders: formattedOrders,
    count: formattedOrders.length,
  });
});

// إنشاء طلب جديد (checkout) - يدعم sub-orders
const checkout = asyncHandler(async (req, res) => {
  const {
    client_name,
    client_phone,
    client_address,
    location,
    notes,
    payment = "cash",
    tax = 0,
    discount = 0,
    sub_orders, // Array of sub-orders
  } = req.body;

  // Normalize payment method (accept Arabic and English)
  let normalizedPayment = payment;
  if (payment === "نقدي" || payment === "cash") {
    normalizedPayment = "cash";
  } else if (payment === "الكتروني" || payment === "online") {
    normalizedPayment = "online";
  } else {
    return res.status(400).json({
      success: false,
      message: "طريقة الدفع غير مدعومة نقدي او الكتروني",
    });
  }

  // Validate required fields
  if (
    !client_name ||
    !client_phone ||
    !client_address ||
    !location ||
    !sub_orders ||
    !Array.isArray(sub_orders)
  ) {
    return res.status(400).json({
      success: false,
      message:
        "يجب توفير جميع البيانات المطلوبة: client_name, client_phone, client_address, location, sub_orders",
    });
  }

  // Validate client_address structure
  if (
    !client_address.city ||
    !client_address.street ||
    !client_address.building_number
  ) {
    return res.status(400).json({
      success: false,
      message: "يجب توفير city, street, building_number في client_address",
    });
  }

  // Validate location structure
  if (typeof location.lat !== "number" || typeof location.lng !== "number") {
    return res.status(400).json({
      success: false,
      message: "يجب توفير lat و lng كأرقام في location",
    });
  }

  // Validate sub_orders
  if (sub_orders.length === 0) {
    return res.status(400).json({
      success: false,
      message: "يجب توفير sub_orders واحدة على الأقل",
    });
  }

  const validatedSubOrders = [];

  // Validate each sub-order
  for (const subOrder of sub_orders) {
    if (
      !subOrder.cook_id ||
      !subOrder.meals ||
      !Array.isArray(subOrder.meals) ||
      subOrder.meals.length === 0
    ) {
      return res.status(400).json({
        success: false,
        message: "كل sub-order يجب أن يحتوي على cook_id و meals array",
      });
    }

    // Validate cook exists
    const cook = await User.findById(subOrder.cook_id);
    if (!cook || cook.role !== "cook") {
      return res.status(400).json({
        success: false,
        message: `الطباخ غير موجود أو غير صالح: ${subOrder.cook_id}`,
      });
    }

    // Validate meals in this sub-order
    const validatedMeals = [];
    for (const meal of subOrder.meals) {
      if (!meal.meal_id || !meal.quantity || meal.quantity < 1) {
        return res.status(400).json({
          success: false,
          message: "كل وجبة يجب أن تحتوي على meal_id و quantity >= 1",
        });
      }

      // Validate meal exists and belongs to this cook
      const mealDoc = await Meal.findById(meal.meal_id);
      if (!mealDoc) {
        return res.status(400).json({
          success: false,
          message: `الوجبة غير موجودة: ${meal.meal_id}`,
        });
      }

      if (mealDoc.cookId.toString() !== subOrder.cook_id.toString()) {
        return res.status(400).json({
          success: false,
          message: `الوجبة ${mealDoc.name} لا تخص الطباخ المحدد`,
        });
      }

      // Check meal availability
      if (mealDoc.quantity < meal.quantity) {
        return res.status(400).json({
          success: false,
          message: `الكمية المطلوبة غير متوفرة للوجبة: ${mealDoc.name}`,
        });
      }

      validatedMeals.push({
        mealId: meal.meal_id,
        mealName: mealDoc.name,
        cookId: subOrder.cook_id,
        cookName: cook.name,
        quantity: meal.quantity,
        price: mealDoc.price,
      });
    }

    // Validate delivery person if provided
    let deliveryPerson = null;
    if (subOrder.delivery_person_id) {
      deliveryPerson = await User.findById(subOrder.delivery_person_id);
      if (!deliveryPerson || deliveryPerson.role !== "delivery") {
        return res.status(400).json({
          success: false,
          message: `مندوب التوصيل غير موجود أو غير صالح: ${subOrder.delivery_person_id}`,
        });
      }
    }

    // Validate delivery fee and distance
    const deliveryFee = subOrder.delivery_fee || 0;
    const deliveryDistance = subOrder.delivery_distance_km || 0;

    if (deliveryFee < 0 || deliveryDistance < 0) {
      return res.status(400).json({
        success: false,
        message: "delivery_fee و delivery_distance_km يجب أن تكون قيم موجبة",
      });
    }

    validatedSubOrders.push({
      cook_id: subOrder.cook_id,
      cook_name: cook.name,
      meals: validatedMeals,
      delivery_id: deliveryPerson?._id,
      delivery_name: deliveryPerson?.name,
      delivery_fee: deliveryFee,
      delivery_distance_km: deliveryDistance,
      delivery_status: "pending",
    });
  }

  // حساب final_amount
  let subtotal = 0;
  let totalDeliveryFee = 0;
  validatedSubOrders.forEach((subOrder) => {
    subOrder.meals.forEach((meal) => {
      subtotal += meal.price * meal.quantity;
    });
    totalDeliveryFee += subOrder.delivery_fee || 0;
  });
  const final_amount =
    subtotal + totalDeliveryFee + (tax || 0) - (discount || 0);

  // Create the order - no need to update user documents
  const order = await Order.create({
    client_id: req.userId,
    client_name,
    client_phone,
    client_address,
    location,
    subOrders: validatedSubOrders,
    payment: normalizedPayment,
    tax,
    discount,
    notes,
    status: "pending",
    final_amount,
  });

  // Update meal quantities
  for (const subOrder of validatedSubOrders) {
    for (const meal of subOrder.meals) {
      await Meal.findByIdAndUpdate(meal.mealId, {
        $inc: { quantity: -meal.quantity },
      });
    }
  }

  // Populate and format the response
  const populatedOrder = await Order.findById(order._id).populate([
    { path: "subOrders.cook_id", select: "name email" },
    { path: "subOrders.delivery_id", select: "name email" },
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
    { path: "subOrders.cook_id", select: "name email" },
    { path: "subOrders.delivery_id", select: "name email" },
    { path: "client_id", select: "name email" },
  ]);

  if (!order) {
    return res.status(404).json({
      success: false,
      message: "الطلب غير موجود",
    });
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
    const hasCookSubOrders = order.subOrders.some(
      (subOrder) => subOrder.cook_id.toString() === req.userId.toString()
    );
    if (!hasCookSubOrders) {
      return res.status(403).json({
        success: false,
        message:
          "غير مصرح لك بعرض هذا الطلب - الطلب لا يحتوي على وجبات من صنعك",
      });
    }
  } else if (req.userRole === "delivery") {
    const hasDeliverySubOrders = order.subOrders.some(
      (subOrder) => subOrder.delivery_id?.toString() === req.userId.toString()
    );
    if (!hasDeliverySubOrders) {
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
    { path: "subOrders.cook_id", select: "name email" },
    { path: "client_id", select: "name email" },
  ]);

  if (!order) {
    return res.status(404).json({
      success: false,
      message: "الطلب غير موجود",
    });
  }

  // التحقق من أن الطلب في حالة pending
  if (order.status !== "pending") {
    return res.status(400).json({
      success: false,
      message: "يمكن قبول الطلبات في حالة انتظار فقط",
    });
  }

  // التحقق من أن الطلب يحتوي على وجبات من صنع هذا الطباخ
  const cookSubOrders = order.subOrders.filter(
    (subOrder) =>
      (subOrder.cook_id && subOrder.cook_id._id
        ? subOrder.cook_id._id.toString()
        : subOrder.cook_id.toString()) === req.userId.toString()
  );
  if (cookSubOrders.length === 0) {
    return res.status(403).json({
      success: false,
      message: "غير مصرح لك بقبول هذا الطلب - الطلب لا يحتوي على وجبات من صنعك",
    });
  }

  // تحديث فقط sub-orders الخاصة بهذا الطباخ
  let anyAccepted = false;
  order.subOrders.forEach((subOrder) => {
    if (
      (subOrder.cook_id && subOrder.cook_id._id
        ? subOrder.cook_id._id.toString()
        : subOrder.cook_id.toString()) === req.userId.toString()
    ) {
      subOrder.status = "preparing"; // if you have a status field per sub-order
      anyAccepted = true;
    }
  });

  // تحديث حالة الطلب إلى preparing إذا تم قبول أي sub-order
  if (anyAccepted) {
    order.status = "preparing";
    if (notes) {
      order.notes = notes;
    }
    await order.save();
  }

  // فقط sub-orders الخاصة بهذا الطباخ في الاستجابة
  const formattedOrder = formatOrderResponse(order);
  formattedOrder.subOrders = formattedOrder.subOrders.filter(
    (subOrder) => subOrder.cook.id.toString() === req.userId.toString()
  );

  res.status(200).json({
    success: true,
    message: "تم قبول الطلب بنجاح",
    order: formattedOrder,
  });
});

// قبول الطلب لمندوب التوصيل
const acceptOrderByDelivery = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { sub_order_id, notes } = req.body;

  // التحقق من توثيق هوية مندوب التوصيل
  if (!req.user.isIdentityVerified) {
    return res.status(403).json({
      success: false,
      message: "لا يمكنك قبول الطلبات حتى يتم توثيق هويتك من الإدارة.",
    });
  }

  if (!sub_order_id) {
    return res.status(400).json({
      success: false,
      message: "يجب تحديد sub_order_id",
    });
  }

  const order = await Order.findById(id).populate([
    { path: "subOrders.cook_id", select: "name email location" },
    { path: "client_id", select: "name email" },
  ]);

  if (!order) {
    return res.status(404).json({
      success: false,
      message: "الطلب غير موجود",
    });
  }

  // التحقق من أن الطلب في حالة preparing أو completed
  if (order.status !== "preparing" && order.status !== "completed") {
    return res.status(400).json({
      success: false,
      message: "يمكن قبول الطلبات في حالة قيد التحضير أو مكتمل فقط",
    });
  }

  // البحث عن sub-order المحدد
  const subOrder = order.subOrders.find(
    (so) => so._id.toString() === sub_order_id
  );

  if (!subOrder) {
    return res.status(404).json({
      success: false,
      message: "sub-order غير موجود",
    });
  }

  // التحقق من أن sub-order غير مخصص لمندوب توصيل آخر
  if (
    subOrder.delivery_id &&
    subOrder.delivery_id.toString() !== req.userId.toString()
  ) {
    return res.status(400).json({
      success: false,
      message: "هذا sub-order مخصص لمندوب توصيل آخر بالفعل",
    });
  }

  // التحقق من موقع مندوب التوصيل والطباخ
  if (!req.user.location || !req.user.location.lat || !req.user.location.lng) {
    return res.status(400).json({
      success: false,
      message: "يجب تحديث موقعك أولاً لقبول الطلبات.",
    });
  }

  const cook = subOrder.cook_id;
  if (!cook || !cook.location || !cook.location.lat || !cook.location.lng) {
    return res.status(400).json({
      success: false,
      message: "موقع الطباخ غير متوفر، لا يمكن قبول الطلب.",
    });
  }

  // حساب المسافة بين مندوب التوصيل والطباخ
  const distance = calculateDistance(
    req.user.location.lat,
    req.user.location.lng,
    cook.location.lat,
    cook.location.lng
  );

  const maxDistance = 50; // أقصى مسافة بالكيلومترات
  const urgentDistance = 5; // مسافة الطلبات العاجلة (5 كم)

  // تحقق من وقت الطلب
  const orderAge = Date.now() - new Date(order.createdAt).getTime();
  const isUrgentOrder = orderAge > 10 * 60 * 1000; // أكثر من 10 دقائق
  const isUrgentDistance = distance <= urgentDistance;

  // التحقق من المسافة
  if (distance > maxDistance) {
    return res.status(400).json({
      success: false,
      message: `المسافة بينك والطباخ (${distance.toFixed(
        1
      )} كم) أكبر من الحد المسموح (${maxDistance} كم).`,
    });
  }

  // إذا كان الطلب عاجل وقريب، اسمح بقبوله حتى لو كان لديه طلب نشط
  if (isUrgentOrder && isUrgentDistance) {
    // السماح بقبول الطلب العاجل
  } else if (distance > maxDistance) {
    return res.status(400).json({
      success: false,
      message: `المسافة بينك والطباخ (${distance.toFixed(
        1
      )} كم) أكبر من الحد المسموح (${maxDistance} كم).`,
    });
  }

  // تحديث فقط هذا sub-order
  subOrder.delivery_id = req.userId;
  subOrder.delivery_name = req.user.name;
  subOrder.delivery_status = "pending";
  if (notes) {
    order.notes = notes;
  }
  await order.save();

  // فقط هذا sub-order في الاستجابة
  const formattedOrder = formatOrderResponse(order);
  formattedOrder.subOrders = formattedOrder.subOrders.filter(
    (so) => so.sub_order_id.toString() === sub_order_id
  );

  res.status(200).json({
    success: true,
    message: "تم قبول الطلب الخاص بك بنجاح",
    order: formattedOrder,
    distance_to_cook_km: distance.toFixed(1),
    is_urgent_order: isUrgentOrder,
    waiting_time_minutes: isUrgentOrder ? Math.floor(orderAge / 60000) : null,
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
    sub_orders,
    delivery_confirmed,
    client_received,
  } = req.body;

  const order = await Order.findById(id).populate([
    { path: "subOrders.cook_id", select: "name email" },
    { path: "subOrders.delivery_id", select: "name email" },
    { path: "client_id", select: "name email" },
  ]);

  if (!order) {
    return res.status(404).json({
      success: false,
      message: "الطلب غير موجود",
    });
  }

  // التحقق من الصلاحيات حسب الدور
  let canUpdate = false;
  let updateMessage = "";

  switch (req.userRole) {
    case "client": {
      // العميل يمكنه فقط تحديث الطلبات التي تخصه
      const orderClientId =
        order.client_id?._id?.toString() || order.client_id?.toString();
      if (orderClientId !== req.userId.toString()) {
        return res.status(403).json({
          success: false,
          message: "غير مصرح لك بتحديث هذا الطلب - الطلب لا يخصك",
        });
      }

      // إلغاء الطلب
      if (status === "cancelled") {
        const allPending = order.subOrders.every(
          (subOrder) => !subOrder.status || subOrder.status === "pending"
        );
        const somePending = order.subOrders.some(
          (subOrder) => !subOrder.status || subOrder.status === "pending"
        );
        const someAccepted = order.subOrders.some(
          (subOrder) => subOrder.status && subOrder.status !== "pending"
        );
        if (allPending) {
          // Cancel the whole order
          order.status = "cancelled";
          order.subOrders.forEach((subOrder) => {
            subOrder.status = "cancelled";
          });
          canUpdate = true;
          updateMessage = "تم إلغاء الطلب بنجاح";
        } else if (somePending && someAccepted) {
          // Cancel only the pending sub-orders
          order.subOrders.forEach((subOrder) => {
            if (!subOrder.status || subOrder.status === "pending") {
              subOrder.status = "cancelled";
            }
          });
          canUpdate = true;
          updateMessage =
            "تم إلغاء الأجزاء غير المقبولة من الطلب. الطلب مستمر مع الطهاة الذين قبلوا فقط.";
        } else {
          // All accepted, cannot cancel
          return res.status(400).json({
            success: false,
            message: "لا يمكن إلغاء الطلب بعد قبول أحد الطهاة.",
          });
        }
      }
      // تحديث البيانات الشخصية
      else if (
        order.status === "pending" &&
        (client_name || client_phone || client_address)
      ) {
        canUpdate = true;
        updateMessage = "تم تحديث البيانات الشخصية بنجاح";
        if (client_name) order.client_name = client_name;
        if (client_phone) order.client_phone = client_phone;
        if (client_address) order.client_address = client_address;
      }
      // تأكيد استلام الطلب
      else if (
        (status === "delivered" || client_received) &&
        order.status === "delivering"
      ) {
        canUpdate = true;
        order.status = "delivered";
        updateMessage = "تم تأكيد استلام الطلب من العميل بنجاح";
      }
      // تحديث الملاحظات فقط
      else if (notes && order.status === "pending") {
        canUpdate = true;
        updateMessage = "تم تحديث الملاحظات بنجاح";
        order.notes = notes;
      }
      break;
    }
    case "cook": {
      // الشيف يمكنه تحديث sub-orders الخاصة به فقط
      let updatedAny = false;
      order.subOrders.forEach((subOrder) => {
        if (subOrder.cook_id.toString() === req.userId.toString()) {
          if (
            status &&
            ["preparing", "completed", "cancelled"].includes(status)
          ) {
            subOrder.status = status;
            updatedAny = true;
          }
          if (notes) {
            subOrder.notes = notes;
            updatedAny = true;
          }
        }
      });
      if (updatedAny) {
        canUpdate = true;
        updateMessage = "تم تحديث حالة الطلب الفرعي الخاص بك بنجاح";
      } else {
        return res.status(403).json({
          success: false,
          message:
            "غير مصرح لك بتحديث هذا الطلب أو لا يوجد لديك طلب فرعي لتحديثه",
        });
      }
      break;
    }
    case "delivery": {
      // مندوب التوصيل يمكنه تحديث sub-orders الخاصة به
      const hasDeliverySubOrders = order.subOrders.some(
        (subOrder) => subOrder.delivery_id?.toString() === req.userId.toString()
      );
      if (!hasDeliverySubOrders) {
        return res.status(403).json({
          success: false,
          message: "غير مصرح لك بتحديث هذا الطلب",
        });
      }

      // تحديث حالة التوصيل
      if (delivery_confirmed) {
        canUpdate = true;
        // تحديث جميع sub-orders الخاصة بهذا المندوب
        order.subOrders.forEach((subOrder) => {
          if (subOrder.delivery_id?.toString() === req.userId.toString()) {
            subOrder.delivery_status = "delivered";
            subOrder.delivered_at = new Date();
          }
        });
        updateMessage = "تم تأكيد التوصيل";
      }
      break;
    }
    case "admin": {
      // المدير يمكنه تحديث أي شيء
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
    "subOrders.delivery_id": new mongoose.Types.ObjectId(req.userId),
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
  getMyCookOrders,
  getAvailableOrdersForDelivery,
  getMyDeliveryOrders,
  checkout,
  getOrder,
  acceptOrderByCook,
  acceptOrderByDelivery,
  updateOrder,
  updateDeliveryLocation,
  checkDeliveryAvailability,
  formatOrderResponse,
};
