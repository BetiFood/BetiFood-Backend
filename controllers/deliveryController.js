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

    const { name, vehicleType, address, rate, popularity, page = 1, limit = 10, sort = "newest", query } = req.query;
    let filter = { role: "delivery" };

    if (query) {
      filter.$or = [
        { name: { $regex: query, $options: "i" } },
        { email: { $regex: query, $options: "i" } },
        { address: { $regex: query, $options: "i" } },
      ];
    }

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

    // Sorting
    let sortOption = {};
    switch (sort) {
      case "rate":
        sortOption.rate = -1;
        break;
      case "popularity":
        sortOption.popularity = -1;
        break;
      case "oldest":
        sortOption.createdAt = 1;
        break;
      case "newest":
      default:
        sortOption.createdAt = -1;
    }

    // Pagination
    const skip = (page - 1) * limit;
    const totalDeliveries = await User.countDocuments(filter);
    const deliveries = await User.find(filter)
      .select(selectFields)
      .sort(sortOption)
      .skip(Number(skip))
      .limit(Number(limit));

    res.json({
      deliveries,
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(totalDeliveries / limit),
        totalDeliveries,
        hasNext: skip + deliveries.length < totalDeliveries,
        hasPrev: page > 1,
      },
      sortBy: sort,
    });
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
    const delivery = await User.findOne({ _id: req.params.id, role: "delivery"})
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