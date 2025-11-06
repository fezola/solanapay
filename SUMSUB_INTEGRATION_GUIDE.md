# 🎯 Sumsub KYC Integration Guide

## Overview

Your SolPay application now has **full Sumsub KYC integration**! This guide will help you complete the setup and start verifying users.

---

## ✅ What's Been Completed

### 1. **Backend Integration** ✅
- ✅ Sumsub API client with HMAC signature authentication
- ✅ Sumsub service layer for KYC operations
- ✅ Database schema updated with Sumsub fields
- ✅ KYC routes updated to use Sumsub
- ✅ Webhook handler for verification status updates
- ✅ Environment configuration for Sumsub credentials

### 2. **Frontend Integration** ✅
- ✅ Sumsub Web SDK component
- ✅ Verification flow UI
- ✅ Retry functionality
- ✅ Status tracking and error handling

### 3. **Database Schema** ✅
- ✅ `users.sumsub_applicant_id` - Sumsub applicant ID
- ✅ `users.kyc_verified_at` - Verification timestamp
- ✅ `kyc_verifications` table - Audit trail for KYC events

---

## 🚀 Setup Instructions

### Step 1: Get Sumsub Credentials

1. **Sign up for Sumsub** (if you haven't already):
   - Go to https://sumsub.com
   - Sign up for a free trial account
   - You mentioned you already have a free trial set up ✅

2. **Get your API credentials**:
   - Log in to https://cockpit.sumsub.com
   - Go to **Settings** → **App Tokens**
   - Click **Generate New Token**
   - Copy your **App Token**
   - Click **Show Secret Key** and copy it

3. **Create a verification level**:
   - Go to **Levels** in the Sumsub dashboard
   - Create a new level (e.g., "basic-kyc-level")
   - Configure required documents:
     - ✅ ID Document (National ID, Passport, Driver's License)
     - ✅ Selfie
     - ✅ Proof of Address (optional for Tier 1)
   - Save the level name

### Step 2: Configure Environment Variables

Update your `backend/.env` file with your Sumsub credentials:

```env
# ============================================================================
# KYC/AML - SUMSUB
# ============================================================================
# Get your credentials from https://cockpit.sumsub.com
SUMSUB_APP_TOKEN=your_app_token_here
SUMSUB_SECRET_KEY=your_secret_key_here
SUMSUB_BASE_URL=https://api.sumsub.com
# Level name from your Sumsub flow (e.g., "basic-kyc-level")
SUMSUB_LEVEL_NAME=basic-kyc-level
# Webhook secret for verifying webhook signatures
SUMSUB_WEBHOOK_SECRET=your_webhook_secret_here
# Set to false to use real Sumsub verification
KYC_AUTO_APPROVE=false
```

**Important:** Replace the placeholder values with your actual credentials!

### Step 3: Configure Webhooks in Sumsub

1. Go to https://cockpit.sumsub.com
2. Navigate to **Settings** → **Webhooks**
3. Click **Add Webhook**
4. Configure:
   - **URL**: `https://your-domain.com/api/webhooks/sumsub`
   - **Events**: Select all applicant events:
     - ✅ applicantCreated
     - ✅ applicantPending
     - ✅ applicantReviewed
     - ✅ applicantOnHold
     - ✅ applicantPersonalInfoChanged
   - **Secret**: Generate a secret and add it to your `.env` as `SUMSUB_WEBHOOK_SECRET`
5. Save the webhook

### Step 4: Test the Integration

1. **Start your backend server**:
   ```bash
   cd backend
   npm run dev
   ```

2. **Test the KYC flow**:
   ```bash
   # Get KYC status
   curl -X GET http://localhost:3001/api/kyc/status \
     -H "Authorization: Bearer YOUR_JWT_TOKEN"

   # Start KYC verification
   curl -X POST http://localhost:3001/api/kyc/start \
     -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     -H "Content-Type: application/json"
   ```

3. **Expected response**:
   ```json
   {
     "provider": "sumsub",
     "applicantId": "6123456789abcdef12345678",
     "accessToken": "sbx:...",
     "message": "KYC initialized. Use the access token with Sumsub Web SDK."
   }
   ```

---

## 📱 Frontend Integration

### Using the Sumsub Component

Import and use the `SumsubVerification` component in your KYC page:

```tsx
import { SumsubVerification } from '@/components/KYC/SumsubVerification';

function KYCPage() {
  const handleComplete = () => {
    console.log('KYC verification completed!');
    // Redirect to dashboard or show success message
  };

  const handleError = (error: string) => {
    console.error('KYC verification error:', error);
    // Show error message to user
  };

  return (
    <div className="container mx-auto py-8">
      <SumsubVerification
        onComplete={handleComplete}
        onError={handleError}
      />
    </div>
  );
}
```

### Add Sumsub SDK Script to HTML

Add this to your `index.html` (optional - the component loads it dynamically):

```html
<script src="https://static.sumsub.com/idensic/static/sns-websdk-builder.js"></script>
```

---

## 🔄 Verification Flow

### User Journey

1. **User clicks "Start Verification"**
   - Frontend calls `POST /api/kyc/start`
   - Backend creates Sumsub applicant
   - Backend returns access token

2. **Sumsub SDK loads**
   - User uploads ID document
   - User takes selfie
   - User submits verification

3. **Sumsub processes verification**
   - Automatic checks run
   - Manual review (if needed)
   - Webhook sent to your backend

4. **Backend receives webhook**
   - Webhook handler processes event
   - User status updated in database
   - User notified of result

### Status Flow

```
not_started → pending → approved ✅
                     → rejected ❌
                     → on_hold ⏸️
```

---

## 🎯 KYC Tiers

Your application supports multiple KYC tiers:

| Tier | Level Name | Daily Limit | Weekly Limit | Monthly Limit |
|------|-----------|-------------|--------------|---------------|
| 1 | basic-kyc-level | ₦5M | ₦25M | ₦50M |
| 2 | advanced-kyc-level | ₦10M | ₦50M | ₦100M |

Configure these in Sumsub dashboard under **Levels**.

---

## 🔐 Security

### Webhook Signature Verification

All webhooks are verified using HMAC-SHA256:

```typescript
const signature = crypto
  .createHmac('sha256', SUMSUB_WEBHOOK_SECRET)
  .update(payload)
  .digest('hex');
```

### API Request Signing

All API requests are signed with:
- `X-App-Token`: Your app token
- `X-App-Access-Sig`: HMAC signature
- `X-App-Access-Ts`: Unix timestamp

---

## 📊 Monitoring

### Check KYC Status

```bash
curl -X GET http://localhost:3001/api/kyc/status \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### View Verification History

```sql
SELECT * FROM kyc_verifications
WHERE user_id = 'USER_ID'
ORDER BY created_at DESC;
```

### Check Webhook Health

```bash
curl http://localhost:3001/api/webhooks/sumsub/health
```

---

## 🧪 Testing

### Test Mode

Sumsub provides test mode for development:

1. Use test credentials from Sumsub dashboard
2. Upload test documents (any image will work)
3. Verification will auto-approve in test mode

### Supported Nigerian Documents

- ✅ National ID Card (NIN)
- ✅ Driver's License
- ✅ International Passport
- ✅ Voter's Card
- ✅ Residence Permit

---

## 🚨 Troubleshooting

### Issue: "Sumsub not configured"

**Solution**: Make sure you've added your credentials to `.env`:
```env
SUMSUB_APP_TOKEN=your_token
SUMSUB_SECRET_KEY=your_secret
```

### Issue: "Invalid signature"

**Solution**: Check that your `SUMSUB_SECRET_KEY` matches the one in Sumsub dashboard.

### Issue: Webhook not receiving events

**Solution**:
1. Check webhook URL is publicly accessible
2. Verify webhook secret matches `.env`
3. Check Sumsub dashboard for webhook delivery logs

---

## 📞 Support

- **Sumsub Documentation**: https://developers.sumsub.com
- **Sumsub Support**: support@sumsub.com
- **Dashboard**: https://cockpit.sumsub.com

---

## ✅ Next Steps

1. ✅ Get Sumsub credentials from dashboard
2. ✅ Update `.env` with credentials
3. ✅ Configure webhook in Sumsub dashboard
4. ✅ Test verification flow
5. ✅ Integrate `SumsubVerification` component in your app
6. ✅ Go live!

---

**Your Sumsub integration is ready! 🎉**

Just add your credentials and you're good to go!

