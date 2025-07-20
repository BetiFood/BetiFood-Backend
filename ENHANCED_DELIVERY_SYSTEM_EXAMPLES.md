# 🚀 Enhanced Delivery System Examples

## **🎯 New Features Overview**

### **✅ Enhanced Features:**

1. **📋 Early Order Visibility:** Orders shown when cook accepts (preparing status)
2. **⏰ 10-Minute Rule:** Delivery can accept new order after 10 minutes
3. **🚫 Single Order Restriction:** Hide orders if delivery has active order
4. **🔔 Smart Notifications:** Notify when delivery can accept new orders
5. **📱 Availability Check:** New endpoint to check delivery availability

---

## **🔧 New Endpoints**

### **1. Check Delivery Availability**

**Endpoint:** `GET /api/orders/delivery/availability`  
**Headers:** `Authorization: Bearer YOUR_JWT_TOKEN`

**Response Examples:**

#### **✅ Can Accept New Order:**

```json
{
  "success": true,
  "can_accept_new_order": true,
  "has_active_order": false,
  "active_orders_count": 0,
  "time_until_next_order_minutes": null,
  "time_since_last_order_minutes": null,
  "last_accepted_order": null
}
```

#### **⏰ Waiting for 10-Minute Rule:**

```json
{
  "success": true,
  "can_accept_new_order": false,
  "has_active_order": true,
  "active_orders_count": 1,
  "time_until_next_order_minutes": 7,
  "time_since_last_order_minutes": 3,
  "last_accepted_order": {
    "order_id": "64f8a1b2c3d4e5f678901240",
    "status": "delivering",
    "accepted_at": "2024-01-15T14:30:00.000Z"
  }
}
```

#### **✅ Can Accept After 10 Minutes:**

```json
{
  "success": true,
  "can_accept_new_order": true,
  "has_active_order": true,
  "active_orders_count": 1,
  "time_until_next_order_minutes": null,
  "time_since_last_order_minutes": 12,
  "last_accepted_order": {
    "order_id": "64f8a1b2c3d4e5f678901240",
    "status": "delivering",
    "accepted_at": "2024-01-15T14:20:00.000Z"
  }
}
```

---

## **📋 Enhanced Available Orders**

### **2. Get Available Orders (Enhanced)**

**Endpoint:** `GET /api/orders/available-delivery`  
**Headers:** `Authorization: Bearer YOUR_JWT_TOKEN`

**Response Examples:**

#### **✅ Can Accept Orders:**

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
          "is_within_range": true
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
  "delivery_status": {
    "has_active_order": true,
    "can_accept_new_order": true,
    "time_until_next_order_minutes": null,
    "active_orders_count": 1
  },
  "notification": {
    "type": "can_accept",
    "message": "يمكنك قبول طلب جديد الآن",
    "time_since_last_order_minutes": 12
  }
}
```

#### **⏰ Cannot Accept (10-Minute Rule):**

```json
{
  "success": true,
  "message": "لديك طلب نشط. يمكنك قبول طلب جديد بعد 7 دقيقة.",
  "orders": [],
  "count": 0,
  "delivery_location": {
    "lat": 30.0444,
    "lng": 31.2357,
    "last_updated": "2024-01-15T14:30:00.000Z"
  },
  "max_distance_km": 50,
  "delivery_status": {
    "has_active_order": true,
    "can_accept_new_order": false,
    "time_until_next_order_minutes": 7,
    "active_orders_count": 1
  },
  "notification": {
    "type": "wait",
    "message": "انتظر 7 دقيقة قبل قبول طلب جديد",
    "time_remaining_minutes": 7
  }
}
```

---

## **✅ Enhanced Accept Order**

### **3. Accept Order (Works with Preparing Status)**

**Endpoint:** `POST /api/orders/:orderId/accept-delivery`  
**Headers:**

- `Authorization: Bearer YOUR_JWT_TOKEN`
- `Content-Type: application/json`

**JSON Body:**

```json
{
  "sub_order_id": "64f8a1b2c3d4e5f678901242",
  "notes": "I'll pick up this order within 30 minutes"
}
```

**Success Response:**

```json
{
  "success": true,
  "message": "تم قبول الطلب بنجاح",
  "order": {
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
          "id": "64f8a1b2c3d4e5f678901237",
          "name": "Ahmed Delivery",
          "status": "pending",
          "fee": 15,
          "distance_km": 3.5,
          "picked_up_at": null,
          "delivered_at": null
        }
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
    "notes": "I'll pick up this order within 30 minutes",
    "timestamps": {
      "created": "15 يناير 2024 - 14:30",
      "updated": "15 يناير 2024 - 15:00"
    }
  },
  "distance_to_cook_km": "2.3"
}
```

**Error Responses:**

**❌ Cannot Accept (10-Minute Rule):**

```json
{
  "success": false,
  "message": "لا يمكنك قبول طلب جديد حتى تمر 10 دقائق على آخر طلب قبلته."
}
```

**❌ Order Status Not Eligible:**

```json
{
  "success": false,
  "message": "يمكن قبول الطلبات في حالة قيد التحضير أو مكتمل فقط"
}
```

---

## **📱 Mobile App Integration Examples**

### **Real-time Availability Monitoring:**

```javascript
// Check availability every 30 seconds
setInterval(async () => {
  const availability = await checkDeliveryAvailability();

  if (availability.can_accept_new_order && availability.has_active_order) {
    // Show notification that delivery can accept new order
    showNotification("يمكنك قبول طلب جديد الآن!");
  }

  if (!availability.can_accept_new_order) {
    // Show countdown timer
    showCountdown(availability.time_until_next_order_minutes);
  }
}, 30000);
```

### **Smart Order Acceptance:**

```javascript
// Before accepting order, check availability
async function acceptOrder(orderId, subOrderId) {
  const availability = await checkDeliveryAvailability();

  if (!availability.can_accept_new_order) {
    showError(`انتظر ${availability.time_until_next_order_minutes} دقيقة`);
    return;
  }

  // Proceed with order acceptance
  const result = await acceptOrderByDelivery(orderId, subOrderId);
  showSuccess("تم قبول الطلب بنجاح");
}
```

### **Push Notifications:**

```javascript
// Send push notification when delivery can accept new order
function sendAvailabilityNotification(availability) {
  if (availability.can_accept_new_order && availability.has_active_order) {
    // Send push notification
    sendPushNotification({
      title: "طلب جديد متاح",
      body: "يمكنك قبول طلب جديد الآن!",
      data: {
        type: "new_order_available",
        time_since_last_order: availability.time_since_last_order_minutes,
      },
    });
  }
}
```

---

## **🔄 Order Status Flow**

### **Enhanced Order Flow:**

1. **Client creates order** → `pending`
2. **Cook accepts order** → `preparing` ✅ **Now visible to delivery**
3. **Delivery accepts order** → `delivering`
4. **Cook completes order** → `completed` ✅ **Still visible to delivery**
5. **Delivery delivers order** → `delivered`

### **10-Minute Rule Timeline:**

```
14:00 - Delivery accepts order A
14:00-14:10 - Cannot accept new orders (10-minute rule)
14:10+ - Can accept new orders again
```

---

## **📊 Testing Scenarios**

### **Scenario 1: First Order**

1. ✅ Delivery has no active orders
2. ✅ Can see all available orders
3. ✅ Can accept any order immediately

### **Scenario 2: Active Order (Within 10 Minutes)**

1. ✅ Delivery accepts order at 14:00
2. ❌ Cannot see new orders until 14:10
3. ✅ Gets notification with countdown

### **Scenario 3: After 10 Minutes**

1. ✅ Delivery accepted order at 14:00
2. ✅ At 14:10, can see new orders again
3. ✅ Gets notification "يمكنك قبول طلب جديد الآن"

### **Scenario 4: Multiple Orders**

1. ✅ Delivery accepts order A at 14:00
2. ❌ Cannot accept order B until 14:10
3. ✅ At 14:10, can accept order B
4. ✅ Can have multiple active orders after 10-minute intervals

---

## **🎯 Key Benefits**

1. **⚡ Faster Delivery:** Orders visible when cook accepts (not wait for completed)
2. **⏰ Smart Timing:** 10-minute rule prevents overwhelming delivery persons
3. **📱 Real-time Updates:** Availability checking and notifications
4. **🔒 Controlled Workload:** Single order restriction with time-based release
5. **📊 Better UX:** Clear notifications and countdown timers
6. **🔄 Flexible Status:** Works with both preparing and completed orders

This enhanced system provides better efficiency while maintaining delivery person workload control! 🚀
