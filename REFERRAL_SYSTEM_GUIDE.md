# SolPay Referral System - Complete Implementation Guide

## 📋 Overview

The SolPay referral system allows users to earn $1 USD (credited as NGN) for each successful referral. When a new user signs up using a referral code and completes KYC verification (Tier 1+), the referrer automatically receives the reward.

---

## 🎯 Features

### ✅ Implemented Features

1. **Unique Referral Codes**
   - Each user gets a unique 6-character alphanumeric code
   - Auto-generated on account creation
   - Easy to share and remember

2. **Automatic Reward System**
   - $1 USD reward per successful referral
   - Automatically credited when referred user completes KYC
   - Converted to NGN at current exchange rate
   - Credited to NGN wallet (can be withdrawn)

3. **Referral Tracking**
   - Track total referrals (pending + completed)
   - View earnings in USD and NGN
   - See referral history with status

4. **Fraud Prevention**
   - Cannot refer yourself
   - One referral code per user
   - IP address tracking
   - Device fingerprinting
   - Rate limiting on suspicious activity

5. **User Interface**
   - Referral dashboard in user profile
   - Copy referral code button
   - Share referral link (native share API)
   - Real-time stats display
   - Referral history timeline

---

## 🗄️ Database Schema

### Tables Created

#### 1. `referral_codes`
Stores unique referral codes for each user.

```sql
CREATE TABLE referral_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  code VARCHAR(8) NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

#### 2. `referrals`
Tracks referral relationships and reward status.

```sql
CREATE TABLE referrals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  referrer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  referred_user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  referral_code VARCHAR(8) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  reward_amount_usd DECIMAL(10, 2) DEFAULT 1.00,
  reward_credited BOOLEAN DEFAULT FALSE,
  reward_credited_at TIMESTAMPTZ,
  reward_transaction_id UUID REFERENCES wallet_transactions(id),
  signup_ip_address INET,
  signup_user_agent TEXT,
  signup_device_fingerprint TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);
```

### Database Functions

#### 1. `generate_referral_code()`
Generates a unique 6-character alphanumeric code.

#### 2. `credit_referral_reward(p_referral_id UUID, p_reward_amount_usd DECIMAL)`
Credits the referral reward to the referrer's NGN wallet.

#### 3. `check_referral_on_kyc_approval()`
Trigger function that automatically credits reward when referred user completes KYC.

---

## 🔧 Backend Implementation

### API Endpoints

#### 1. **GET /api/referrals/code**
Get user's referral code and link.

**Response:**
```json
{
  "code": "ABC123",
  "link": "https://solpay.app?ref=ABC123",
  "created_at": "2024-01-15T10:30:00Z"
}
```

#### 2. **GET /api/referrals/stats**
Get referral statistics.

**Response:**
```json
{
  "total_referrals": 5,
  "pending_referrals": 2,
  "completed_referrals": 3,
  "total_earnings": {
    "usd": 3.00,
    "ngn": 4950.00
  }
}
```

#### 3. **GET /api/referrals/history**
Get referral history.

**Response:**
```json
{
  "referrals": [
    {
      "id": "uuid",
      "status": "completed",
      "reward_amount_usd": 1.00,
      "reward_credited": true,
      "reward_credited_at": "2024-01-15T10:30:00Z",
      "created_at": "2024-01-10T08:00:00Z",
      "completed_at": "2024-01-15T10:30:00Z"
    }
  ]
}
```

#### 4. **POST /api/referrals/apply**
Apply a referral code (called after signup).

**Request:**
```json
{
  "referralCode": "ABC123",
  "deviceFingerprint": "optional-fingerprint"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Referral code applied successfully",
  "referral": {
    "id": "uuid",
    "referrer_id": "uuid",
    "status": "pending"
  }
}
```

#### 5. **GET /api/referrals/validate/:code**
Validate a referral code before signup.

**Response:**
```json
{
  "valid": true,
  "message": "Valid referral code"
}
```

---

## 🎨 Frontend Implementation

### Components

#### 1. **ReferralSection.tsx**
Main referral dashboard component.

**Features:**
- Display referral code with copy button
- Share referral link (native share API)
- Show referral stats (total, pending, completed, earnings)
- Display referral history
- "How it Works" section

**Usage:**
```tsx
import { ReferralSection } from './components/ReferralSection';

<ReferralSection userId={userId} />
```

#### 2. **UserProfileScreen.tsx**
Updated to include referral section.

**Changes:**
- Added `userId` prop
- Integrated `ReferralSection` component

---

## 🚀 Setup Instructions

### Step 1: Run Database Migration

Run the SQL script in Supabase SQL Editor:

```bash
# Open Supabase Dashboard → SQL Editor
# Copy and paste contents of: RUN_THIS_IN_SUPABASE_REFERRAL.sql
# Click "Run"
```

This will:
- Create `referral_codes` and `referrals` tables
- Create database functions and triggers
- Update `wallet_transactions` source constraint
- Enable Row Level Security (RLS)
- Backfill referral codes for existing users

### Step 2: Verify Backend Routes

The referral routes are automatically registered in `backend/src/index.ts`:

```typescript
await fastify.register(referralRoutes, { prefix: '/api/referrals' });
```

### Step 3: Test the System

1. **Create a new user account**
2. **Check referral code generation:**
   ```bash
   GET /api/referrals/code
   ```
3. **Sign up a new user with referral code:**
   ```bash
   POST /api/auth/signup
   {
     "email": "newuser@example.com",
     "password": "password123",
     "referralCode": "ABC123"
   }
   ```
4. **Complete KYC for the new user**
5. **Check referrer's stats:**
   ```bash
   GET /api/referrals/stats
   ```
6. **Verify reward was credited:**
   ```bash
   GET /api/transactions
   # Look for transaction with source: "referral_bonus"
   ```

---

## 🔄 User Flow

### Referrer Flow

1. User creates account → Referral code auto-generated
2. User navigates to Profile → Sees referral section
3. User copies referral code or shares link
4. User sends code to friends
5. When friend completes KYC → User receives $1 USD (as NGN)
6. User can view earnings and withdraw to bank account

### Referred User Flow

1. User receives referral code from friend
2. User signs up with referral code
3. User completes KYC verification
4. Referrer automatically receives reward
5. Both users benefit!

---

## 🛡️ Security & Fraud Prevention

### Implemented Safeguards

1. **Self-Referral Prevention**
   - Database constraint prevents users from referring themselves
   - Validation in backend API

2. **Duplicate Prevention**
   - Each user can only be referred once
   - Unique constraint on `referred_user_id`

3. **IP Address Tracking**
   - Track signup IP for each referral
   - Flag suspicious patterns (3+ referrals from same IP in 24h)

4. **Device Fingerprinting**
   - Optional device fingerprint tracking
   - Helps identify coordinated fraud

5. **KYC Requirement**
   - Reward only credited after KYC completion
   - Prevents fake account creation

6. **Rate Limiting**
   - API rate limits prevent abuse
   - Suspicious activity logged for review

---

## 📊 Monitoring & Analytics

### Key Metrics to Track

1. **Referral Conversion Rate**
   - Pending referrals / Total referrals
   - Target: >50%

2. **Average Time to Conversion**
   - Time from signup to KYC completion
   - Target: <7 days

3. **Fraud Detection**
   - Referrals from same IP
   - Referrals with same device fingerprint
   - Unusual patterns

4. **Total Rewards Paid**
   - Track total USD/NGN paid in referral bonuses
   - Monitor for budget planning

### Database Queries

```sql
-- Total referrals by status
SELECT status, COUNT(*) 
FROM referrals 
GROUP BY status;

-- Top referrers
SELECT referrer_id, COUNT(*) as total_referrals
FROM referrals
WHERE status = 'completed'
GROUP BY referrer_id
ORDER BY total_referrals DESC
LIMIT 10;

-- Suspicious IP addresses
SELECT signup_ip_address, COUNT(*) as referral_count
FROM referrals
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY signup_ip_address
HAVING COUNT(*) >= 3;
```

---

## 🔮 Future Enhancements

### Potential Features

1. **Tiered Rewards**
   - Increase reward for more referrals
   - Example: 10 referrals = $2 per referral

2. **Referral Leaderboard**
   - Show top referrers
   - Gamification elements

3. **Bonus Campaigns**
   - Limited-time increased rewards
   - Special promotions

4. **Referral Analytics**
   - Detailed conversion funnel
   - A/B testing different reward amounts

5. **Social Media Integration**
   - One-click sharing to Twitter, WhatsApp, etc.
   - Pre-filled messages

---

## 🐛 Troubleshooting

### Common Issues

#### 1. Referral code not generated
**Solution:** Run backfill query:
```sql
INSERT INTO referral_codes (user_id, code)
SELECT id, generate_referral_code()
FROM users
WHERE id NOT IN (SELECT user_id FROM referral_codes);
```

#### 2. Reward not credited after KYC
**Check:**
- Referral status in database
- KYC tier (must be >= 1)
- Trigger is enabled
- Manual credit: `SELECT credit_referral_reward('referral_id');`

#### 3. "Invalid referral code" error
**Check:**
- Code exists in `referral_codes` table
- Code is uppercase (codes are case-insensitive but stored uppercase)
- User not trying to use their own code

---

## 📝 API Integration Example

### Frontend Integration

```typescript
// Get referral code
const response = await fetch('/api/referrals/code', {
  headers: {
    'Authorization': `Bearer ${accessToken}`,
  },
});
const { code, link } = await response.json();

// Share referral link
if (navigator.share) {
  await navigator.share({
    title: 'Join SolPay',
    text: `Use my code ${code} to join SolPay!`,
    url: link,
  });
}

// Sign up with referral code
await fetch('/api/auth/signup', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'password123',
    referralCode: 'ABC123',
  }),
});
```

---

## ✅ Checklist

- [x] Database schema created
- [x] Backend API endpoints implemented
- [x] Frontend UI components created
- [x] Automatic reward crediting on KYC
- [x] Fraud prevention measures
- [x] Row Level Security (RLS) policies
- [x] Documentation completed
- [ ] End-to-end testing
- [ ] Production deployment

---

## 📞 Support

For issues or questions about the referral system:
1. Check this documentation
2. Review database logs
3. Check Supabase logs for errors
4. Review backend logs for API errors

---

**Last Updated:** 2024-01-15
**Version:** 1.0.0

