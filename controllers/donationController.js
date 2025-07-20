const Donation = require("../models/Donation");
const Order = require("../models/Order");
const User = require("../models/User");
const asyncHandler = require("../utils/asyncHandler");
const { ApiResponse } = require("../utils/response");
const mongoose = require("mongoose");

// Helper function to format donation response
const formatDonationResponse = (donation) => {
  return {
    donation_id: donation._id,
    donor: {
      id: donation.donor?._id || donation.donor,
      name: donation.donor?.name || "",
      email: donation.donor?.email || "",
    },
    amount: donation.amount,
    message: donation.message,
    status: translateDonationStatus(donation.status),
    toOrder: donation.toOrder,
    toCharity: donation.toCharity,
    timestamps: {
      created: formatArabicDate(donation.createdAt),
      updated: formatArabicDate(donation.updatedAt),
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

// Helper function to translate donation status
const translateDonationStatus = (status) => {
  const statuses = {
    pending: "في الانتظار",
    approved: "مقبول",
    delivered: "تم التوصيل",
    cancelled: "ملغي",
  };
  return statuses[status] || status;
};

// إنشاء تبرع جديد
const createDonation = asyncHandler(async (req, res) => {
  const { amount, message, toOrder, toCharity } = req.body;

  // Validate required fields
  if (!amount || amount <= 0) {
    return res.status(400).json({
      success: false,
      message: "يجب توفير مبلغ صحيح للتبرع",
    });
  }

  // Validate that either toOrder or toCharity is provided
  if (!toOrder && !toCharity) {
    return res.status(400).json({
      success: false,
      message: "يجب تحديد إما طلب أو جمعية خيرية للتبرع",
    });
  }

  // Validate order if provided
  if (toOrder) {
    const order = await Order.findById(toOrder);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "الطلب غير موجود",
      });
    }
  }

  // Validate charity if provided
  if (toCharity) {
    const charity = await mongoose.model("Charity").findById(toCharity);
    if (!charity) {
      return res.status(404).json({
        success: false,
        message: "الجمعية الخيرية غير موجودة",
      });
    }
  }

  // Create donation
  const donation = await Donation.create({
    donor: req.userId,
    amount,
    message: message || "تبرع خيري",
    toOrder,
    toCharity,
    status: "pending",
  });

  // Populate and format response
  const populatedDonation = await Donation.findById(donation._id).populate([
    { path: "donor", select: "name email" },
    { path: "toOrder", select: "client_name" },
    { path: "toCharity", select: "name" },
  ]);

  const formattedDonation = formatDonationResponse(populatedDonation);

  res.status(201).json({
    success: true,
    message: "تم إنشاء التبرع بنجاح",
    donation: formattedDonation,
  });
});

// جلب جميع التبرعات
const getAllDonations = asyncHandler(async (req, res) => {
  let filter = {};
  let populateOptions = [
    { path: "donor", select: "name email" },
    { path: "toOrder", select: "client_name" },
    { path: "toCharity", select: "name" },
  ];

  // Filter donations based on user role
  switch (req.userRole) {
    case "client":
      filter = { donor: new mongoose.Types.ObjectId(req.userId) };
      break;
    case "admin":
      // Admin sees all donations
      break;
    default:
      return res.status(403).json({
        success: false,
        message: "غير مصرح لك بعرض التبرعات",
      });
  }

  const donations = await Donation.find(filter)
    .populate(populateOptions)
    .sort({ createdAt: -1 });

  const formattedDonations = donations.map((donation) =>
    formatDonationResponse(donation)
  );

  res.status(200).json({
    success: true,
    message: "تم جلب التبرعات بنجاح",
    donations: formattedDonations,
    count: formattedDonations.length,
  });
});

// جلب تبرع واحد
const getDonation = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const donation = await Donation.findById(id).populate([
    { path: "donor", select: "name email" },
    { path: "toOrder", select: "client_name" },
    { path: "toCharity", select: "name" },
  ]);

  if (!donation) {
    return res.status(404).json({
      success: false,
      message: "التبرع غير موجود",
    });
  }

  // Check permissions
  if (req.userRole === "client") {
    const donationDonorId =
      donation.donor?._id?.toString() || donation.donor?.toString();
    if (donationDonorId !== req.userId.toString()) {
      return res.status(403).json({
        success: false,
        message: "غير مصرح لك بعرض هذا التبرع",
      });
    }
  }

  const formattedDonation = formatDonationResponse(donation);

  res.status(200).json({
    success: true,
    message: "تم جلب التبرع بنجاح",
    donation: formattedDonation,
  });
});

// تحديث التبرع
const updateDonation = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status, message } = req.body;

  const donation = await Donation.findById(id).populate([
    { path: "donor", select: "name email" },
    { path: "toOrder", select: "client_name" },
    { path: "toCharity", select: "name" },
  ]);

  if (!donation) {
    return res.status(404).json({
      success: false,
      message: "التبرع غير موجود",
    });
  }

  // Check permissions
  if (req.userRole === "client") {
    const donationDonorId =
      donation.donor?._id?.toString() || donation.donor?.toString();
    if (donationDonorId !== req.userId.toString()) {
      return res.status(403).json({
        success: false,
        message: "غير مصرح لك بتحديث هذا التبرع",
      });
    }
    // Clients can only update message and cancel their donations
    if (status && status !== "cancelled") {
      return res.status(403).json({
        success: false,
        message: "يمكنك فقط إلغاء التبرع أو تحديث الرسالة",
      });
    }
  }

  // Update donation
  if (status) donation.status = status;
  if (message) donation.message = message;

  await donation.save();

  const formattedDonation = formatDonationResponse(donation);

  res.status(200).json({
    success: true,
    message: "تم تحديث التبرع بنجاح",
    donation: formattedDonation,
  });
});

// قبول طلب تبرع من قبل مندوب التوصيل
const acceptDonationOrderByDelivery = asyncHandler(async (req, res) => {
  const { order_id, sub_order_id } = req.body;

  if (!order_id || !sub_order_id) {
    return res.status(400).json({
      success: false,
      message: "يجب تحديد order_id و sub_order_id",
    });
  }

  const order = await Order.findById(order_id).populate([
    { path: "subOrders.cook_id", select: "name email" },
    { path: "client_id", select: "name email" },
  ]);

  if (!order) {
    return res.status(404).json({
      success: false,
      message: "الطلب غير موجود",
    });
  }

  // التحقق من أن الطلب تبرع
  if (!order.isDonation) {
    return res.status(400).json({
      success: false,
      message: "هذا الطلب ليس تبرعاً",
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

  // تحديث sub-order
  subOrder.delivery_id = req.userId;
  subOrder.delivery_name = req.user.name;
  subOrder.delivery_status = "pending";

  await order.save();

  // Update donation status if linked
  if (order.donationId) {
    await Donation.findByIdAndUpdate(order.donationId, {
      status: "approved",
    });
  }

  res.status(200).json({
    success: true,
    message: "تم قبول طلب التبرع بنجاح",
    order: {
      order_id: order._id,
      sub_order_id: subOrder._id,
      delivery_id: req.userId,
      delivery_name: req.user.name,
    },
  });
});

// جلب إحصائيات التبرعات
const getDonationStats = asyncHandler(async (req, res) => {
  let filter = {};

  // Filter based on user role
  if (req.userRole === "client") {
    filter = { donor: new mongoose.Types.ObjectId(req.userId) };
  }

  const totalDonations = await Donation.countDocuments(filter);
  const totalAmount = await Donation.aggregate([
    { $match: filter },
    { $group: { _id: null, total: { $sum: "$amount" } } },
  ]);

  const statusStats = await Donation.aggregate([
    { $match: filter },
    { $group: { _id: "$status", count: { $sum: 1 } } },
  ]);

  res.status(200).json({
    success: true,
    message: "تم جلب إحصائيات التبرعات بنجاح",
    stats: {
      total_donations: totalDonations,
      total_amount: totalAmount[0]?.total || 0,
      status_breakdown: statusStats,
    },
  });
});

module.exports = {
  createDonation,
  getAllDonations,
  getDonation,
  updateDonation,
  acceptDonationOrderByDelivery,
  getDonationStats,
};
