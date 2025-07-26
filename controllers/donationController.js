const Donation = require("../models/Donation");
const Charity = require("../models/Charity");
const User = require("../models/User");
const Meal = require("../models/Meal");
const asyncHandler = require("../utils/asyncHandler");
const { ApiResponse } = require("../utils/response");
const mongoose = require("mongoose");
const crypto = require("crypto");
const { sendEmail } = require("../utils/sendMail");
const Cart = require("../models/Cart"); // Added Cart model import
const {
  generateDonationConfirmationEmail,
  generateDonationReadyForPickupEmail,
} = require("../utils/generateHTMLCharitiesEmails");

// Helper function to format donation response
const formatDonationResponse = (donation) => {
  return {
    donation_id: donation._id,
    donor: {
      id: donation.donor?._id || donation.donor,
      name: donation.donor?.name || "",
      email: donation.donor?.email || "",
    },
    charity: {
      id: donation.toCharity?._id || donation.toCharity,
      name: donation.toCharity?.name || "",
      email: donation.toCharity?.email || "",
      address: donation.toCharity?.address || "",
      phone: donation.toCharity?.phone || "",
    },
    cook: {
      id: donation.cook?._id || donation.cook,
      name: donation.cook?.name || "",
      phone: donation.cook?.phone || "",
      address: donation.cook?.verificationRef?.address || {},
      location: donation.cook?.verificationRef?.location || {},
    },
    meals:
      donation.meals?.map((meal) => ({
        meal_id: meal.meal?._id || meal.meal,
        name: meal.meal?.name || "",
        quantity: meal.quantity,
        price: meal.price,
        total: meal.quantity * meal.price,
      })) || [],
    amount: donation.amount,
    message: donation.message,
    status: donation.status,
    confirmedAt: donation.confirmedAt,
    completedAt: donation.completedAt,
    completionNote: donation.completionNote,
    createdAt: donation.createdAt,
    updatedAt: donation.updatedAt,
  };
};

// إنشاء تبرع جديد - للعملاء فقط
exports.createDonation = asyncHandler(async (req, res) => {
  const { charityId, meals, message } = req.body;

  // التحقق من وجود الجمعية
  const charity = await Charity.findById(charityId);
  if (!charity) {
    return res.status(404).json({
      success: false,
      message: "الجمعية غير موجودة",
    });
  }

  // التحقق من وجود الوجبات
  if (!meals || !Array.isArray(meals) || meals.length === 0) {
    return res.status(400).json({
      success: false,
      message: "يجب تحديد وجبة واحدة على الأقل",
    });
  }

  // التحقق من الوجبات والحصول على معلومات الطباخ
  let totalAmount = 0;
  let cookId = null;
  const validatedMeals = [];

  for (const mealItem of meals) {
    const meal = await Meal.findById(mealItem.mealId);
    if (!meal) {
      return res.status(404).json({
        success: false,
        message: `الوجبة ${mealItem.mealId} غير موجودة`,
      });
    }

    if (meal.quantity < mealItem.quantity) {
      return res.status(400).json({
        success: false,
        message: `الكمية المطلوبة غير متوفرة للوجبة: ${meal.name}`,
      });
    }

    // التحقق من أن جميع الوجبات لنفس الطباخ
    if (cookId && cookId.toString() !== meal.cook.toString()) {
      return res.status(400).json({
        success: false,
        message: "جميع الوجبات يجب أن تكون من نفس الطباخ",
      });
    }
    cookId = meal.cook;

    const mealTotal = meal.price * mealItem.quantity;
    totalAmount += mealTotal;

    validatedMeals.push({
      meal: meal._id,
      quantity: mealItem.quantity,
      price: meal.price,
    });
  }

  // إنشاء رمز التأكيد
  const confirmationToken = crypto.randomBytes(32).toString("hex");
  const tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 ساعة

  // إنشاء التبرع
  const donation = await Donation.create({
    donor: req.userId,
    amount: totalAmount,
    toCharity: charityId,
    cook: cookId,
    meals: validatedMeals,
    message,
    confirmationToken,
    tokenExpiry,
    logs: [
      {
        action: "created",
        by: req.userId,
        note: "تم إنشاء التبرع",
      },
    ],
  });

  // إرسال بريد إلكتروني للجمعية
  const confirmationUrl = `${
    process.env.FRONTEND_Production_URL || process.env.FRONTEND_Development_URL
  }/confirm-donation?token=${confirmationToken}`;

  const emailContent = generateDonationConfirmationEmail({
    charityName: charity.name,
    confirmationLink: confirmationUrl,
    meals: validatedMeals.map((m) => ({
      name: m.mealName || "وجبة",
      quantity: m.quantity,
    })),
    message: message || "لا توجد رسالة",
    amount: totalAmount,
  });

  await sendEmail({
    to: charity.email,
    subject: "طلب تبرع جديد - تأكيد مطلوب",
    html: emailContent,
  });

  // جلب التبرع مع البيانات المرتبطة
  const populatedDonation = await Donation.findById(donation._id)
    .populate("donor", "name email")
    .populate("toCharity", "name email address phone")
    .populate("cook", "name email phone verificationRef")
    .populate("meals.meal", "name price");

  res.status(201).json({
    success: true,
    message: "تم إنشاء التبرع بنجاح وتم إرسال رابط التأكيد للجمعية",
    donation: formatDonationResponse(populatedDonation),
  });
});

// تأكيد التبرع بواسطة الجمعية عبر الرابط
exports.confirmDonationByToken = asyncHandler(async (req, res) => {
  const { token } = req.params;

  const donation = await Donation.findOne({
    confirmationToken: token,
    tokenExpiry: { $gt: new Date() },
    status: "pending",
  })
    .populate("toCharity", "name email")
    .populate("donor", "name email")
    .populate("cook", "name email phone verificationRef")
    .populate("meals.meal", "name price");

  if (!donation) {
    return res.status(400).json({
      success: false,
      message: "رابط التأكيد غير صالح أو منتهي الصلاحية",
    });
  }

  // تحديث حالة التبرع
  donation.status = "confirmed";
  donation.confirmedAt = new Date();
  donation.confirmationToken = undefined;
  donation.tokenExpiry = undefined;
  donation.logs.push({
    action: "confirmed",
    by: donation.toCharity._id,
    note: "تم تأكيد التبرع من قبل الجمعية",
  });

  await donation.save();

  // إرسال بريد إلكتروني للطباخ
  const cookEmailContent = `
    <h2>طلب تبرع مؤكد</h2>
    <p>مرحباً ${donation.cook.name}،</p>
    <p>لديك طلب تبرع مؤكد من جمعية ${donation.toCharity.name}</p>
    <p>تفاصيل الطلب:</p>
    <ul>
      ${donation.meals
        .map((m) => `<li>${m.meal.name} - الكمية: ${m.quantity}</li>`)
        .join("")}
    </ul>
    <p>المبلغ الإجمالي: ${donation.amount} جنية مصري</p>
    <p>الرسالة: ${donation.message || "لا توجد رسالة"}</p>
    <p>يرجى البدء في تحضير الوجبات.</p>
  `;

  await sendEmail({
    to: donation.cook.email,
    subject: "طلب تبرع مؤكد - يرجى التحضير",
    html: cookEmailContent,
  });

  res.status(200).json({
    success: true,
    message: "تم تأكيد التبرع بنجاح وتم إخطار الطباخ",
    donation: formatDonationResponse(donation),
  });
});

// تحديث حالة التبرع (للطباخ)
exports.updateDonationStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status, completionNote } = req.body;

  const donation = await Donation.findById(id)
    .populate("toCharity", "name email")
    .populate("donor", "name email")
    .populate({
      path: "cook",
      select: "name email phone verificationRef",
      populate: {
        path: "verificationRef",
        select: "address location",
      },
    })
    .populate("meals.meal", "name price");

  if (!donation) {
    return res.status(404).json({
      success: false,
      message: "التبرع غير موجود",
    });
  }

  // التحقق من أن المستخدم هو الطباخ
  if (donation.cook._id.toString() !== req.userId.toString()) {
    return res.status(403).json({
      success: false,
      message: "غير مصرح لك بتحديث هذا التبرع",
    });
  }

  // التحقق من الحالة الحالية
  if (donation.status === "cancelled") {
    return res.status(400).json({
      success: false,
      message: "لا يمكن تحديث تبرع ملغي",
    });
  }

  // تحديث الحالة
  donation.status = status;
  donation.logs.push({
    action: "status_updated",
    by: req.userId,
    note: `تم تحديث الحالة إلى ${status}`,
  });

  if (status === "completed") {
    donation.completedAt = new Date();
    donation.completionNote = completionNote;

    // إرسال بريد إلكتروني للجمعية مع تفاصيل الطباخ
    const charityEmailContent = generateDonationReadyForPickupEmail({
      charityName: donation.toCharity.name,
      cook: {
        name: donation.cook.name,
        phone: donation.cook.phone,
        address: donation.cook.verificationRef?.address || "غير محدد",
        location: donation.cook.verificationRef?.location || null,
      },
      meals: donation.meals.map((m) => ({
        name: m.meal.name,
        quantity: m.quantity,
      })),
      message: donation.message || "لا توجد رسالة",
      amount: donation.amount,
    });

    await sendEmail({
      to: donation.toCharity.email,
      subject: "طلب التبرع مكتمل - جاهز للاستلام",
      html: charityEmailContent,
    });
  }

  await donation.save();

  res.status(200).json({
    success: true,
    message: "تم تحديث حالة التبرع بنجاح",
    donation: formatDonationResponse(donation),
  });
});

// جلب جميع التبرعات - للعملاء والمدراء
exports.getAllDonations = asyncHandler(async (req, res) => {
  const { status, page = 1, limit = 10 } = req.query;
  const skip = (page - 1) * limit;

  let query = {};

  // فلترة حسب الحالة
  if (status) {
    query.status = status;
  }

  // فلترة حسب نوع المستخدم
  if (req.user.role === "client") {
    query.donor = req.userId;
  } else if (req.user.role === "cook") {
    query.cook = req.userId;
  }

  const donations = await Donation.find(query)
    .populate("donor", "name email")
    .populate("toCharity", "name email address phone")
    .populate("cook", "name email phone verificationRef")
    .populate("meals.meal", "name price")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit));

  const total = await Donation.countDocuments(query);

  res.status(200).json({
    success: true,
    message: `تم جلب ${donations.length} تبرع بنجاح`,
    donations: donations.map(formatDonationResponse),
    pagination: {
      current: parseInt(page),
      total: Math.ceil(total / limit),
      count: donations.length,
      totalCount: total,
    },
  });
});

// جلب تبرع واحد - للعملاء والمدراء
exports.getDonation = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const donation = await Donation.findById(id)
    .populate("donor", "name email")
    .populate("toCharity", "name email address phone")
    .populate("cook", "name email phone verificationRef")
    .populate("meals.meal", "name price");

  if (!donation) {
    return res.status(404).json({
      success: false,
      message: "التبرع غير موجود",
    });
  }

  // التحقق من الصلاحيات
  if (
    req.user.role === "client" &&
    donation.donor._id.toString() !== req.userId
  ) {
    return res.status(403).json({
      success: false,
      message: "غير مصرح لك بعرض هذا التبرع",
    });
  }

  if (req.user.role === "cook" && donation.cook._id.toString() !== req.userId) {
    return res.status(403).json({
      success: false,
      message: "غير مصرح لك بعرض هذا التبرع",
    });
  }

  res.status(200).json({
    success: true,
    message: "تم جلب التبرع بنجاح",
    donation: formatDonationResponse(donation),
  });
});

// جلب إحصائيات التبرعات - للعملاء والمدراء
exports.getDonationStats = asyncHandler(async (req, res) => {
  let query = {};

  // فلترة حسب نوع المستخدم
  if (req.user.role === "client") {
    query.donor = req.userId;
  } else if (req.user.role === "cook") {
    query.cook = req.userId;
  }

  const stats = await Donation.aggregate([
    { $match: query },
    {
      $group: {
        _id: "$status",
        count: { $sum: 1 },
        totalAmount: { $sum: "$amount" },
      },
    },
  ]);

  const totalDonations = await Donation.countDocuments(query);
  const totalAmount = await Donation.aggregate([
    { $match: query },
    { $group: { _id: null, total: { $sum: "$amount" } } },
  ]);

  const statsObject = {
    total: totalDonations,
    totalAmount: totalAmount[0]?.total || 0,
    byStatus: {},
  };

  stats.forEach((stat) => {
    statsObject.byStatus[stat._id] = {
      count: stat.count,
      amount: stat.totalAmount,
    };
  });

  res.status(200).json({
    success: true,
    message: "تم جلب إحصائيات التبرعات بنجاح",
    stats: statsObject,
  });
});

// إنشاء تبرع من سلة التسوق - للعملاء فقط
exports.createDonationFromCart = asyncHandler(async (req, res) => {
  const { charityId, message } = req.body;

  // التحقق من وجود الجمعية
  const charity = await Charity.findById(charityId);
  if (!charity) {
    return res.status(404).json({
      success: false,
      message: "الجمعية غير موجودة",
    });
  }

  // جلب سلة التسوق للمستخدم
  const cart = await Cart.findOne({ clientId: req.userId }).populate({
    path: "meals.mealId",
    select: "name price quantity",
  });

  if (!cart || cart.meals.length === 0) {
    return res.status(400).json({
      success: false,
      message: "سلة التسوق فارغة",
    });
  }

  // التحقق من أن جميع الوجبات متوفرة ومن نفس الطباخ
  let totalAmount = 0;
  let cookId = null;
  const validatedMeals = [];

  for (const cartItem of cart.meals) {
    const meal = cartItem.mealId;

    if (meal.quantity < cartItem.quantity) {
      return res.status(400).json({
        success: false,
        message: `الكمية المطلوبة غير متوفرة للوجبة: ${meal.name}`,
      });
    }

    // التحقق من أن جميع الوجبات لنفس الطباخ
    if (cookId && cookId.toString() !== cartItem.cookId.toString()) {
      return res.status(400).json({
        success: false,
        message: "جميع الوجبات يجب أن تكون من نفس الطباخ",
      });
    }

    cookId = cartItem.cookId;
    totalAmount += meal.price * cartItem.quantity;

    validatedMeals.push({
      meal: meal._id,
      mealName: meal.name,
      quantity: cartItem.quantity,
      price: meal.price,
    });
  }

  // إنشاء التبرع
  const donation = new Donation({
    donor: req.userId,
    toCharity: charityId,
    cook: cookId,
    meals: validatedMeals,
    amount: totalAmount,
    message: message || "",
    status: "pending",
    confirmationToken: crypto.randomBytes(32).toString("hex"),
    tokenExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 ساعة
  });

  await donation.save();

  // إرسال بريد إلكتروني للجمعية
  const confirmationUrl = `${
    process.env.FRONTEND_Production_URL || process.env.FRONTEND_Development_URL
  }/donations/confirm/${donation.confirmationToken}`;

  const emailContent = generateDonationConfirmationEmail({
    charityName: charity.name,
    confirmationLink: confirmationUrl,
    meals: validatedMeals.map((item) => ({
      name: item.mealName || "وجبة",
      quantity: item.quantity,
    })),
    message: message || "لا توجد رسالة",
    amount: totalAmount,
  });

  await sendEmail({
    to: charity.email,
    subject: "طلب تبرع جديد - تأكيد مطلوب",
    html: emailContent,
  });

  // مسح سلة التسوق
  cart.meals = [];
  cart.updatedAt = new Date();
  await cart.save();

  // جلب التبرع مع البيانات المرتبطة
  const populatedDonation = await Donation.findById(donation._id)
    .populate("donor", "name email")
    .populate("toCharity", "name email address phone")
    .populate({
      path: "cook",
      select: "name email phone verificationRef",
      populate: {
        path: "verificationRef",
        select: "address location",
      },
    })
    .populate("meals.meal", "name price");

  res.status(201).json({
    success: true,
    message: "تم إنشاء التبرع بنجاح وتم إرسال رابط التأكيد للجمعية",
    donation: formatDonationResponse(populatedDonation),
  });
});
