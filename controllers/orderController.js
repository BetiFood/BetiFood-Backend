const Order = require('../models/Order');
const asyncHandler = require('../utils/asyncHandler');

exports.createOrder = asyncHandler(async (req, res) => {
  const { customer_name, phone, address, items, payment_method } = req.body;

  // Validation
  if (!customer_name || !phone || !address || !items || items.length === 0) {
    return res.status(400).json({ 
      message: 'جميع الحقول مطلوبة: customer_name, phone, address, items' 
    });
  }

  const total_price = items.reduce((acc, item) => {
    return acc + (item.quantity * item.unit_price);
  }, 0);

  const processedItems = items.map(item => ({
    ...item,
    total_price: item.quantity * item.unit_price
  }));

  const order = await Order.create({
    customer_name,
    phone,
    address,
    items: processedItems,
    total_price,
    payment_method
  });

  res.status(201).json({
    success: true,
    data: order
  });
});

exports.getAllOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find().sort({ createdAt: -1 });
  res.json({
    success: true,
    count: orders.length,
    data: orders
  });
});

exports.getOrderById = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) {
    return res.status(404).json({ message: 'الطلب غير موجود' });
  }
  res.json({
    success: true,
    data: order
  });
});

exports.updateOrderStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  
  // Validation for status
  const validStatuses = ['pending', 'preparing', 'on_the_way', 'delivered', 'cancelled'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ 
      message: 'الحالة غير صحيحة. الحالات المتاحة: pending, preparing, on_the_way, delivered, cancelled' 
    });
  }

  const order = await Order.findByIdAndUpdate(
    req.params.id,
    { status },
    { new: true }
  );
  
  if (!order) {
    return res.status(404).json({ message: 'الطلب غير موجود' });
  }
  
  res.json({
    success: true,
    data: order
  });
});

exports.deleteOrder = asyncHandler(async (req, res) => {
  const order = await Order.findByIdAndDelete(req.params.id);
  if (!order) {
    return res.status(404).json({ message: 'الطلب غير موجود' });
  }
  res.json({ 
    success: true,
    message: 'تم حذف الطلب بنجاح' 
  });
});
