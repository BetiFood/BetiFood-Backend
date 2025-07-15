const express = require('express');
const router = express.Router();
const deliveryController = require('../controllers/deliveryController');
const { protect, requireAdminRole, requireClientRole } = require('../middleware/authMiddleware');
const {
  createDelivery,
   updateDelivery,
  deleteDelivery,
  rateDelivery,
} = require('../controllers/deliveryController');



router.post('/users', protect, requireAdminRole, createDelivery);
router.get('/users', protect, deliveryController.getAllDeliveries);
router.get('/users/:id', protect, deliveryController.getDeliveryById);
router.put('/users/:id', protect, updateDelivery);
router.delete('/users/:id', protect, deleteDelivery);

// router.get('/available-orders', protect, requireDeliveryRole, deliveryController.getAvailableOrdersForDelivery);
// router.get('/my-orders', protect, requireDeliveryRole, deliveryController.getMyDeliveryOrders);
// router.post('/accept-order/:id', protect, requireDeliveryRole, deliveryController.acceptOrderByDelivery);
//router.put('/order/:id/status', protect, requireDeliveryRole, deliveryController.updateOrderStatus);
router.post('/rate', protect, requireClientRole, rateDelivery);

module.exports = router; 