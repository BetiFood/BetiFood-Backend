const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const {
  addToCart,
  getCart,
  updateCartItem,
  removeFromCart,
  clearCart,
  getCartStats,
  checkoutFromCart,
} = require("../controllers/cartController");

// جميع routes تتطلب تسجيل الدخول
router.use(protect);

// إضافة وجبة للكارت
router.post("/add", addToCart);

// عرض الكارت
router.get("/", getCart);

// تحديث كمية وجبة في الكارت
router.put("/update", updateCartItem);

// حذف وجبة من الكارت
router.delete("/remove/:mealId", removeFromCart);

// مسح الكارت بالكامل
router.delete("/clear", clearCart);

// إحصائيات الكارت
router.get("/stats", getCartStats);

// تحويل الكارت إلى طلب (Checkout)
router.post("/checkout", checkoutFromCart);

module.exports = router;
