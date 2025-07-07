# Orders API Documentation (مع نظام الصلاحيات)

## Base URL
```
http://localhost:3000/api/orders
```

## نظام الصلاحيات

### الأدوار المتاحة:
- **client** - العميل: يمكنه إنشاء وحذف طلباته فقط، رؤية طلباته فقط
- **cook** - الطباخ: يمكنه رؤية جميع الطلبات وتحديث حالاتها
- **delivery** - مندوب التوصيل: يمكنه رؤية جميع الطلبات وتحديث حالاتها
- **admin** - المدير: يمكنه الوصول لجميع العمليات

## Authentication
جميع الـ endpoints تتطلب توكن صالح في الـ header:
```
Authorization: Bearer YOUR_JWT_TOKEN
```

## Endpoints

### 1. إنشاء طلب جديد (للعملاء فقط)
**POST** `/api/orders/addOrder`

**Headers:**
```
Content-Type: application/json
Authorization: Bearer YOUR_JWT_TOKEN
```

**Body:**
```json
{
  "customer_name": "أحمد محمد",
  "phone": "0123456789",
  "address": "شارع النيل، القاهرة",
  "payment_method": "cash",
  "items": [
    {
      "meal_id": "64f8a1b2c3d4e5f6a7b8c9d0",
      "meal_name": "كباب مشوي",
      "quantity": 2,
      "unit_price": 50
    }
  ]
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "_id": "64f8a1b2c3d4e5f6a7b8c9d2",
    "customer_name": "أحمد محمد",
    "phone": "0123456789",
    "address": "شارع النيل، القاهرة",
    "items": [...],
    "total_price": 100,
    "status": "pending",
    "payment_method": "cash",
    "userId": "64f8a1b2c3d4e5f6a7b8c9d3",
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

### 2. جلب جميع الطلبات (للجميع - كل شخص يرى ما يخصه)
**GET** `/api/orders/allOrders`

**Headers:**
```
Authorization: Bearer YOUR_JWT_TOKEN
```

**السلوك حسب الدور:**
- **client**: يرى طلباته فقط
- **cook**: يرى جميع الطلبات
- **delivery**: يرى جميع الطلبات
- **admin**: يرى جميع الطلبات

**Response (200):**
```json
{
  "success": true,
  "count": 2,
  "data": [
    {
      "_id": "64f8a1b2c3d4e5f6a7b8c9d2",
      "customer_name": "أحمد محمد",
      "phone": "0123456789",
      "address": "شارع النيل، القاهرة",
      "items": [...],
      "total_price": 100,
      "status": "pending",
      "payment_method": "cash",
      "userId": "64f8a1b2c3d4e5f6a7b8c9d3",
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z"
    }
  ]
}
```

### 3. جلب طلب محدد (للجميع - كل شخص يرى ما يخصه)
**GET** `/api/orders/order/:id`

**Headers:**
```
Authorization: Bearer YOUR_JWT_TOKEN
```

**السلوك حسب الدور:**
- **client**: يرى طلباته فقط
- **cook**: يرى أي طلب
- **delivery**: يرى أي طلب
- **admin**: يرى أي طلب

**Response (200):**
```json
{
  "success": true,
  "data": {
    "_id": "64f8a1b2c3d4e5f6a7b8c9d2",
    "customer_name": "أحمد محمد",
    "phone": "0123456789",
    "address": "شارع النيل، القاهرة",
    "items": [...],
    "total_price": 100,
    "status": "pending",
    "payment_method": "cash",
    "userId": "64f8a1b2c3d4e5f6a7b8c9d3",
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

### 4. تحديث حالة الطلب (للعملاء والطباخين ومندوبي التوصيل)
**PUT** `/api/orders/updateStatus/:id`

**Headers:**
```
Content-Type: application/json
Authorization: Bearer YOUR_JWT_TOKEN
```

**Body:**
```json
{
  "status": "preparing"
}
```

**الحالات المتاحة:**
- `pending` - في الانتظار
- `preparing` - قيد التحضير
- `on_the_way` - في الطريق
- `delivered` - تم التوصيل
- `cancelled` - ملغي

**السلوك حسب الدور:**
- **client**: يمكنه تحديث طلباته فقط
- **cook**: يمكنه تحديث أي طلب
- **delivery**: يمكنه تحديث أي طلب
- **admin**: يمكنه تحديث أي طلب

**Response (200):**
```json
{
  "success": true,
  "data": {
    "_id": "64f8a1b2c3d4e5f6a7b8c9d2",
    "customer_name": "أحمد محمد",
    "phone": "0123456789",
    "address": "شارع النيل، القاهرة",
    "items": [...],
    "total_price": 100,
    "status": "preparing",
    "payment_method": "cash",
    "userId": "64f8a1b2c3d4e5f6a7b8c9d3",
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:35:00.000Z"
  }
}
```

### 5. حذف طلب (للعملاء فقط)
**DELETE** `/api/orders/deleteOrder/:id`

**Headers:**
```
Authorization: Bearer YOUR_JWT_TOKEN
```

**السلوك حسب الدور:**
- **client**: يمكنه حذف طلباته فقط
- **cook**: يمكنه حذف أي طلب
- **delivery**: يمكنه حذف أي طلب
- **admin**: يمكنه حذف أي طلب

**Response (200):**
```json
{
  "success": true,
  "message": "تم حذف الطلب بنجاح"
}
```

## Error Responses

### 401 Unauthorized
```json
{
  "message": "غير مصرح"
}
```

### 403 Forbidden
```json
{
  "message": "يجب أن تكون عميلاً للوصول إلى هذا المورد"
}
```

### 404 Not Found
```json
{
  "message": "الطلب غير موجود"
}
```

### 500 Internal Server Error
```json
{
  "message": "خطأ في الخادم"
}
```

## Postman Collection

### 1. إنشاء طلب جديد (للعملاء فقط)
```
Method: POST
URL: http://localhost:3000/api/orders/addOrder
Headers: 
  Content-Type: application/json
  Authorization: Bearer YOUR_JWT_TOKEN
Body (raw JSON):
{
  "customer_name": "أحمد محمد",
  "phone": "0123456789",
  "address": "شارع النيل، القاهرة",
  "payment_method": "cash",
  "items": [
    {
      "meal_id": "64f8a1b2c3d4e5f6a7b8c9d0",
      "meal_name": "كباب مشوي",
      "quantity": 2,
      "unit_price": 50
    }
  ]
}
```

### 2. جلب جميع الطلبات
```
Method: GET
URL: http://localhost:3000/api/orders/allOrders
Headers: Authorization: Bearer YOUR_JWT_TOKEN
```

### 3. جلب طلب محدد
```
Method: GET
URL: http://localhost:3000/api/orders/order/64f8a1b2c3d4e5f6a7b8c9d2
Headers: Authorization: Bearer YOUR_JWT_TOKEN
```

### 4. تحديث حالة الطلب
```
Method: PUT
URL: http://localhost:3000/api/orders/updateStatus/64f8a1b2c3d4e5f6a7b8c9d2
Headers: 
  Content-Type: application/json
  Authorization: Bearer YOUR_JWT_TOKEN
Body (raw JSON):
{
  "status": "preparing"
}
```

### 5. حذف طلب
```
Method: DELETE
URL: http://localhost:3000/api/orders/deleteOrder/64f8a1b2c3d4e5f6a7b8c9d2
Headers: Authorization: Bearer YOUR_JWT_TOKEN
```

## ملاحظات مهمة

1. **جميع الـ endpoints تتطلب توكن صالح** في header الـ Authorization
2. **العملاء** يمكنهم إنشاء وحذف طلباتهم فقط
3. **الطباخين ومندوبي التوصيل** يمكنهم رؤية وتحديث جميع الطلبات
4. **كل طلب مرتبط بالمستخدم** الذي أنشأه (userId)
5. **نظام الصلاحيات** يتحقق من الدور في كل عملية
6. **الـ responses موحدة** مع success flag
7. **الـ error handling** محسن مع رسائل واضحة 