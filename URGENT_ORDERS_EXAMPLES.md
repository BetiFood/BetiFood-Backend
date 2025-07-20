# 🚨 Urgent Orders System Examples

## **🎯 Urgent Orders Feature Overview**

### **✅ Smart Order Distribution:**

1. **⏰ 10+ Minutes Rule:** Orders waiting for 10+ minutes become "urgent"
2. **📍 Close Distance:** Urgent orders within 5km shown to active delivery persons
3. **🚫 Bypass 10-Minute Rule:** Active delivery persons can accept urgent orders
4. **📱 Smart Notifications:** Clear indication of urgent vs normal orders
5. **🎯 Route Optimization:** Urgent orders shown to delivery persons on their way

---

## **🔧 Urgent Orders Logic**

### **📊 Urgent Order Criteria:**

- **⏰ Time:** Order created more than 10 minutes ago
- **📍 Distance:** Cook location within 5km of delivery person
- **🚫 Status:** No delivery person has accepted the order yet

### **🎯 Priority System:**

1. **Normal Orders:** Within 50km, no time restriction
2. **Urgent Orders:** Within 5km, 10+ minutes old
3. **Active Delivery:** Can accept urgent orders even with active order

---

## **📋 Enhanced Available Orders Response**

### **1. Get Available Orders (With Urgent Orders)**

**Endpoint:** `GET /api/orders/available-delivery`  
**Headers:** `Authorization: Bearer YOUR_JWT_TOKEN`

**Response Examples:**

#### **✅ Normal Orders Only:**

```json
{
  "success": true,
  "message": "تم جلب 3 طلب متاح للتوصيل. يمكنك قبول طلب جديد الآن!",
  "orders": [
    {
      "order_id": "64f8a1b2c3d4e5f678901240",
      "client": {
        "id": "64f8a1b2c3d4e5f678901241",
        "name": "Ahmed Ali",
        "email": "ahmed@example.com",
        "phone": "0123456789",
        "address": {
          "city": "Cairo",
          "street": "Tahrir Street",
          "building_number": "15A"
        },
        "location": {
          "lat": 30.0444,
          "lng": 31.2357
        }
      },
      "subOrders": [
        {
          "sub_order_id": "64f8a1b2c3d4e5f678901242",
          "cook": {
            "id": "64f8a1b2c3d4e5f678901234",
            "name": "Chef Mohamed"
          },
          "meals": [
            {
              "id": "64f8a1b2c3d4e5f678901235",
              "name": "Koshari",
              "cookId": "64f8a1b2c3d4e5f678901234",
              "cookName": "Chef Mohamed",
              "unit_price": 25,
              "quantity": 2,
              "total_price": 50
            }
          ],
          "delivery": {
            "id": null,
            "name": null,
            "status": "pending",
            "fee": 15,
            "distance_km": 3.5,
            "picked_up_at": null,
            "delivered_at": null
          },
          "distance_from_delivery": 2.3,
          "is_within_range": true,
          "is_urgent_distance": false
        }
      ],
      "pricing": {
        "total_delivery_fee": 25,
        "tax": 5,
        "discount": 2,
        "final_amount": 78
      },
      "payment": {
        "method": "نقدي",
        "status": "pending"
      },
      "status": "قيد التحضير",
      "notes": "Please deliver to the main entrance",
      "timestamps": {
        "created": "15 يناير 2024 - 14:30",
        "updated": "15 يناير 2024 - 14:30"
      }
    }
  ],
  "count": 3,
  "delivery_location": {
    "lat": 30.0444,
    "lng": 31.2357,
    "last_updated": "2024-01-15T14:30:00.000Z"
  },
  "max_distance_km": 50,
  "urgent_distance_km": 5,
  "delivery_status": {
    "has_active_order": false,
    "can_accept_new_order": true,
    "time_until_next_order_minutes": null,
    "active_orders_count": 0
  },
  "notification": {
    "type": "can_accept",
    "message": "يمكنك قبول طلب جديد الآن"
  },
  "urgent_orders_count": 0,
  "normal_orders_count": 3
}
```

#### **🚨 Urgent Orders Available:**

```json
{
  "success": true,
  "message": "لديك طلب نشط، لكن هناك 2 طلب عاجل قريب منك يمكنك قبوله!",
  "orders": [
    {
      "order_id": "64f8a1b2c3d4e5f678901241",
      "client": {
        "id": "64f8a1b2c3d4e5f678901242",
        "name": "Fatima Hassan",
        "email": "fatima@example.com",
        "phone": "0987654321",
        "address": {
          "city": "Cairo",
          "street": "Mohamed Ali Street",
          "building_number": "25B"
        },
        "location": {
          "lat": 30.0444,
          "lng": 31.2357
        }
      },
      "subOrders": [
        {
          "sub_order_id": "64f8a1b2c3d4e5f678901243",
          "cook": {
            "id": "64f8a1b2c3d4e5f678901244",
            "name": "Chef Ali"
          },
          "meals": [
            {
              "id": "64f8a1b2c3d4e5f678901245",
              "name": "Ful Medames",
              "cookId": "64f8a1b2c3d4e5f678901244",
              "cookName": "Chef Ali",
              "unit_price": 20,
              "quantity": 1,
              "total_price": 20
            }
          ],
          "delivery": {
            "id": null,
            "name": null,
            "status": "pending",
            "fee": 10,
            "distance_km": 2.0,
            "picked_up_at": null,
            "delivered_at": null
          },
          "distance_from_delivery": 1.2,
          "is_within_range": true,
          "is_urgent_distance": true
        }
      ],
      "pricing": {
        "total_delivery_fee": 10,
        "tax": 3,
        "discount": 0,
        "final_amount": 33
      },
      "payment": {
        "method": "نقدي",
        "status": "pending"
      },
      "status": "قيد التحضير",
      "notes": "Please deliver quickly",
      "timestamps": {
        "created": "15 يناير 2024 - 14:15",
        "updated": "15 يناير 2024 - 14:15"
      },
      "is_urgent": true,
      "waiting_time_minutes": 15
    }
  ],
  "count": 2,
  "delivery_location": {
    "lat": 30.0444,
    "lng": 31.2357,
    "last_updated": "2024-01-15T14:30:00.000Z"
  },
  "max_distance_km": 50,
  "urgent_distance_km": 5,
  "delivery_status": {
    "has_active_order": true,
    "can_accept_new_order": false,
    "time_until_next_order_minutes": 7,
    "active_orders_count": 1
  },
  "notification": {
    "type": "urgent_available",
    "message": "يمكنك قبول طلب عاجل قريب منك (2 طلب)",
    "urgent_orders_count": 2,
    "time_until_normal_order_minutes": 7
  },
  "urgent_orders_count": 2,
  "normal_orders_count": 0
}
```

---

## **✅ Accept Urgent Order**

### **2. Accept Urgent Order (Bypasses 10-Minute Rule)**

**Endpoint:** `POST /api/orders/:orderId/accept-delivery`  
**Headers:**

- `Authorization: Bearer YOUR_JWT_TOKEN`
- `Content-Type: application/json`

**JSON Body:**

```json
{
  "sub_order_id": "64f8a1b2c3d4e5f678901243",
  "notes": "I'll pick up this urgent order on my way"
}
```

**Success Response:**

```json
{
  "success": true,
  "message": "تم قبول الطلب العاجل بنجاح",
  "order": {
    "order_id": "64f8a1b2c3d4e5f678901241",
    "client": {
      "id": "64f8a1b2c3d4e5f678901242",
      "name": "Fatima Hassan",
      "email": "fatima@example.com",
      "phone": "0987654321",
      "address": {
        "city": "Cairo",
        "street": "Mohamed Ali Street",
        "building_number": "25B"
      },
      "location": {
        "lat": 30.0444,
        "lng": 31.2357
      }
    },
    "subOrders": [
      {
        "sub_order_id": "64f8a1b2c3d4e5f678901243",
        "cook": {
          "id": "64f8a1b2c3d4e5f678901244",
          "name": "Chef Ali"
        },
        "meals": [
          {
            "id": "64f8a1b2c3d4e5f678901245",
            "name": "Ful Medames",
            "cookId": "64f8a1b2c3d4e5f678901244",
            "cookName": "Chef Ali",
            "unit_price": 20,
            "quantity": 1,
            "total_price": 20
          }
        ],
        "delivery": {
          "id": "64f8a1b2c3d4e5f678901237",
          "name": "Ahmed Delivery",
          "status": "pending",
          "fee": 10,
          "distance_km": 2.0,
          "picked_up_at": null,
          "delivered_at": null
        }
      }
    ],
    "pricing": {
      "total_delivery_fee": 10,
      "tax": 3,
      "discount": 0,
      "final_amount": 33
    },
    "payment": {
      "method": "نقدي",
      "status": "pending"
    },
    "status": "قيد التحضير",
    "notes": "I'll pick up this urgent order on my way",
    "timestamps": {
      "created": "15 يناير 2024 - 14:15",
      "updated": "15 يناير 2024 - 15:00"
    }
  },
  "distance_to_cook_km": "1.2",
  "is_urgent_order": true,
  "waiting_time_minutes": 15
}
```

---

## **📊 Urgent Order Scenarios**

### **Scenario 1: Normal Order Flow**

```
14:00 - Order created
14:05 - Cook accepts order (preparing status)
14:05-14:10 - Order visible to delivery (normal distance)
14:10 - Delivery accepts order
```

### **Scenario 2: Urgent Order Flow**

```
14:00 - Order created
14:05 - Cook accepts order (preparing status)
14:05-14:10 - Order visible to delivery (normal distance)
14:10 - No delivery accepts order
14:15 - Order becomes URGENT (10+ minutes old)
14:15+ - Order visible to ALL delivery persons within 5km
14:20 - Active delivery person accepts urgent order
```

### **Scenario 3: Multiple Urgent Orders**

```
14:00 - Order A created
14:05 - Order B created
14:15 - Both orders become URGENT
14:15+ - Both orders visible to delivery within 5km
14:20 - Delivery accepts urgent order A
14:25 - Delivery can accept urgent order B (bypasses 10-min rule)
```

---

## **🎯 Distance-Based Priority**

### **Distance Categories:**

- **🟢 Normal Orders:** 0-50km (any delivery person)
- **🟡 Urgent Orders:** 0-5km (active delivery persons can accept)
- **🔴 Too Far:** >50km (not shown to anyone)

### **Priority Logic:**

1. **Normal Orders:** Within 50km, no time restriction
2. **Urgent Orders:** Within 5km, 10+ minutes old
3. **Active Delivery:** Can accept urgent orders even with active order

---

## **📱 Mobile App Integration**

### **Urgent Order Notifications:**

```javascript
// Check for urgent orders every minute
setInterval(async () => {
  const availableOrders = await getAvailableOrders();

  if (availableOrders.urgent_orders_count > 0) {
    showUrgentNotification({
      count: availableOrders.urgent_orders_count,
      message: `لديك ${availableOrders.urgent_orders_count} طلب عاجل قريب منك!`,
    });
  }
}, 60000);
```

### **Smart Order Acceptance:**

```javascript
// Accept urgent order with special handling
async function acceptUrgentOrder(orderId, subOrderId) {
  const result = await acceptOrderByDelivery(orderId, subOrderId);

  if (result.is_urgent_order) {
    showSuccess(
      `تم قبول الطلب العاجل! كان ينتظر ${result.waiting_time_minutes} دقيقة`
    );
    // Update UI to show urgent order status
    updateOrderStatus(orderId, "urgent_accepted");
  } else {
    showSuccess("تم قبول الطلب بنجاح");
  }
}
```

### **Distance Monitoring:**

```javascript
// Monitor distance for urgent orders
function checkUrgentDistance(deliveryLocation, cookLocation) {
  const distance = calculateDistance(
    deliveryLocation.lat,
    deliveryLocation.lng,
    cookLocation.lat,
    cookLocation.lng
  );

  return {
    isUrgentDistance: distance <= 5,
    distance: distance,
    canAcceptUrgent: distance <= 5,
  };
}
```

---

## **🔄 Order Status Flow with Urgent Orders**

### **Enhanced Order Flow:**

```
Client creates order → pending
Cook accepts order → preparing ✅ (Visible to delivery)
10 minutes pass → preparing ⚠️ (Becomes URGENT)
Delivery accepts urgent order → delivering ✅ (Bypasses 10-min rule)
Cook completes order → completed
Delivery delivers order → delivered
```

### **Urgent Order Timeline:**

```
14:00 - Order created
14:05 - Cook accepts (preparing)
14:05-14:10 - Normal order visibility
14:10 - Order becomes URGENT (10+ minutes)
14:10+ - Urgent order visible to active delivery within 5km
14:15 - Active delivery accepts urgent order
```

---

## **🎯 Key Benefits**

1. **⚡ Faster Delivery:** Urgent orders don't get stuck waiting
2. **📍 Route Optimization:** Urgent orders shown to delivery on their way
3. **🚫 Smart Bypass:** 10-minute rule bypassed for urgent orders
4. **📱 Real-time Alerts:** Clear notifications for urgent orders
5. **🎯 Distance Priority:** Urgent orders prioritize close distance
6. **🔄 Workload Balance:** Active delivery can help with urgent orders

This system ensures no order gets stuck too long while maintaining efficient delivery distribution! 🚀
