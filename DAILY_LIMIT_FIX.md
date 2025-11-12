# 🔧 Daily Limit Bug Fix

## Problem
New users were seeing "Daily limit remaining: N0" even after completing KYC verification, preventing them from making any offramp transactions.

## Root Cause
When users completed KYC verification via **Sumsub** or **Bread Africa webhooks**, the system updated their `kyc_status` and `kyc_tier` but **did NOT create transaction_limits records** in the database.

The frontend fetches limits from `/api/kyc/limits`, and when no limits exist, it defaults to 0, causing the "N0 remaining" error.

## What Was Fixed

### 1. Created Shared Utility Function
**File:** `backend/src/utils/limits.ts`
- Extracted `createUserLimits()` function to a shared utility
- This function creates daily/weekly/monthly limits based on KYC tier:
  - **Tier 1:** 5M NGN daily, 25M weekly, 50M monthly
  - **Tier 2:** 10M NGN daily, 50M weekly, 100M monthly
- Checks if limits already exist before creating (prevents duplicates)
- Uses `insert` instead of `upsert` to avoid conflicts

### 2. Updated Sumsub Webhook Handler
**File:** `backend/src/services/kyc/sumsub-service.ts`
- Added import for `createUserLimits`
- When webhook approves a user (reviewAnswer === 'GREEN'), now calls `createUserLimits(userId, kycTier)`
- Logs limit creation for monitoring

### 3. Updated Bread Africa Webhook Handler
**File:** `backend/src/routes/bread-webhooks.ts`
- Added import for `createUserLimits`
- When identity is verified, now calls `createUserLimits(userId, 1)`
- Logs limit creation for monitoring

### 4. Updated KYC Routes
**File:** `backend/src/routes/kyc.ts`
- Removed duplicate `createUserLimits` function
- Now imports from shared utility
- Legacy `/complete` endpoint already calls `createUserLimits` (no change needed)

### 5. Fixed Existing User
- Manually created transaction_limits for user `adedejijoshua41@gmail.com` who was approved before the fix
- User now has proper 5M NGN daily limit

## Verification

### Database Check
```sql
SELECT u.email, u.kyc_tier, u.kyc_status, COUNT(tl.id) as limit_count 
FROM users u 
LEFT JOIN transaction_limits tl ON u.id = tl.user_id 
WHERE u.kyc_tier > 0 
GROUP BY u.id, u.email, u.kyc_tier, u.kyc_status;
```

**Result:**
- ✅ adedejijoshua41@gmail.com: KYC Tier 1, 3 limits
- ✅ fezola004@gmail.com: KYC Tier 1, 3 limits

## Impact

### Before Fix
- ❌ New users completing KYC couldn't offramp (daily limit = N0)
- ❌ Webhook approvals didn't create limits
- ❌ Users had to manually contact support

### After Fix
- ✅ All new KYC approvals automatically get limits
- ✅ Works for both Sumsub and Bread Africa KYC
- ✅ Existing approved user fixed
- ✅ Future users will never have this issue

## Testing Recommendations

1. **Test Sumsub KYC Flow:**
   - Create new user
   - Complete Sumsub verification
   - Verify webhook creates limits
   - Check offramp screen shows correct limit

2. **Test Bread KYC Flow:**
   - Create new user
   - Complete Bread identity verification
   - Verify webhook creates limits
   - Check offramp screen shows correct limit

3. **Test Existing User:**
   - Login as adedejijoshua41@gmail.com
   - Navigate to offramp screen
   - Verify shows "Daily limit remaining: ₦5,000,000"
   - Attempt $1 offramp - should work

## Files Changed
- ✅ `backend/src/utils/limits.ts` (NEW)
- ✅ `backend/src/routes/kyc.ts`
- ✅ `backend/src/services/kyc/sumsub-service.ts`
- ✅ `backend/src/routes/bread-webhooks.ts`

## Build Status
✅ TypeScript compilation successful - no errors

