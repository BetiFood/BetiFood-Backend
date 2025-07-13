const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const checkRole = require("../middleware/roles");
const orderController = require("../controllers/orderController");

// تطبيق middleware المصادقة على جميع الطلبات
router.use(auth);

// جلب جميع الطلبات (متاح لجميع الأدوار)
router.get("/", orderController.getAllOrders);

// جلب الطلبات المتاحة للشيف (pending وغير مخصصة)
router.get("/available", checkRole("cook"), orderController.getAvailableOrdersForCook);

// جلب طلبات الطباخ الخاصة (التي قام بإنشائها)
router.get("/my-orders", checkRole("cook"), orderController.getMyCookOrders);

// جلب الطلبات المتاحة لمندوب التوصيل (completed وغير مخصصة)
router.get("/available-delivery", checkRole("delivery"), orderController.getAvailableOrdersForDelivery);

// جلب طلبات مندوب التوصيل الخاصة (التي قبلها)
router.get("/my-delivery-orders", checkRole("delivery"), orderController.getMyDeliveryOrders);

// قبول الطلب للشيف
router.post("/:id/accept-cook", checkRole("cook"), orderController.acceptOrderByCook);

// قبول الطلب لمندوب التوصيل
router.post("/:id/accept-delivery", checkRole("delivery"), orderController.acceptOrderByDelivery);

// جلب طلب واحد (متاح لجميع الأدوار مع التحقق من الصلاحيات)
router.get("/:id", orderController.getOrder);

// إنشاء طلب جديد (checkout) - للعملاء فقط
router.post("/checkout", checkRole("client"), orderController.checkout);

// تحديث الطلب (متاح لجميع الأدوار مع التحقق من الصلاحيات)
router.put("/:id", orderController.updateOrder);

module.exports = router; 