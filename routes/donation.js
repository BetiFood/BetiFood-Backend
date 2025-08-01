const express = require("express");
const router = express.Router();
const checkRole = require("../middleware/roles");
const {
  createDonation,
  getAllDonations,
  getDonation,
  updateDonationStatus,
  confirmDonationByToken,
  getDonationStats,
  createDonationFromCart,
  stripeDonationWebhook,
  getDonationPaymentStatus,
  cancelDonationByClient,
  syncPaymentStatus,
} = require("../controllers/donationController");
const { protect, requireAdminRole } = require("../middleware/authMiddleware");

// Raw body middleware for Stripe webhooks
const rawBodyMiddleware = express.raw({ type: "application/json" });

// إنشاء تبرع جديد - للعملاء فقط
router.post("/", protect, checkRole("client"), createDonation);

// جلب جميع التبرعات - للعملاء والطباخين والمدراء
router.get("/", protect, getAllDonations);

// جلب تبرع واحد - للعملاء والطباخين والمدراء
router.get("/:id", protect, getDonation);

// إلغاء التبرع - للعملاء فقط
router.patch(
  "/:id/cancel",
  protect,
  checkRole("client"),
  cancelDonationByClient
);

// تحديث حالة التبرع - للطباخين فقط
router.patch("/:id/status", protect, checkRole("cook"), updateDonationStatus);

// تأكيد التبرع بواسطة الجمعية عبر الرابط - بدون تسجيل دخول
router.get("/confirm/:token", confirmDonationByToken);

// جلب إحصائيات التبرعات - للعملاء والطباخين والمدراء
router.get("/stats/overview", protect, getDonationStats);

// مزامنة حالة الدفع - للمدراء فقط
router.post(
  "/sync-payment-status",
  protect,
  requireAdminRole,
  syncPaymentStatus
);

// إنشاء تبرع من سلة التسوق - للعملاء فقط
router.post("/cart", protect, checkRole("client"), createDonationFromCart);

// Stripe webhook for donations - no authentication required, uses raw body
router.post("/webhook/stripe", rawBodyMiddleware, stripeDonationWebhook);

// Get donation payment status
router.get("/:donationId/payment-status", protect, getDonationPaymentStatus);

module.exports = router;
