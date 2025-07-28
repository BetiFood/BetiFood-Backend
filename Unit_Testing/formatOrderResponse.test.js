const { formatOrderResponse } = require("../controllers/orderController");

describe("formatOrderResponse", () => {
  it("should format a basic order object correctly", () => {
    const order = {
      _id: "orderid1",
      checkoutId: "checkoutid1",
      client_id: { _id: "clientid1", email: "client@example.com" },
      client_name: "Client Name",
      client_phone: "123456",
      client_address: "Address",
      location: { lat: 1, lng: 2 },
      cook_id: {
        _id: "cookid1",
        name: "Cook",
        phone: "555",
        verificationRef: { address: "A", location: { lat: 1, lng: 2 } },
      },
      cook_name: "Cook",
      meals: [
        {
          mealId: "meal1",
          mealName: "Meal 1",
          cookId: "cookid1",
          cookName: "Cook",
          price: 10,
          quantity: 2,
        },
      ],
      delivery: {},
      delivery_fee: 0,
      delivery_distance_km: 0,
      total_delivery_fee: 0,
      tax: 0,
      discount: 0,
      final_amount: 20,
      payment: "online",
      paymentStatus: "paid",
      status: "pending",
      notes: "note",
      createdAt: new Date(),
      updatedAt: new Date(),
      stripePaymentIntentId: "pi_123",
    };

    const result = formatOrderResponse(order);
    expect(result.order_id).toBe("orderid1");
    expect(result.payment.status).toBe("paid");
    expect(result.meals[0].total_price).toBe(20);
  });
});
