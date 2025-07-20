const express = require("express");
const router = express.Router();
const checkRole = require("../middleware/roles");
const {
  createDonation,
  getAllDonations,
  getDonation,
  updateDonation,
  acceptDonationOrderByDelivery,
  getDonationStats,
} = require("../controllers/donationController");
const { protect, requireAdminRole } = require("../middleware/authMiddleware");

// إنشاء تبرع جديد - للعملاء فقط
router.post("/", protect, checkRole("client"), createDonation);

// جلب جميع التبرعات - للعملاء والمدراء
router.get("/", protect, getAllDonations);

// جلب تبرع واحد - للعملاء والمدراء
router.get("/:id", protect, getDonation);

// تحديث التبرع - للعملاء والمدراء
router.put("/:id", protect, updateDonation);

// جلب إحصائيات التبرعات - للعملاء والمدراء
router.get("/stats/overview", protect, getDonationStats);

// قبول طلب تبرع من قبل مندوب التوصيل
router.post(
  "/accept-donation",
  protect,
  checkRole("delivery"),
  acceptDonationOrderByDelivery
);

module.exports = router;
