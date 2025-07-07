const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { 
  requireAuth, 
  requireClientRole, 
  requireCookOrDelivery 
} = require('../middleware/orderMiddleware');

// إنشاء طلب جديد - للعملاء فقط
router.post('/addOrder', requireAuth, requireClientRole, orderController.createOrder);

// checkout من السلة - للعملاء فقط
router.post('/checkout', requireAuth, requireClientRole, orderController.checkout);

// جلب جميع الطلبات - للجميع (كل شخص يرى ما يخصه)
router.get('/allOrders', requireAuth, orderController.getAllOrders);

// جلب طلب محدد - للجميع (كل شخص يرى ما يخصه)
router.get('/order/:id', requireAuth, orderController.getOrderById);

// تحديث حالة الطلب - للعملاء والطباخين ومندوبي التوصيل
router.put('/updateStatus/:id', requireAuth, requireCookOrDelivery, orderController.updateOrderStatus);

// حذف طلب - للعملاء فقط
router.delete('/deleteOrder/:id', requireAuth, requireClientRole, orderController.deleteOrder);

module.exports = router;
