const express = require("express");
const router = express.Router();
const checkRole = require("../middleware/roles");
const validateOrderInput = require("../middleware/validateOrderInput");
const {
  getAllOrders,
  updateOrder,
  checkout,
  getOrder,
  getAvailableOrdersForCook,
  getAvailableOrdersForDelivery,
  acceptOrderByCook,
  acceptOrderByDelivery,
  updateDeliveryLocation,
  checkDeliveryAvailability,
} = require("../controllers/orderController");
const { protect, requireAdminRole } = require("../middleware/authMiddleware");

console.log("protect:", typeof protect);
console.log("requireAdminRole:", typeof requireAdminRole);
console.log("checkRole:", typeof checkRole);

// جلب جميع الطلبات (متاح لجميع الأدوار)
router.get("/", protect, getAllOrders);

// جلب الطلبات المتاحة للشيف (pending وغير مخصصة)
router.get("/available", protect, checkRole("cook"), getAvailableOrdersForCook);

// جلب الطلبات المتاحة لمندوب التوصيل (preparing/completed وغير مخصصة)
router.get(
  "/available-delivery",
  protect,
  checkRole("delivery"),
  getAvailableOrdersForDelivery
);

// التحقق من إمكانية قبول طلب جديد لمندوب التوصيل
router.get(
  "/delivery/availability",
  protect,
  checkRole("delivery"),
  checkDeliveryAvailability
);

// تحديث موقع مندوب التوصيل
router.put(
  "/delivery/location",
  protect,
  checkRole("delivery"),
  updateDeliveryLocation
);

// قبول الطلب للشيف
router.post("/:id/accept-cook", protect, checkRole("cook"), acceptOrderByCook);

// قبول الطلب لمندوب التوصيل
router.post(
  "/:id/accept-delivery",
  protect,
  checkRole("delivery"),
  acceptOrderByDelivery
);

// جلب طلب واحد (متاح لجميع الأدوار مع التحقق من الصلاحيات)
router.get("/:id", protect, getOrder);

// إنشاء طلب جديد (checkout) - للعملاء فقط مع التحقق من صحة البيانات
router.post(
  "/checkout",
  protect,
  checkRole("client"),
  validateOrderInput,
  checkout
);

// تحديث الطلب (متاح لجميع الأدوار مع التحقق من الصلاحيات)
router.put("/:id", protect, updateOrder);

module.exports = router;
