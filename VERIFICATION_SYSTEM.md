# Verification System Documentation

## Overview

The verification system is designed for users with "cook" and "delivery" roles to submit their identity documents for verification. This ensures that only verified users can operate as cooks or delivery personnel.

## User Model Changes

The User model now includes a `verification` field with the following structure:

```javascript
verification: {
  nationalId: String,           // Required for cook/delivery users
  idCardFrontImage: String,     // Required for cook/delivery users
  idCardBackImage: String,      // Required for cook/delivery users
  criminalRecord: String,       // Required for cook/delivery users
  status: String,              // "pending", "approved", "rejected"
  submittedAt: Date,           // Auto-set when submitted
  reviewedAt: Date,            // Set when admin reviews
  reviewNotes: String,         // Admin notes for rejection
  reviewedBy: ObjectId         // Admin who reviewed
}
```

## API Endpoints

### 1. Submit Verification Documents

**POST** `/api/users/verification`

**Authentication:** Required (User must be logged in)

**User Role:** Cook or Delivery only

**Request Body:**

```json
{
  "nationalId": "29801234567891"
}
```

**Files (multipart/form-data):**

- `idCardFront`: Front image of ID card (JPEG, PNG)
- `idCardBack`: Back image of ID card (JPEG, PNG)
- `criminalRecord`: Criminal record document (PDF)

**Response:**

```json
{
  "message": "تم تقديم طلب التحقق بنجاح",
  "verification": {
    "nationalId": "29801234567891",
    "idCardFrontImage": "https://cdn.com/id-front.jpg",
    "idCardBackImage": "https://cdn.com/id-back.jpg",
    "criminalRecord": "https://cdn.com/criminal-record.pdf",
    "status": "pending",
    "submittedAt": "2025-07-11T10:00:00Z",
    "reviewedAt": null,
    "reviewNotes": null,
    "reviewedBy": null
  }
}
```

### 2. Get Verification Status

**GET** `/api/users/verification/status`

**Authentication:** Required (User must be logged in)

**User Role:** Cook or Delivery only

**Response:**

```json
{
  "verification": {
    "nationalId": "29801234567891",
    "idCardFrontImage": "https://cdn.com/id-front.jpg",
    "idCardBackImage": "https://cdn.com/id-back.jpg",
    "criminalRecord": "https://cdn.com/criminal-record.pdf",
    "status": "pending",
    "submittedAt": "2025-07-11T10:00:00Z",
    "reviewedAt": null,
    "reviewNotes": null,
    "reviewedBy": null
  },
  "isVerified": false
}
```

### 3. Get Pending Verifications (Admin)

**GET** `/api/users/admin/verifications`

**Authentication:** Required (Admin only)

**Query Parameters:**

- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10)
- `status`: Filter by status ("pending", "approved", "rejected")

**Response:**

```json
{
  "verifications": [
    {
      "_id": "user_id",
      "name": "Test Cook",
      "email": "cook@test.com",
      "phone": "01234567890",
      "role": "cook",
      "verification": {
        "nationalId": "29801234567891",
        "idCardFrontImage": "https://cdn.com/id-front.jpg",
        "idCardBackImage": "https://cdn.com/id-back.jpg",
        "criminalRecord": "https://cdn.com/criminal-record.pdf",
        "status": "pending",
        "submittedAt": "2025-07-11T10:00:00Z",
        "reviewedAt": null,
        "reviewNotes": null,
        "reviewedBy": null
      }
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 1,
    "totalUsers": 1,
    "hasNext": false,
    "hasPrev": false
  }
}
```

### 4. Review Verification (Admin)

**PUT** `/api/users/admin/verifications/:userId`

**Authentication:** Required (Admin only)

**Request Body:**

```json
{
  "status": "approved",
  "reviewNotes": "All documents verified successfully"
}
```

**Response:**

```json
{
  "message": "تم الموافقة على طلب التحقق بنجاح",
  "verification": {
    "nationalId": "29801234567891",
    "idCardFrontImage": "https://cdn.com/id-front.jpg",
    "idCardBackImage": "https://cdn.com/id-back.jpg",
    "criminalRecord": "https://cdn.com/criminal-record.pdf",
    "status": "approved",
    "submittedAt": "2025-07-11T10:00:00Z",
    "reviewedAt": "2025-07-12T10:00:00Z",
    "reviewNotes": "All documents verified successfully",
    "reviewedBy": "admin_user_id"
  }
}
```

## Validation Rules

### National ID Validation

- Must be exactly 14 digits (Egyptian National ID format)
- Required for cook and delivery users only

### Document Requirements

- **ID Card Front Image**: Required, JPEG/PNG format
- **ID Card Back Image**: Required, JPEG/PNG format
- **Criminal Record**: Required, PDF format
- **File Size Limit**: 10MB per file

### Status Values

- `pending`: Initial status when submitted
- `approved`: Admin approved the verification
- `rejected`: Admin rejected the verification

## Business Logic

### User Role Restrictions

- Only users with "cook" or "delivery" roles can submit verification
- Client users cannot submit verification documents
- Admin users can review verifications

### Verification Flow

1. User submits verification documents
2. Status is set to "pending"
3. Admin reviews the documents
4. Admin approves or rejects with notes
5. User's `isVerified` field is updated accordingly

### Re-submission

- Users can only submit verification if they don't have a pending or approved status
- Rejected users can submit new verification documents

## Error Handling

### Common Error Responses

**400 - Bad Request:**

```json
{
  "message": "التحقق مطلوب فقط للمطاعم وموظفي التوصيل"
}
```

**400 - Missing Documents:**

```json
{
  "message": "يجب رفع جميع المستندات المطلوبة (صورة البطاقة الأمامية والخلفية وسجل جنائي)"
}
```

**400 - Already Submitted:**

```json
{
  "message": "تم تقديم طلب التحقق بالفعل"
}
```

**403 - Unauthorized:**

```json
{
  "message": "غير مصرح. للمديرين فقط."
}
```

## File Upload Configuration

The verification system uses a separate upload middleware (`verificationUploadMiddleware.js`) that:

- Accepts JPEG, PNG, and PDF files
- Stores files in Cloudinary under "verification-documents" folder
- Limits file size to 10MB
- Handles both cloud and memory storage

## Testing

Run the test script to verify the system:

```bash
node test_verification.js
```

This will test:

- Creating users with verification
- Querying verification statuses
- Validation rules
- Database operations

## Security Considerations

1. **Document Storage**: Files are stored securely in Cloudinary
2. **Access Control**: Only admins can review verifications
3. **Data Validation**: National ID format and file types are validated
4. **Audit Trail**: All review actions are logged with admin ID and timestamp
