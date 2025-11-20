# 🔐 Admin Dashboard Guide

## Overview

The SolPay admin dashboard provides comprehensive analytics and monitoring capabilities for platform administrators. Only authorized admin users can access these endpoints.

---

## 🔑 Admin Access Setup

### 1. Set Your Admin Email

Add your email to the backend `.env` file:

```env
ADMIN_EMAIL=your-email@example.com
```

### 2. Sign Up with Admin Email

Create an account using the admin email address through the normal signup flow.

### 3. Access Admin Endpoints

All admin endpoints require authentication. Include your JWT token in the Authorization header:

```bash
Authorization: Bearer YOUR_JWT_TOKEN
```

---

## 📊 Available Admin Endpoints

### Base URL
```
http://localhost:3001/api/admin
```

---

## 1. Transaction Analytics

**Endpoint:** `GET /api/admin/analytics/transactions`

**Description:** Get comprehensive transaction analytics including deposits, offramps, and USDC volumes.

**Query Parameters:**
- `start_date` (optional): ISO date string (e.g., `2024-01-01`)
- `end_date` (optional): ISO date string
- `group_by` (optional): `day` | `week` | `month` (default: `day`)

**Example Request:**
```bash
curl -X GET "http://localhost:3001/api/admin/analytics/transactions?start_date=2024-01-01" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response:**
```json
{
  "summary": {
    "total_users": 150,
    "active_users": 45,
    "total_deposits": 230,
    "total_offramps": 180,
    "total_usdc_deposited": 45000.50,
    "total_usdc_offramped": 38000.25,
    "total_ngn_paid_out": 62500000.00,
    "usdc_balance": 7000.25
  },
  "deposits_by_asset": {
    "USDC": {
      "total_amount": 45000.50,
      "total_count": 200,
      "confirmed_amount": 44500.00,
      "confirmed_count": 195,
      "pending_amount": 500.50,
      "pending_count": 5
    },
    "SOL": {
      "total_amount": 125.75,
      "total_count": 30,
      "confirmed_amount": 120.00,
      "confirmed_count": 28,
      "pending_amount": 5.75,
      "pending_count": 2
    }
  },
  "offramps_by_status": {
    "success": {
      "count": 170,
      "total_fiat": 60000000.00,
      "total_crypto": 38000.25
    },
    "pending": {
      "count": 8,
      "total_fiat": 2000000.00,
      "total_crypto": 1250.00
    },
    "failed": {
      "count": 2,
      "total_fiat": 500000.00,
      "total_crypto": 312.50
    }
  },
  "date_range": {
    "start": "2024-01-01",
    "end": "now"
  }
}
```

---

## 2. All Transactions List

**Endpoint:** `GET /api/admin/analytics/all-transactions`

**Description:** Get detailed list of all transactions (deposits + offramps) with user information.

**Query Parameters:**
- `limit` (optional): Number of results (default: 100)
- `offset` (optional): Pagination offset (default: 0)
- `type` (optional): `deposit` | `offramp`
- `status` (optional): Filter by status
- `user_id` (optional): Filter by specific user

**Example Request:**
```bash
curl -X GET "http://localhost:3001/api/admin/analytics/all-transactions?limit=50&type=offramp" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response:**
```json
{
  "transactions": [
    {
      "id": "uuid",
      "type": "offramp",
      "user_id": "user-uuid",
      "user_email": "user@example.com",
      "user_name": "John Doe",
      "asset": "USDC",
      "chain": "solana",
      "crypto_amount": 100.00,
      "fiat_amount": 165000.00,
      "currency": "NGN",
      "status": "success",
      "bank_name": "GTBank",
      "account_number": "0123456789",
      "account_name": "John Doe",
      "provider": "bread",
      "provider_reference": "bread_ref_123",
      "created_at": "2024-01-15T10:30:00Z",
      "completed_at": "2024-01-15T10:35:00Z"
    }
  ],
  "total": 180,
  "limit": 50,
  "offset": 0
}
```

---

## 3. Revenue Analytics

**Endpoint:** `GET /api/admin/analytics/revenue`

**Description:** Get platform revenue and fee statistics.

**Query Parameters:**
- `start_date` (optional): ISO date string
- `end_date` (optional): ISO date string

**Example Request:**
```bash
curl -X GET "http://localhost:3001/api/admin/analytics/revenue" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response:**
```json
{
  "total_fees_ngn": 1250000.00,
  "total_volume_ngn": 62500000.00,
  "average_fee_percentage": 2.0,
  "transaction_count": 170,
  "date_range": {
    "start": "all time",
    "end": "now"
  }
}
```

---

## 4. Dashboard Stats (Existing)

**Endpoint:** `GET /api/admin/stats`

**Description:** Get high-level dashboard statistics.

**Response:**
```json
{
  "users": {
    "total": 150,
    "kyc_approved": 45,
    "kyc_pending": 12
  },
  "deposits": {
    "total_count": 230,
    "total_value": 45000.50
  },
  "payouts": {
    "total_count": 180,
    "successful_count": 170,
    "total_value": 62500000.00
  }
}
```

---

## 5. User Management (Existing)

### Get All Users
```
GET /api/admin/users?limit=50&offset=0
```

### Get User Details
```
GET /api/admin/users/:userId
```

### Update User Status
```
PATCH /api/admin/users/:userId/status
Body: { "status": "active" | "suspended" | "banned" }
```

---

## 6. Payout Management (Existing)

### Get All Payouts
```
GET /api/admin/payouts?status=success&limit=50
```

---

## 🔒 Security Notes

1. **Admin access is restricted** to users whose email matches `ADMIN_EMAIL` in the environment variables
2. **All endpoints require authentication** via JWT token
3. **Never expose admin credentials** in client-side code
4. **Use HTTPS in production** to protect admin API calls
5. **Rotate admin credentials regularly**

---

## 📈 Use Cases

### Monitor Platform Health
```bash
# Get overall stats
curl -X GET "http://localhost:3001/api/admin/stats" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Track USDC Volume
```bash
# Get transaction analytics
curl -X GET "http://localhost:3001/api/admin/analytics/transactions" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Review Recent Transactions
```bash
# Get last 100 transactions
curl -X GET "http://localhost:3001/api/admin/analytics/all-transactions?limit=100" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Calculate Revenue
```bash
# Get revenue for current month
curl -X GET "http://localhost:3001/api/admin/analytics/revenue?start_date=2024-01-01" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## 🚀 Next Steps

1. Set your `ADMIN_EMAIL` in backend `.env`
2. Sign up with that email
3. Get your JWT token from login
4. Start making admin API calls
5. Build a custom admin dashboard UI (optional)

---

## 💡 Tips

- Use the `start_date` and `end_date` parameters to analyze specific time periods
- Export transaction data for accounting and compliance
- Monitor the `usdc_balance` to track platform liquidity
- Check `offramps_by_status` to identify failed transactions
- Use `user_id` filter to investigate specific user issues

