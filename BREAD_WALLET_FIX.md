# Bread Wallet Creation Fix - No KYC Required

## Problem
Users were getting "Bread wallet not found" error when trying to offramp because:
1. Bread wallets were only created if user had `bread_identity_id` (from KYC)
2. We removed KYC/identity creation, so new users don't have `bread_identity_id`
3. Without `bread_identity_id`, no Bread wallets were created
4. Offramp endpoint requires `bread_wallet_id` to execute transactions

## Root Cause
In `backend/src/routes/deposits.ts`, the `generateUserAddresses()` function had this logic:

```typescript
// BEFORE: Only created wallets if user had bread_identity_id
const breadIdentityId = user?.bread_identity_id;

if (breadIdentityId) {
  // Create Bread wallets...
} else {
  logger.warn({
    msg: 'User has no Bread identity ID - skipping Bread wallet creation',
    userId,
  });
}
```

This meant:
- ✅ Old users with KYC → had `bread_identity_id` → Bread wallets created
- ❌ New users without KYC → no `bread_identity_id` → NO Bread wallets created

## Solution
The Bread API doesn't actually require `identity_id` to create wallets! The `createWallet()` function only uses `identityId` for logging and generating a reference string - it's NOT sent to Bread API.

We can create Bread wallets using `userId` instead of `bread_identity_id`.

---

## Changes Made

### File: `backend/src/routes/deposits.ts`

**Changed Lines 229-285:**

```typescript
// BEFORE: Required bread_identity_id
const breadIdentityId = user?.bread_identity_id;

if (breadIdentityId) {
  const breadSolanaWallet = await breadService.wallet.createWallet(
    breadIdentityId,  // ← Required KYC
    'solana',
    'basic'
  );
  // ... more wallets
} else {
  logger.warn('User has no Bread identity ID - skipping Bread wallet creation');
}
```

```typescript
// AFTER: Use userId instead (no KYC required)
try {
  const breadSolanaWallet = await breadService.wallet.createWallet(
    userId,  // ← Use userId instead of bread_identity_id
    'solana',
    'basic'
  );
  // ... more wallets for base and polygon
} catch (error) {
  logger.error('Failed to create Bread wallets', error);
}
```

**Key Changes:**
1. ✅ Removed `if (breadIdentityId)` check
2. ✅ Use `userId` instead of `breadIdentityId` for wallet creation
3. ✅ All users now get Bread wallets automatically
4. ✅ Updated log messages to indicate "no KYC required"

---

## Impact

### ✅ What Now Works

1. **New users** → Bread wallets created automatically on signup
2. **Offramp works** → `bread_wallet_id` exists in `deposit_addresses` table
3. **No KYC required** → Wallets created without identity verification

### 🔄 Complete Flow

1. User signs up → ✅
2. Deposit addresses generated → ✅
3. **Bread wallets created (NEW!)** → ✅
4. User deposits crypto → ✅
5. User adds bank account → ✅
6. User executes offramp → ✅ **No more "Bread wallet not found" error!**

---

## For Existing Users

Existing users who signed up **before** this fix won't have Bread wallets. Run this script to fix them:

```bash
cd backend
npx tsx src/scripts/create-missing-bread-wallets.ts
```

This script will:
1. ✅ Find all users with missing Bread wallets
2. ✅ Create Bread wallets for Solana, Base, and Polygon
3. ✅ Update `deposit_addresses` table with `bread_wallet_id`
4. ✅ Enable offramp for all existing users

---

## Testing

### For New Users (After Fix)
1. Sign up a new account
2. Check deposit addresses → should have `bread_wallet_id`
3. Deposit crypto
4. Add bank account
5. Execute offramp → ✅ Should work!

### For Existing Users (Before Running Script)
1. Try to offramp → ❌ "Bread wallet not found"
2. Run the script: `npx tsx src/scripts/create-missing-bread-wallets.ts`
3. Try to offramp again → ✅ Should work!

---

## Technical Details

### Why This Works

The `breadService.wallet.createWallet()` function signature:

```typescript
async createWallet(
  identityId: string,  // ← Only used for logging and reference generation
  chain: Chain,
  type: BreadWalletType = 'offramp',
  beneficiaryId?: string
): Promise<BreadWallet>
```

The actual Bread API request:

```typescript
const breadRequest = {
  reference: `wallet_${identityId}_${chain}_${Date.now()}`,  // ← identityId only used here
  // No identity_id sent to Bread API!
};

const response = await this.client.post('/wallet', breadRequest);
```

**Conclusion:** The `identityId` parameter is NOT sent to Bread API - it's only used to generate a unique reference string. We can safely use `userId` instead!

---

## Files Changed

1. `backend/src/routes/deposits.ts` - Updated `generateUserAddresses()` to create wallets without KYC
2. `backend/src/scripts/create-missing-bread-wallets.ts` - New script to fix existing users

---

## Next Steps

1. ✅ **Deploy the fix** - New users will get Bread wallets automatically
2. ✅ **Run the script** - Fix existing users who don't have Bread wallets
3. ✅ **Test offramp** - Verify "Bread wallet not found" error is gone

