# Cook Balance System

## Overview

The cook balance system automatically handles the 90/10 split for all online payments. When a client pays for an order or donation online, 90% goes to the cook's balance and 10% goes to the platform as fees.

## How It Works

### 1. Payment Processing

- When a client makes an online payment for orders or donations, Stripe processes the payment
- Upon successful payment, the webhook automatically credits the cook's balance
- The system calculates: 90% for cook, 10% for platform

### 2. Balance Tracking

- Each cook has a dedicated balance record
- All transactions are logged with full details
- Balance is automatically updated after each successful payment

### 3. Transaction Types

- **Credit**: Money added to cook's balance (from successful payments)
- **Debit**: Money withdrawn from cook's balance (future withdrawal feature)

## API Endpoints

### For Cooks

- `GET /api/balance/cook` - Get cook's current balance and recent transactions
- `GET /api/balance/cook/transactions` - Get transaction history with pagination
- `POST /api/balance/cook/withdraw` - Withdraw balance (future feature)

### For Admins

- `GET /api/balance/stats` - Get overall balance statistics
- `GET /api/balance/cook/:cookId` - Get specific cook's balance details

### User Profile

- `GET /api/users/profile` - For cooks, includes balance information

## Database Models

### Balance Model

```javascript
{
  cookId: ObjectId,
  currentBalance: Number,
  totalEarned: Number,
  totalWithdrawn: Number,
  platformFees: Number,
  transactions: [TransactionSchema],
  lastUpdated: Date
}
```

### Transaction Schema

```javascript
{
  type: "credit" | "debit",
  amount: Number,
  totalAmount: Number,
  cookAmount: Number, // 90% of total
  platformFee: Number, // 10% of total
  description: String,
  orderId: ObjectId, // for order payments
  donationId: ObjectId, // for donation payments
  checkoutId: String,
  paymentIntentId: String,
  status: "pending" | "completed" | "failed"
}
```

## Automatic Integration

### Order Payments

- When `payment_intent.succeeded` webhook is received for orders
- System groups orders by cook
- Adds credit to each cook's balance (90% of their orders' total)

### Donation Payments

- When `payment_intent.succeeded` webhook is received for donations
- Adds credit to the cook's balance (90% of donation amount)

## Example Response

### Cook Balance

```json
{
  "success": true,
  "balance": {
    "currentBalance": 450.0,
    "totalEarned": 500.0,
    "totalWithdrawn": 50.0,
    "platformFees": 55.56,
    "lastUpdated": "2024-01-15T10:30:00.000Z"
  },
  "recentTransactions": [
    {
      "type": "credit",
      "amount": 90.0,
      "totalAmount": 100.0,
      "cookAmount": 90.0,
      "platformFee": 10.0,
      "description": "دفع طلب - 1 طلب",
      "orderId": "...",
      "status": "completed",
      "createdAt": "2024-01-15T10:30:00.000Z"
    }
  ],
  "summary": {
    "totalCredits": 500.0,
    "totalDebits": 50.0,
    "totalTransactions": 5,
    "platformFees": 55.56
  }
}
```

## Backward Compatibility

- The existing `User.balance` field is automatically updated
- All existing functionality continues to work
- New balance system provides more detailed tracking

## Security

- Only cooks can access their own balance
- Admins can view all balance statistics
- All transactions are logged and auditable
- Payment verification through Stripe webhooks
