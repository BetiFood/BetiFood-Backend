function formatOrder(order) {
  return {
    order_id: order._id,
    client_name: order.client_name,
    phone: order.phone,
    address: order.address,
    client_id: order.client_id,
    meals: order.meals.map(m => ({
      meal_id: m.meal_id,
      quantity: m.quantity
    })),
    total_price: order.total_price,
    status: order.status,
    isPaid: order.isPaid,
    isCancelled: order.isCancelled,
    payment_method: order.payment_method,
    statusHistory: order.statusHistory.map(h => ({
      status: h.status,
      changedBy: h.changedBy,
      timestamp: h.timestamp
    })),
    createdAt: order.createdAt,
    updatedAt: order.updatedAt
  };
}

module.exports = formatOrder; 