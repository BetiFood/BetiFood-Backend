# 📍 Location-Based Delivery System Examples

## **🎯 Overview**

This system ensures that:

1. Only verified delivery persons (`isIdentityVerified: true`) can see and accept orders
2. Orders are filtered by distance from delivery person to cook location
3. Delivery persons must update their location to see available orders
4. Orders are sorted by nearest distance first

---

## **🔧 Setup Requirements**

### **1. Update Delivery Person Location**

Before a delivery person can see orders, they must update their location.

**Endpoint:** `PUT /api/orders/delivery/location`  
**Headers:**

- `Authorization: Bearer YOUR_JWT_TOKEN`
- `Content-Type: application/json`

**JSON Body:**

```json
{
  "lat": 30.0444,
  "lng": 31.2357
}
```

**Response Example:**

```json
{
  "success": true,
  "message": "تم تحديث موقعك بنجاح",
  "delivery_person": {
    "id": "64f8a1b2c3d4e5f678901237",
    "name": "Ahmed Delivery",
    "email": "ahmed.delivery@example.com",
    "role": "delivery",
    "isIdentityVerified": true,
    "location": {
      "lat": 30.0444,
      "lng": 31.2357,
      "lastUpdated": "2024-01-15T14:30:00.000Z"
    }
  }
}
```

---

## **📋 Available Orders for Delivery**

### **2. Get Available Orders (Location-Based)**

**Endpoint:** `GET /api/orders/available-delivery`  
**Headers:** `Authorization: Bearer YOUR_JWT_TOKEN`

**Response Example:**

```json
{
  "success": true,
  "message": "تم جلب 3 طلب متاح للتوصيل بنجاح",
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
      "status": "مكتمل",
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
  "max_distance_km": 50
}
```

**Key Features:**

- ✅ Only shows orders within 50km radius
- ✅ Orders sorted by nearest distance first
- ✅ Shows `distance_from_delivery` for each sub-order
- ✅ Shows `is_within_range` flag
- ✅ Only verified delivery persons can access

---

## **✅ Accept Order by Delivery**

### **3. Accept Order (With Distance Validation)**

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
    "status": "قيد التوصيل",
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

**❌ Unverified Identity:**

```json
{
  "success": false,
  "message": "لا يمكنك قبول الطلبات حتى يتم توثيق هويتك من الإدارة."
}
```

**❌ No Location Set:**

```json
{
  "success": false,
  "message": "يجب تحديث موقعك أولاً لقبول الطلبات."
}
```

**❌ Distance Too Far:**

```json
{
  "success": false,
  "message": "المسافة بينك والطباخ (65.2 كم) أكبر من الحد المسموح (50 كم)."
}
```

**❌ Cook Location Not Available:**

```json
{
  "success": false,
  "message": "موقع الطباخ غير متوفر، لا يمكن قبول الطلب."
}
```

---

## **🔍 My Delivery Orders**

### **4. Get My Delivery Orders**

**Endpoint:** `GET /api/orders/my-delivery-orders`  
**Headers:** `Authorization: Bearer YOUR_JWT_TOKEN`

**Response:** Same format as available orders but only shows orders accepted by the delivery person

---

## **📊 Distance Calculation Examples**

### **Distance Ranges:**

- **✅ Within Range (≤ 50km):** Orders shown and can be accepted
- **❌ Out of Range (> 50km):** Orders hidden from available list

### **Location Examples:**

**Delivery Person Location:** `30.0444, 31.2357` (Cairo)

**Cook Locations:**

1. **Nearby Cook:** `30.0444, 31.2357` → Distance: 0km ✅
2. **Close Cook:** `30.0544, 31.2457` → Distance: 1.2km ✅
3. **Medium Distance:** `30.1444, 31.3357` → Distance: 15.3km ✅
4. **Far Cook:** `30.5444, 31.7357` → Distance: 65.2km ❌

---

## **🛡️ Security Features**

### **Identity Verification Check:**

- ✅ Only delivery persons with `isIdentityVerified: true` can access orders
- ❌ Unverified delivery persons get 403 error

### **Location Requirements:**

- ✅ Delivery person must have valid location to see orders
- ✅ Cook must have valid location for delivery person to accept order
- ❌ Missing location returns 400 error

### **Distance Validation:**

- ✅ Orders within 50km radius are shown
- ✅ Orders sorted by nearest distance first
- ❌ Orders beyond 50km are hidden

---

## **🚀 Postman Collection Setup**

### **Environment Variables:**

```
BASE_URL: http://localhost:3000/api
DELIVERY_JWT_TOKEN: your_delivery_person_jwt_token
COOK_JWT_TOKEN: your_cook_jwt_token
CLIENT_JWT_TOKEN: your_client_jwt_token
```

### **Test Flow:**

1. **Update Delivery Location** → Set delivery person location
2. **Get Available Orders** → See orders within 50km radius
3. **Accept Order** → Accept nearest order
4. **Get My Orders** → See accepted orders
5. **Update Order Status** → Mark as delivered

### **Headers Setup:**

```
Authorization: Bearer {{DELIVERY_JWT_TOKEN}}
Content-Type: application/json
```

---

## **📱 Mobile App Integration**

### **Real-time Location Updates:**

```javascript
// Update location every 5 minutes
setInterval(() => {
  navigator.geolocation.getCurrentPosition((position) => {
    updateDeliveryLocation({
      lat: position.coords.latitude,
      lng: position.coords.longitude,
    });
  });
}, 5 * 60 * 1000);
```

### **Distance Monitoring:**

```javascript
// Check if still within range before accepting
const distance = calculateDistance(
  deliveryLocation.lat,
  deliveryLocation.lng,
  cookLocation.lat,
  cookLocation.lng
);

if (distance > 50) {
  showError("You're too far from this cook");
}
```

---

## **🎯 Key Benefits**

1. **📍 Location-Based Matching:** Orders shown to nearest delivery persons
2. **🛡️ Identity Verification:** Only verified delivery persons can access
3. **📏 Distance Validation:** Prevents accepting orders too far away
4. **⚡ Real-time Updates:** Location updates enable dynamic order matching
5. **📱 Mobile-Friendly:** Works with GPS location services
6. **🔒 Security:** Multiple validation layers ensure data integrity

This system ensures efficient delivery matching while maintaining security and data integrity! 🚀
