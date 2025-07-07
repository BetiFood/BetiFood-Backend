const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { 
  requireAuth, 
  requireClientRole, 
  requireCookOrDelivery 
} = require('../middleware/orderMiddleware');

// checkout من cart فقط - للعملاء فقط
router.post('/checkout', requireAuth, requireClientRole, orderController.checkout);

// جلب جميع الطلبات - للعميل فقط (يرى طلباته)
router.get('/allOrders', requireAuth, requireClientRole, orderController.getAllOrders);

// جلب طلب محدد - للعميل فقط
router.get('/order/:id', requireAuth, requireClientRole, orderController.getOrderById);

// تحديث حالة الطلب - للطباخ أو مندوب التوصيل فقط
router.put('/updateStatus/:id', requireAuth, requireCookOrDelivery, orderController.updateOrderStatus);

// حذف طلب - للعميل فقط
router.delete('/deleteOrder/:id', requireAuth, requireClientRole, orderController.deleteOrder);

module.exports = router;
