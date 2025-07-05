const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');

router.post('/addOrder', orderController.createOrder);
router.get('/allOrders', orderController.getAllOrders);
router.get('/order/:id', orderController.getOrderById);
router.put('/updateStatus/:id', orderController.updateOrderStatus);
router.delete('/deleteOrder/:id', orderController.deleteOrder);

module.exports = router;
