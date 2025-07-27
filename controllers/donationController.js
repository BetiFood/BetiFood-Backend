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
const Stripe = require("stripe");
const stripe = Stripe(process.env.Stripe_Secret_key);
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
    payment: {
      method: donation.paymentMethod || "online",
      status: donation.paymentStatus || "pending",
      paymentIntentId: donation.stripePaymentIntentId,
    },
    confirmedAt: donation.confirmedAt,
    completedAt: donation.completedAt,
    completionNote: donation.completionNote,
    createdAt: donation.createdAt,
    updatedAt: donation.updatedAt,
  };
};

// إنشاء تبرع جديد - للعملاء فقط
exports.createDonation = asyncHandler(async (req, res) => {
  const { charityId, meals, message, paymentMethod = "online" } = req.body;

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

  // التحقق من طريقة الدفع
  if (paymentMethod !== "online") {
    return res.status(400).json({
      success: false,
      message: "التبرعات تدعم الدفع الإلكتروني فقط",
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
    if (cookId && cookId.toString() !== meal.cook.cookId.toString()) {
      return res.status(400).json({
        success: false,
        message: "جميع الوجبات يجب أن تكون من نفس الطباخ",
      });
    }
    cookId = meal.cook.cookId;

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
    status: "pending",
    paymentMethod: "online",
    paymentStatus: "pending",
    logs: [
      {
        action: "created",
        by: req.userId,
        note: "تم إنشاء التبرع",
      },
    ],
  });

  // إنشاء Stripe Payment Intent
  const amountInCents = Math.round(totalAmount * 100);
  const paymentIntent = await stripe.paymentIntents.create({
    amount: amountInCents,
    currency: "usd",
    metadata: {
      donationId: donation._id.toString(),
      type: "donation",
    },
  });

  // تحديث التبرع بمعلومات الدفع
  donation.stripePaymentIntentId = paymentIntent.id;
  donation.stripeClientSecret = paymentIntent.client_secret;
  await donation.save();

  // إرسال بريد إلكتروني للجمعية
  const confirmationUrl = `${
    process.env.FRONTEND_Production_URL || process.env.FRONTEND_Development_URL
  }/donations/confirm/${donation.confirmationToken}`;

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
    stripeClientSecret: paymentIntent.client_secret,
    paymentIntentId: paymentIntent.id,
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

  // Automatic payment status check - if payment is pending and has Stripe ID, check with Stripe
  if (
    donation.paymentStatus === "pending" &&
    donation.stripePaymentIntentId &&
    stripe
  ) {
    try {
      const paymentIntent = await stripe.paymentIntents.retrieve(
        donation.stripePaymentIntentId
      );

      if (
        paymentIntent.status === "succeeded" &&
        donation.paymentStatus !== "paid"
      ) {
        // Update payment status in database
        await Donation.findByIdAndUpdate(donation._id, {
          paymentStatus: "paid",
          logs: {
            $push: {
              action: "payment_succeeded_auto_check",
              by: donation._id,
              note: "تم تحديث حالة الدفع تلقائياً بعد التحقق من Stripe",
            },
          },
        });

        // Add balance credit for cook (90/10 split)
        const { addCreditToCook } = require("./balanceController");

        try {
          await addCreditToCook(donation.cook._id, {
            amount: donation.amount,
            totalAmount: donation.amount,
            description: `دفع تبرع - ${donation.meals.length} وجبة`,
            donationId: donation._id,
            paymentIntentId: paymentIntent.id,
          });
          console.log(
            `✅ Auto-updated donation payment status for ${donation._id}: ${donation.amount}`
          );
        } catch (error) {
          console.error(
            `❌ Error adding credit to cook ${donation.cook._id}:`,
            error
          );
        }

        // Update the donation object for response
        donation.paymentStatus = "paid";
      }
    } catch (stripeError) {
      console.error(
        "Error checking donation payment status with Stripe:",
        stripeError
      );
    }
  }

  // التحقق من حالة الدفع
  if (donation.paymentStatus !== "paid") {
    return res.status(400).json({
      success: false,
      message: "لا يمكن للطباخ قبول التبرع قبل إتمام الدفع الإلكتروني.",
    });
  }

  // التحقق من الحالة الحالية
  if (donation.status === "cancelled") {
    return res.status(400).json({
      success: false,
      message: "لا يمكن تحديث تبرع ملغي",
    });
  }

  // التحقق من أن الطباخ يمكنه إلغاء التبرع فقط إذا كان في حالة "confirmed" أو "preparing"
  if (
    status === "cancelled" &&
    donation.status !== "confirmed" &&
    donation.status !== "preparing"
  ) {
    return res.status(400).json({
      success: false,
      message:
        "لا يمكن للطباخ إلغاء التبرع في هذه الحالة. يمكن الإلغاء فقط عندما تكون الحالة 'مؤكد' أو 'جاري التحضير'",
    });
  }

  // تحديث الحالة
  donation.status = status;
  donation.logs.push({
    action: "status_updated",
    by: req.userId,
    note: `تم تحديث الحالة إلى ${status}`,
  });

  // معالجة استرداد المال إذا كان الطباخ يلغي التبرع وكان الدفع قد تم
  if (
    status === "cancelled" &&
    donation.paymentStatus === "paid" &&
    donation.stripePaymentIntentId
  ) {
    try {
      // إنشاء استرداد من Stripe
      const refund = await stripe.refunds.create({
        payment_intent: donation.stripePaymentIntentId,
        reason: "requested_by_customer",
        metadata: {
          donationId: donation._id.toString(),
          cancelledBy: "cook",
          reason: "Cook cancelled the donation",
        },
      });

      // تحديث حالة الدفع إلى مسترد
      donation.paymentStatus = "refunded";
      donation.logs.push({
        action: "payment_refunded",
        by: req.userId,
        note: `تم استرداد المال بنجاح - Refund ID: ${refund.id}`,
      });

      // خصم المبلغ من رصيد الطباخ
      const { addCreditToCook } = require("./balanceController");
      try {
        await addCreditToCook(donation.cook._id, {
          type: "debit",
          amount: -donation.amount, // خصم المبلغ
          totalAmount: donation.amount,
          description: `استرداد تبرع ملغي من قبل الطباخ - ${donation.meals.length} وجبة`,
          donationId: donation._id,
          paymentIntentId: donation.stripePaymentIntentId,
        });
        console.log(
          `Deducted ${donation.amount} from cook ${donation.cook._id} balance due to cook cancellation`
        );
      } catch (balanceError) {
        console.error(`Error deducting from cook balance:`, balanceError);
      }

      console.log(
        `Refund processed for donation ${donation._id}: ${refund.id}`
      );
    } catch (refundError) {
      console.error(
        `Error processing refund for donation ${donation._id}:`,
        refundError
      );
      donation.logs.push({
        action: "refund_failed",
        by: req.userId,
        note: `فشل في استرداد المال: ${refundError.message}`,
      });
    }
  }

  // إرسال بريد إلكتروني عند إلغاء التبرع من قبل الطباخ
  if (status === "cancelled") {
    // إرسال بريد إلكتروني للجمعية
    const charityEmailContent = `
      <h2>إلغاء تبرع من قبل الطباخ</h2>
      <p>مرحباً ${donation.toCharity.name}،</p>
      <p>تم إلغاء التبرع التالي من قبل الطباخ:</p>
      <ul>
        <li>الطباخ: ${donation.cook.name} (${donation.cook.email})</li>
        <li>المتبرع: ${donation.donor.name} (${donation.donor.email})</li>
        <li>المبلغ: ${donation.amount} جنية مصري</li>
        <li>الوجبات: ${donation.meals
          .map((m) => `${m.meal.name} - ${m.quantity}`)
          .join(", ")}</li>
        <li>الرسالة: ${donation.message || "لا توجد رسالة"}</li>
      </ul>
      <p>سيتم استرداد المال للمتبرع تلقائياً.</p>
      <p>شكراً لكم</p>
    `;

    try {
      await sendEmail({
        to: donation.toCharity.email,
        subject: "إلغاء تبرع من قبل الطباخ",
        html: charityEmailContent,
      });
    } catch (emailError) {
      console.error("Error sending cancellation email to charity:", emailError);
    }

    // إرسال بريد إلكتروني للمتبرع
    const donorEmailContent = `
      <h2>إلغاء تبرع</h2>
      <p>مرحباً ${donation.donor.name}،</p>
      <p>تم إلغاء تبرعك من قبل الطباخ ${donation.cook.name}.</p>
      <p>تفاصيل التبرع الملغي:</p>
      <ul>
        <li>الجمعية: ${donation.toCharity.name}</li>
        <li>المبلغ: ${donation.amount} جنية مصري</li>
        <li>الوجبات: ${donation.meals
          .map((m) => `${m.meal.name} - ${m.quantity}`)
          .join(", ")}</li>
        <li>الرسالة: ${donation.message || "لا توجد رسالة"}</li>
      </ul>
      <p>سيتم استرداد المال إلى حسابك خلال 5-10 أيام عمل.</p>
      <p>شكراً لتفهمكم</p>
    `;

    try {
      await sendEmail({
        to: donation.donor.email,
        subject: "إلغاء تبرع من قبل الطباخ",
        html: donorEmailContent,
      });
    } catch (emailError) {
      console.error("Error sending cancellation email to donor:", emailError);
    }
  }

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

  // Automatic payment status check for pending donations with Stripe IDs
  if (stripe) {
    for (const donation of donations) {
      if (
        donation.paymentStatus === "pending" &&
        donation.stripePaymentIntentId
      ) {
        try {
          const paymentIntent = await stripe.paymentIntents.retrieve(
            donation.stripePaymentIntentId
          );

          if (
            paymentIntent.status === "succeeded" &&
            donation.paymentStatus !== "paid"
          ) {
            // Update payment status in database
            await Donation.findByIdAndUpdate(donation._id, {
              paymentStatus: "paid",
              logs: {
                $push: {
                  action: "payment_succeeded_auto_check",
                  by: donation._id,
                  note: "تم تحديث حالة الدفع تلقائياً بعد التحقق من Stripe",
                },
              },
            });

            // Add balance credit for cook (90/10 split)
            const { addCreditToCook } = require("./balanceController");

            try {
              await addCreditToCook(donation.cook._id, {
                amount: donation.amount,
                totalAmount: donation.amount,
                description: `دفع تبرع - ${donation.meals.length} وجبة`,
                donationId: donation._id,
                paymentIntentId: paymentIntent.id,
              });
              console.log(
                `✅ Auto-updated donation payment status for ${donation._id}: ${donation.amount}`
              );
            } catch (error) {
              console.error(
                `❌ Error adding credit to cook ${donation.cook._id}:`,
                error
              );
            }

            // Update the donation object for response
            donation.paymentStatus = "paid";
          }
        } catch (stripeError) {
          console.error(
            "Error checking donation payment status with Stripe:",
            stripeError
          );
        }
      }
    }
  }

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

  // Automatic payment status check - if payment is pending and has Stripe ID, check with Stripe
  if (
    donation.paymentStatus === "pending" &&
    donation.stripePaymentIntentId &&
    stripe
  ) {
    try {
      const paymentIntent = await stripe.paymentIntents.retrieve(
        donation.stripePaymentIntentId
      );

      if (
        paymentIntent.status === "succeeded" &&
        donation.paymentStatus !== "paid"
      ) {
        // Update payment status in database
        await Donation.findByIdAndUpdate(donation._id, {
          paymentStatus: "paid",
          logs: {
            $push: {
              action: "payment_succeeded_auto_check",
              by: donation._id,
              note: "تم تحديث حالة الدفع تلقائياً بعد التحقق من Stripe",
            },
          },
        });

        // Add balance credit for cook (90/10 split)
        const { addCreditToCook } = require("./balanceController");

        try {
          await addCreditToCook(donation.cook._id, {
            amount: donation.amount,
            totalAmount: donation.amount,
            description: `دفع تبرع - ${donation.meals.length} وجبة`,
            donationId: donation._id,
            paymentIntentId: paymentIntent.id,
          });
          console.log(
            `✅ Auto-updated donation payment status for ${donation._id}: ${donation.amount}`
          );
        } catch (error) {
          console.error(
            `❌ Error adding credit to cook ${donation.cook._id}:`,
            error
          );
        }

        // Update the donation object for response
        donation.paymentStatus = "paid";
      }
    } catch (stripeError) {
      console.error(
        "Error checking donation payment status with Stripe:",
        stripeError
      );
    }
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
    paymentMethod: "online",
    paymentStatus: "pending",
    confirmationToken: crypto.randomBytes(32).toString("hex"),
    tokenExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 ساعة
  });

  await donation.save();

  // إنشاء Stripe Payment Intent
  const amountInCents = Math.round(totalAmount * 100);
  const paymentIntent = await stripe.paymentIntents.create({
    amount: amountInCents,
    currency: "usd",
    metadata: {
      donationId: donation._id.toString(),
      type: "donation",
    },
  });

  // تحديث التبرع بمعلومات الدفع
  donation.stripePaymentIntentId = paymentIntent.id;
  donation.stripeClientSecret = paymentIntent.client_secret;
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
    stripeClientSecret: paymentIntent.client_secret,
    paymentIntentId: paymentIntent.id,
  });
});

// Stripe webhook handler for donations
exports.stripeDonationWebhook = asyncHandler(async (req, res) => {
  const sig = req.headers["stripe-signature"];
  let event;

  console.log("Donation webhook received:", {
    signature: sig ? "present" : "missing",
    bodyLength: req.body ? req.body.length : 0,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET_DONATIONS
      ? "present"
      : "missing",
  });

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET_DONATIONS
    );
    console.log("Donation webhook event verified:", event.type);
  } catch (err) {
    console.error(
      "Donation webhook signature verification failed:",
      err.message
    );
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  if (event.type === "payment_intent.succeeded") {
    const paymentIntent = event.data.object;
    console.log("Payment intent succeeded:", {
      paymentIntentId: paymentIntent.id,
      metadata: paymentIntent.metadata,
      amount: paymentIntent.amount,
    });

    // Check if this is a donation payment
    if (paymentIntent.metadata && paymentIntent.metadata.type === "donation") {
      const donationId = paymentIntent.metadata.donationId;
      console.log("Processing donation payment:", donationId);

      // Update donation payment status
      const donation = await Donation.findByIdAndUpdate(
        donationId,
        {
          paymentStatus: "paid",
          logs: {
            $push: {
              action: "payment_succeeded",
              by: donationId, // Using donationId as reference
              note: "تم دفع التبرع بنجاح",
            },
          },
        },
        { new: true }
      ).populate("cook", "name email");

      if (donation) {
        console.log(`Donation ${donationId} payment succeeded`);

        // Add balance credit for cook (90/10 split)
        const { addCreditToCook } = require("./balanceController");

        try {
          await addCreditToCook(donation.cook._id, {
            amount: donation.amount,
            totalAmount: donation.amount,
            description: `دفع تبرع - ${donation.meals.length} وجبة`,
            donationId: donation._id,
            paymentIntentId: paymentIntent.id,
          });
          console.log(
            `Added credit to cook ${donation.cook._id}: ${donation.amount}`
          );
        } catch (error) {
          console.error(
            `Error adding credit to cook ${donation.cook._id}:`,
            error
          );
        }
      }
    }
  } else if (event.type === "payment_intent.payment_failed") {
    const paymentIntent = event.data.object;

    // Check if this is a donation payment
    if (paymentIntent.metadata && paymentIntent.metadata.type === "donation") {
      const donationId = paymentIntent.metadata.donationId;

      // Update donation payment status
      await Donation.findByIdAndUpdate(donationId, {
        paymentStatus: "failed",
        logs: {
          $push: {
            action: "payment_failed",
            by: donationId,
            note: "فشل في دفع التبرع",
          },
        },
      });

      console.log(`Donation ${donationId} payment failed`);
    }
  }

  res.json({ received: true });
});

// Get donation payment status
exports.getDonationPaymentStatus = asyncHandler(async (req, res) => {
  const { donationId } = req.params;

  const donation = await Donation.findById(donationId)
    .select("paymentStatus stripePaymentIntentId amount donor cook")
    .populate("donor", "_id")
    .populate("cook", "_id");

  if (!donation) {
    return res.status(404).json({
      success: false,
      message: "التبرع غير موجود",
    });
  }

  // Check if user has permission to view this donation's payment status
  const userIsDonor = donation.donor._id.toString() === req.userId.toString();
  const userIsCook = donation.cook._id.toString() === req.userId.toString();
  const userIsAdmin = req.user && req.user.role === "admin";

  if (!userIsDonor && !userIsCook && !userIsAdmin) {
    return res.status(403).json({
      success: false,
      message: "غير مصرح لك بالوصول إلى حالة دفع هذا التبرع",
    });
  }

  // If payment status is still pending, check with Stripe directly
  if (donation.paymentStatus === "pending" && donation.stripePaymentIntentId) {
    try {
      const paymentIntent = await stripe.paymentIntents.retrieve(
        donation.stripePaymentIntentId
      );

      if (
        paymentIntent.status === "succeeded" &&
        donation.paymentStatus !== "paid"
      ) {
        // Update payment status in database
        await Donation.findByIdAndUpdate(donationId, {
          paymentStatus: "paid",
          logs: {
            $push: {
              action: "payment_succeeded_manual_check",
              by: donationId,
              note: "تم تحديث حالة الدفع يدوياً بعد التحقق من Stripe",
            },
          },
        });

        // Add balance credit for cook (90/10 split)
        const { addCreditToCook } = require("./balanceController");
        const donationWithCook = await Donation.findById(donationId).populate(
          "cook",
          "name email"
        );

        if (donationWithCook) {
          try {
            await addCreditToCook(donationWithCook.cook._id, {
              amount: donationWithCook.amount,
              totalAmount: donationWithCook.amount,
              description: `دفع تبرع - ${donationWithCook.meals.length} وجبة`,
              donationId: donationWithCook._id,
              paymentIntentId: paymentIntent.id,
            });
            console.log(
              `Added credit to cook ${donationWithCook.cook._id}: ${donationWithCook.amount}`
            );
          } catch (error) {
            console.error(
              `Error adding credit to cook ${donationWithCook.cook._id}:`,
              error
            );
          }
        }

        // Return updated status
        return res.status(200).json({
          success: true,
          paymentStatus: "paid",
          amount: donation.amount,
          paymentIntentId: donation.stripePaymentIntentId,
          updated: true,
        });
      }
    } catch (stripeError) {
      console.error("Error checking payment status with Stripe:", stripeError);
    }
  }

  res.status(200).json({
    success: true,
    paymentStatus: donation.paymentStatus,
    amount: donation.amount,
    paymentIntentId: donation.stripePaymentIntentId,
  });
});

// Client cancellation of donation
exports.cancelDonationByClient = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;

  const donation = await Donation.findById(id)
    .populate("toCharity", "name email")
    .populate("donor", "name email")
    .populate("cook", "name email")
    .populate("meals.meal", "name price");

  if (!donation) {
    return res.status(404).json({
      success: false,
      message: "التبرع غير موجود",
    });
  }

  // التحقق من أن المستخدم هو المتبرع
  if (donation.donor._id.toString() !== req.userId.toString()) {
    return res.status(403).json({
      success: false,
      message: "غير مصرح لك بإلغاء هذا التبرع",
    });
  }

  // التحقق من أن الحالة تسمح بالإلغاء (pending أو confirmed فقط)
  if (donation.status !== "pending" && donation.status !== "confirmed") {
    return res.status(400).json({
      success: false,
      message:
        "لا يمكن إلغاء التبرع في هذه الحالة. يمكن الإلغاء فقط عندما تكون الحالة 'في الانتظار' أو 'مؤكد'",
    });
  }

  // التحقق من حالة الدفع
  const needsRefund = donation.paymentStatus === "paid";
  const originalStatus = donation.status;

  // إلغاء التبرع
  donation.status = "cancelled";
  donation.logs.push({
    action: "cancelled_by_client",
    by: req.userId,
    note: `تم إلغاء التبرع من قبل المتبرع${
      reason ? ` - السبب: ${reason}` : ""
    }`,
  });

  await donation.save();

  // معالجة استرداد المال إذا كان الدفع قد تم
  if (needsRefund && donation.stripePaymentIntentId) {
    try {
      // إنشاء استرداد من Stripe
      const refund = await stripe.refunds.create({
        payment_intent: donation.stripePaymentIntentId,
        reason: "requested_by_customer",
        metadata: {
          donationId: donation._id.toString(),
          cancelledBy: "client",
          reason: reason || "No reason provided",
        },
      });

      // تحديث حالة الدفع إلى مسترد
      donation.paymentStatus = "refunded";
      donation.logs.push({
        action: "payment_refunded",
        by: req.userId,
        note: `تم استرداد المال بنجاح - Refund ID: ${refund.id}`,
      });

      // خصم المبلغ من رصيد الطباخ
      const { addCreditToCook } = require("./balanceController");
      try {
        await addCreditToCook(donation.cook._id, {
          type: "debit",
          amount: -donation.amount, // خصم المبلغ
          totalAmount: donation.amount,
          description: `استرداد تبرع ملغي - ${donation.meals.length} وجبة`,
          donationId: donation._id,
          paymentIntentId: donation.stripePaymentIntentId,
        });
        console.log(
          `Deducted ${donation.amount} from cook ${donation.cook._id} balance due to cancellation`
        );
      } catch (balanceError) {
        console.error(`Error deducting from cook balance:`, balanceError);
      }

      await donation.save();
      console.log(
        `Refund processed for donation ${donation._id}: ${refund.id}`
      );
    } catch (refundError) {
      console.error(
        `Error processing refund for donation ${donation._id}:`,
        refundError
      );
      donation.logs.push({
        action: "refund_failed",
        by: req.userId,
        note: `فشل في استرداد المال: ${refundError.message}`,
      });
      await donation.save();
    }
  }

  // إرسال بريد إلكتروني للجمعية
  const charityEmailContent = `
    <h2>إلغاء تبرع</h2>
    <p>مرحباً ${donation.toCharity.name}،</p>
    <p>تم إلغاء التبرع التالي من قبل المتبرع:</p>
    <ul>
      <li>المتبرع: ${donation.donor.name} (${donation.donor.email})</li>
      <li>المبلغ: ${donation.amount} جنية مصري</li>
      <li>الوجبات: ${donation.meals
        .map((m) => `${m.meal.name} - ${m.quantity}`)
        .join(", ")}</li>
      <li>الرسالة: ${donation.message || "لا توجد رسالة"}</li>
      <li>سبب الإلغاء: ${reason || "غير محدد"}</li>
    </ul>
    ${needsRefund ? "<p>سيتم استرداد المال للمتبرع تلقائياً.</p>" : ""}
    <p>شكراً لكم</p>
  `;

  try {
    await sendEmail({
      to: donation.toCharity.email,
      subject: "إلغاء تبرع",
      html: charityEmailContent,
    });
  } catch (emailError) {
    console.error("Error sending cancellation email to charity:", emailError);
  }

  // إرسال بريد إلكتروني للطباخ إذا كان التبرع مؤكد (قبل الإلغاء)
  if (originalStatus === "confirmed") {
    const cookEmailContent = `
      <h2>إلغاء تبرع</h2>
      <p>مرحباً ${donation.cook.name}،</p>
      <p>تم إلغاء التبرع التالي من قبل المتبرع:</p>
      <ul>
        <li>الجمعية: ${donation.toCharity.name}</li>
        <li>المبلغ: ${donation.amount} جنية مصري</li>
        <li>الوجبات: ${donation.meals
          .map((m) => `${m.meal.name} - ${m.quantity}`)
          .join(", ")}</li>
        <li>سبب الإلغاء: ${reason || "غير محدد"}</li>
      </ul>
      <p>لا حاجة لتحضير هذه الوجبات</p>
    `;

    try {
      await sendEmail({
        to: donation.cook.email,
        subject: "إلغاء تبرع - لا حاجة للتحضير",
        html: cookEmailContent,
      });
    } catch (emailError) {
      console.error("Error sending cancellation email to cook:", emailError);
    }
  }

  res.status(200).json({
    success: true,
    message: needsRefund
      ? "تم إلغاء التبرع بنجاح وسيتم استرداد المال خلال 5-10 أيام عمل"
      : "تم إلغاء التبرع بنجاح",
    donation: formatDonationResponse(donation),
  });
});

// Manual sync payment status for all pending donations (for admin/testing)
exports.syncPaymentStatus = asyncHandler(async (req, res) => {
  // Verify user is admin
  const user = await User.findById(req.userId);
  if (!user || user.role !== "admin") {
    return res.status(403).json({
      success: false,
      message: "غير مصرح لك بالوصول إلى هذه البيانات",
    });
  }

  const pendingDonations = await Donation.find({
    paymentStatus: "pending",
    stripePaymentIntentId: { $exists: true, $ne: null },
  });

  const results = {
    total: pendingDonations.length,
    updated: 0,
    errors: 0,
    details: [],
  };

  for (const donation of pendingDonations) {
    try {
      const paymentIntent = await stripe.paymentIntents.retrieve(
        donation.stripePaymentIntentId
      );

      if (paymentIntent.status === "succeeded") {
        // Update payment status
        await Donation.findByIdAndUpdate(donation._id, {
          paymentStatus: "paid",
          logs: {
            $push: {
              action: "payment_succeeded_manual_sync",
              by: req.userId,
              note: "تم تحديث حالة الدفع يدوياً من خلال المزامنة",
            },
          },
        });

        // Add balance credit for cook
        const { addCreditToCook } = require("./balanceController");
        const donationWithCook = await Donation.findById(donation._id).populate(
          "cook",
          "name email"
        );

        if (donationWithCook) {
          await addCreditToCook(donationWithCook.cook._id, {
            amount: donationWithCook.amount,
            totalAmount: donationWithCook.amount,
            description: `دفع تبرع - ${donationWithCook.meals.length} وجبة`,
            donationId: donationWithCook._id,
            paymentIntentId: paymentIntent.id,
          });
        }

        results.updated++;
        results.details.push({
          donationId: donation._id,
          status: "updated",
          paymentIntentId: donation.stripePaymentIntentId,
        });
      } else {
        results.details.push({
          donationId: donation._id,
          status: "still_pending",
          stripeStatus: paymentIntent.status,
        });
      }
    } catch (error) {
      results.errors++;
      results.details.push({
        donationId: donation._id,
        status: "error",
        error: error.message,
      });
    }
  }

  res.status(200).json({
    success: true,
    message: `تم مزامنة ${results.updated} تبرع من أصل ${results.total}`,
    results,
  });
});
