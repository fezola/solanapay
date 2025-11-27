# 🎁 Bonus System Guide

## Overview

The bonus system allows admins to send USDC bonuses to users directly from the treasury wallet. Users receive a beautiful notification card in the app and can share their bonus on X (Twitter).

---

## 🗄️ Database Setup

### Step 1: Run the Migration

Execute this SQL in your Supabase SQL Editor:

```sql
-- Run the migration file
\i backend/migrations/add_bonus_system.sql
```

Or copy and paste the contents of `backend/migrations/add_bonus_system.sql` into the Supabase SQL Editor.

### Step 2: Verify Table Creation

```sql
SELECT * FROM bonus_transactions LIMIT 1;
```

You should see the table with columns: `id`, `user_id`, `admin_email`, `amount`, `asset`, `chain`, `reason`, `tx_hash`, `status`, etc.

---

## 🔑 Admin API Endpoints

### Send Bonus to User

**Endpoint:** `POST /api/admin/send-bonus`

**Headers:**
```
Authorization: Bearer <ADMIN_TOKEN>
Content-Type: application/json
```

**Body:**
```json
{
  "user_email": "patrick@example.com",
  "amount": 5.00,
  "asset": "USDC",
  "chain": "solana",
  "reason": "Highest offramp transaction - November 2024"
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Successfully sent 5 USDC bonus to patrick@example.com",
  "bonus": {
    "id": "uuid-here",
    "user": {
      "email": "patrick@example.com",
      "name": "Patrick C. Nwachukwu"
    },
    "amount": 5,
    "asset": "USDC",
    "chain": "solana",
    "reason": "Highest offramp transaction - November 2024",
    "tx_hash": "5xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU...",
    "explorer_url": "https://solscan.io/tx/5xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU..."
  }
}
```

### Get All Bonuses

**Endpoint:** `GET /api/admin/bonuses?limit=50&status=success`

**Response:**
```json
{
  "bonuses": [
    {
      "id": "uuid",
      "user_id": "user-uuid",
      "admin_email": "fezola004@gmail.com",
      "amount": 5.00,
      "asset": "USDC",
      "chain": "solana",
      "reason": "Highest offramp transaction",
      "tx_hash": "...",
      "status": "success",
      "notification_shown": false,
      "shared_on_twitter": false,
      "created_at": "2024-11-27T...",
      "completed_at": "2024-11-27T...",
      "user": {
        "email": "patrick@example.com",
        "full_name": "Patrick C. Nwachukwu"
      }
    }
  ]
}
```

---

## 💻 How to Send Bonus to Patrick Nwachukwu

### Option 1: Using cURL

```bash
# Get admin token first (login to admin dashboard)
ADMIN_TOKEN="your-admin-jwt-token"

# Send bonus
curl -X POST https://solanapay-xmli.onrender.com/api/admin/send-bonus \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "user_email": "patrick@example.com",
    "amount": 5.00,
    "asset": "USDC",
    "chain": "solana",
    "reason": "Highest offramp transaction - November 2024! 🎉"
  }'
```

### Option 2: Using Postman

1. **Method:** POST
2. **URL:** `https://solanapay-xmli.onrender.com/api/admin/send-bonus`
3. **Headers:**
   - `Authorization`: `Bearer <your-admin-token>`
   - `Content-Type`: `application/json`
4. **Body (raw JSON):**
```json
{
  "user_email": "patrick@example.com",
  "amount": 5.00,
  "reason": "Highest offramp transaction - November 2024! 🎉"
}
```

### Option 3: Using JavaScript (Browser Console on Admin Dashboard)

```javascript
// Run this in the browser console while logged into admin dashboard
fetch('/api/admin/send-bonus', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${localStorage.getItem('token')}` // or get from cookies
  },
  body: JSON.stringify({
    user_email: 'patrick@example.com',
    amount: 5.00,
    reason: 'Highest offramp transaction - November 2024! 🎉'
  })
})
.then(r => r.json())
.then(data => console.log('✅ Bonus sent:', data))
.catch(err => console.error('❌ Error:', err));
```

---

## 📱 User Experience

### What Patrick Will See:

1. **Instant Notification:** A beautiful purple card pops up in the app
2. **Bonus Details:** Shows $5.00 USDC with the reason
3. **Share Button:** Blue Twitter button to share on X
4. **Transaction Link:** Link to view on Solscan
5. **Balance Update:** His USDC balance increases by $5

### Share Message Template:

When Patrick clicks "Share on X", it opens Twitter with:

```
Just received a $5.00 USDC bonus from @SolPay! 🎉

Reason: Highest offramp transaction - November 2024

Try SolPay for seamless crypto-to-fiat conversions! 💰

#SolPay #Crypto #USDC
```

---

## 🔧 Configuration Requirements

### Environment Variables

Make sure these are set in your Render environment:

```env
# Solana Treasury Wallet (REQUIRED for bonuses)
SOLANA_TREASURY_ADDRESS=<your-treasury-public-key>
SOLANA_TREASURY_PRIVATE_KEY=[1,2,3,4,5,...]  # JSON array format

# Solana RPC
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com

# USDC Mint Address (Mainnet)
USDC_SOL_MINT=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v
```

### Treasury Wallet Requirements:

1. **Must have SOL for gas fees** (minimum 0.01 SOL)
2. **Must have USDC to send as bonuses**
3. **Private key must be in JSON array format**

---

## 🎯 Next Steps

1. ✅ Run database migration
2. ✅ Verify treasury wallet has USDC
3. ✅ Get Patrick's email from admin dashboard
4. ✅ Send $5 USDC bonus using API
5. ✅ Ask Patrick to check his app
6. ✅ Ask Patrick to share on X!

---

## 🚀 Future Bonuses

You can send bonuses to any user at any time:

- **Welcome bonuses** for new users
- **Referral bonuses** for successful referrals
- **Milestone bonuses** for transaction volume
- **Contest winners**
- **Special promotions**

Just use the same API endpoint with different `user_email`, `amount`, and `reason`!

