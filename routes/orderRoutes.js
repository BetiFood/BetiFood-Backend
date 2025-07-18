const express = require("express");
const router = express.Router();
const checkRole = require("../middleware/roles");
const { 
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
  acceptDonationOrderByDelivery,
  assignBeneficiaryToOrder
} = require('../controllers/orderController');
const { protect, requireAdminRole } = require('../middleware/authMiddleware');

console.log("protect:", typeof protect);
console.log("requireAdminRole:", typeof requireAdminRole);
console.log("checkRole:", typeof checkRole);

// جلب جميع الطلبات (متاح لجميع الأدوار)
router.get("/", protect, getAllOrders);

// جلب الطلبات المتاحة للشيف (pending وغير مخصصة)
router.get("/available", protect, checkRole("cook"), getAvailableOrdersForCook);

// جلب طلبات الطباخ الخاصة (التي قام بإنشائها)
router.get("/my-orders", protect, checkRole("cook"), getMyCookOrders);

// جلب الطلبات المتاحة لمندوب التوصيل (completed وغير مخصصة)
router.get("/available-delivery", protect, checkRole("delivery"), getAvailableOrdersForDelivery);

// جلب طلبات مندوب التوصيل الخاصة (التي قبلها)
router.get("/my-delivery-orders", protect, checkRole("delivery"), getMyDeliveryOrders);

// قبول الطلب للشيف
router.post("/:id/accept-cook", protect, checkRole("cook"), acceptOrderByCook);

// قبول الطلب لمندوب التوصيل
router.post("/:id/accept-delivery", protect, checkRole("delivery"), acceptOrderByDelivery);

// جلب طلب واحد (متاح لجميع الأدوار مع التحقق من الصلاحيات)
router.get("/:id", protect, getOrder);

// إنشاء طلب جديد (checkout) - للعملاء فقط
router.post("/checkout", protect, checkRole("client"), checkout);

// تحديث الطلب (متاح لجميع الأدوار مع التحقق من الصلاحيات)
router.put("/:id", protect, updateOrder);

router.post('/accept-donation', protect, acceptDonationOrderByDelivery);
router.post('/assign-beneficiary', protect, requireAdminRole, assignBeneficiaryToOrder);

module.exports = router; 