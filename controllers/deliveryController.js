const Order = require('../models/Order');
const User = require('../models/User');
const bcrypt = require('bcrypt');
const mongoose = require('mongoose');
const DeliveryReview = require("../models/DeliveryReview");


exports.createDelivery = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "غير مصرح لك بإنشاء مندوب توصيل" });
    }
    const { name, email, password, phone, address, vehicleType, licenseNumber } = req.body;
    if (!name || !email || !password || !phone || !address) {
      return res.status(400).json({ message: "جميع الحقول مطلوبة" });
    }
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: "المستخدم موجود بالفعل" });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({
      name,
      email,
      password: hashedPassword,
      phone,
      address,
      role: "delivery",
      vehicleType,
      licenseNumber,
      isVerified: true 
    });
    await user.save();
    res.status(201).json({ message: "تم إنشاء مندوب التوصيل بنجاح", user: { ...user.toObject(), password: undefined } });
  } catch (err) {
    res.status(500).json({ message: "حدث خطأ أثناء إنشاء مندوب التوصيل" });
  }
};

exports.getAllDeliveries = async (req, res) => {
  try {
    let selectFields = "_id name vehicleType rate popularity image address";
    if (req.user.role === "admin") {
      selectFields = "-password -__v";
    }

    const { name, vehicleType, address, rate, popularity } = req.query;
    let filter = { role: "delivery", isActive: true };

    if (name) {
      filter.name = { $regex: name, $options: "i" };
    }
    if (vehicleType) {
      filter.vehicleType = { $regex: vehicleType, $options: "i" };
    }
    if (address) {
      filter.address = { $regex: address, $options: "i" };
    }
    if (rate) {
      filter.rate = { $gte: Number(rate) };
    }
    if (popularity) {
      filter.popularity = { $gte: Number(popularity) };
    }

    const deliveries = await User.find(filter).select(selectFields);
    res.json(deliveries);
  } catch (err) {
    res.status(500).json({ message: "حدث خطأ أثناء جلب مندوبي التوصيل" });
  }
};

exports.getDeliveryById = async (req, res) => {
  try {
    let selectFields = "_id name vehicleType rate popularity image";
    if (req.user.role === "admin") {
      selectFields = "-password -__v";
    }
    const delivery = await User.findOne({ _id: req.params.id, role: "delivery", isActive: true })
      .select(selectFields);
    if (!delivery) return res.status(404).json({ message: "مندوب التوصيل غير موجود" });
    res.json(delivery);
  } catch (err) {
    res.status(500).json({ message: "حدث خطأ أثناء جلب مندوب التوصيل" });
  }
};

exports.updateDelivery = async (req, res) => {
  try {
    const delivery = await User.findOne({ _id: req.params.id, role: "delivery" });
    if (!delivery) return res.status(404).json({ message: "مندوب التوصيل غير موجود" });
    if (req.user.role !== "admin" && req.user._id.toString() !== delivery._id.toString()) {
      return res.status(403).json({ message: "غير مصرح لك بتحديث هذا الحساب" });
    }
    const { name, email, phone, address, vehicleType, licenseNumber, password } = req.body;
    if (name) delivery.name = name;
    if (email) delivery.email = email;
    if (phone) delivery.phone = phone;
    if (address) delivery.address = address;
    if (vehicleType) delivery.vehicleType = vehicleType;
    if (licenseNumber) delivery.licenseNumber = licenseNumber;
    if (password) delivery.password = await bcrypt.hash(password, 10);
    await delivery.save();
    res.json({ message: "تم تحديث بيانات مندوب التوصيل بنجاح", user: { ...delivery.toObject(), password: undefined } });
  } catch (err) {
    res.status(500).json({ message: "حدث خطأ أثناء تحديث بيانات مندوب التوصيل" });
  }
};

exports.deleteDelivery = async (req, res) => {
  try {
    const delivery = await User.findOne({ _id: req.params.id, role: "delivery" });
    if (!delivery) return res.status(404).json({ message: "مندوب التوصيل غير موجود" });
    if (req.user.role !== "admin" && req.user._id.toString() !== delivery._id.toString()) {
      return res.status(403).json({ message: "غير مصرح لك بحذف هذا الحساب" });
    }
    await User.findByIdAndDelete(delivery._id);
    res.json({ message: "تم حذف مندوب التوصيل بنجاح" });
  } catch (err) {
    res.status(500).json({ message: "حدث خطأ أثناء حذف مندوب التوصيل" });
  }
};

// exports.getAvailableOrdersForDelivery = async (req, res) => {
//   if (!req.user.isIdentityVerified) {
//     return res.status(403).json({ message: "يجب توثيق بياناتك أولاً قبل العمل كمندوب توصيل." });
//   }
//   try {
//     const filter = {
//       status: "completed",
//       $or: [
//         { assigned_delivery: { $exists: false } },
//         { assigned_delivery: null }
//       ]
//     };
//     const orders = await Order.find(filter)
//       .populate([
//         { path: "meals.mealId", select: "name price image" },
//         { path: "client_id", select: "name email phone address" },
//         { path: "assigned_cook", select: "name" }
//       ])
//       .sort({ createdAt: -1 });
//     res.status(200).json({
//       success: true,
//       message: `تم جلب ${orders.length} طلب متاح للتوصيل بنجاح`,
//       orders,
//       count: orders.length
//     });
//   } catch (err) {
//     res.status(500).json({ message: 'حدث خطأ أثناء جلب الطلبات المتاحة' });
//   }
// };

// exports.getMyDeliveryOrders = async (req, res) => {
//   if (!req.user.isIdentityVerified) {
//     return res.status(403).json({ message: "يجب توثيق بياناتك أولاً قبل العمل كمندوب توصيل." });
//   }
//   try {
//     const filter = {
//       assigned_delivery: new mongoose.Types.ObjectId(req.user._id)
//     };
//     const orders = await Order.find(filter)
//       .populate([
//         { path: "meals.mealId", select: "name price image" },
//         { path: "client_id", select: "name email phone address" },
//         { path: "assigned_cook", select: "name" }
//       ])
//       .sort({ createdAt: -1 });
//     res.status(200).json({
//       success: true,
//       message: `تم جلب ${orders.length} طلب من طلباتك بنجاح`,
//       orders,
//       count: orders.length
//     });
//   } catch (err) {
//     res.status(500).json({ message: 'حدث خطأ أثناء جلب طلباتك' });
//   }
// };

// exports.acceptOrderByDelivery = async (req, res) => {
//   if (!req.user.isIdentityVerified) {
//     return res.status(403).json({ message: "يجب توثيق بياناتك أولاً قبل العمل كمندوب توصيل." });
//   }
//   try {
//     const { id } = req.params;
//     const { notes } = req.body;
//     const order = await Order.findById(id)
//       .populate([
//         { path: "meals.mealId", select: "name price image" },
//         { path: "client_id", select: "name email" },
//         { path: "assigned_cook", select: "name" }
//       ]);
//     if (!order) {
//       return res.status(404).json({ message: "الطلب غير موجود" });
//     }
//     if (order.status !== "completed") {
//       return res.status(400).json({ message: "يمكن قبول الطلبات في حالة مكتمل فقط" });
//     }
//     if (order.assigned_delivery) {
//       return res.status(400).json({ message: "الطلب مخصص لمندوب توصيل آخر بالفعل" });
//     }
//     order.assigned_delivery = req.user._id;
//     order.status = "delivering";
//     if (notes) order.notes = notes;
//     await order.save();
//     res.status(200).json({ message: "تم قبول الطلب للتوصيل بنجاح", order });
//   } catch (err) {
//     res.status(500).json({ message: 'حدث خطأ أثناء قبول الطلب' });
//   }
// };

// exports.updateOrderStatus = async (req, res) => {
//   if (!req.user.isIdentityVerified) {
//     return res.status(403).json({ message: "يجب توثيق بياناتك أولاً قبل العمل كمندوب توصيل." });
//   }
//   try {
//     const { id } = req.params;
//     const { status, notes, delivery_confirmed } = req.body;
//     const order = await Order.findById(id)
//       .populate([
//         { path: "meals.mealId", select: "name price image" },
//         { path: "client_id", select: "name email" },
//         { path: "assigned_cook", select: "name" },
//         { path: "assigned_delivery", select: "name" }
//       ]);
//     if (!order) {
//       return res.status(404).json({ message: "الطلب غير موجود" });
//     }
//     const orderAssignedDelivery = order.assigned_delivery?._id ? order.assigned_delivery._id.toString() : order.assigned_delivery?.toString();
//     if (orderAssignedDelivery !== req.user._id.toString()) {
//       return res.status(403).json({ message: "غير مصرح لك بتحديث هذا الطلب - الطلب غير مخصص لك" });
//     }
//     const allowedStatuses = ["delivering", "delivered"];
//     let updateMessage = "";
//     if (status === "delivering" && order.status === "completed" && !order.assigned_delivery) {
//       order.assigned_delivery = req.user._id;
//       order.status = status;
//       updateMessage = "تم قبول الطلب للتوصيل";
//     } else if (status && allowedStatuses.includes(status)) {
//       order.status = status;
//       updateMessage = `تم تحديث حالة التوصيل إلى ${status}`;
//     } else if (delivery_confirmed && order.status === "delivering") {
//       order.delivery_status = order.delivery_status || {};
//       order.delivery_status.delivered_by_delivery = true;
//       order.delivery_status.delivery_confirmed_at = new Date();
//       updateMessage = "تم تأكيد تسليم الطلب";
//     } else if (notes && !status && !delivery_confirmed) {
//       order.notes = notes;
//       updateMessage = "تم تحديث الملاحظات بنجاح";
//     } else if (!status && !delivery_confirmed && !notes) {
//       return res.status(400).json({ message: "يجب تحديد الحالة أو تأكيد التسليم أو الملاحظات للتحديث" });
//     } else if (status && !allowedStatuses.includes(status)) {
//       return res.status(400).json({ message: `الحالة ${status} غير مسموحة لمندوب التوصيل. الحالات المسموحة: delivering, delivered` });
//     }
//     await order.save();
//     res.status(200).json({ message: updateMessage || "تم تحديث الطلب بنجاح", order });
//   } catch (err) {
//     res.status(500).json({ message: 'حدث خطأ أثناء تحديث حالة الطلب' });
//   }
// };

exports.rateDelivery = async (req, res) => {
  try {
    const { deliveryId, orderId, rating } = req.body;
    const clientId = req.user._id;

    const existing = await DeliveryReview.findOne({ deliveryId, clientId, orderId });
    if (existing) {
      return res.status(400).json({ message: "لقد قمت بتقييم هذا الطلب بالفعل." });
    }

    await DeliveryReview.create({ deliveryId, clientId, orderId, rating });

    const reviews = await DeliveryReview.find({ deliveryId });
    const avg = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;

    await User.findByIdAndUpdate(deliveryId, { rate: avg });

    res.status(201).json({ message: "تم تقييم مندوب التوصيل بنجاح." });
  } catch (err) {
    res.status(500).json({ message: "حدث خطأ أثناء التقييم." });
  }
}; 