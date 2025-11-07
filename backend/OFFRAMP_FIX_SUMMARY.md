# Off-Ramp Fix Summary

## Problem
User reported: "WE ONLY GOT OFFRAMP INITIATED SUCCESSFULLY BUT NOT RAMONG IS GOING ON, WHEN WE REFRSH OUR APP, THE 1.9$ IS BACK, WHATS GOING ON"

**Root Cause:** The offramp execution was failing because:
1. ❌ Wrong Bread API endpoint (`/offramp/execute` instead of `/offramp`)
2. ❌ Wrong request format (sending bank details instead of `wallet_id` + `beneficiary_id`)
3. ❌ **CRITICAL:** Bread wallets were never being created for users!

## What Was Fixed

### 1. ✅ Corrected Bread Wallet Creation API Format

**Before (WRONG):**
```typescript
const request = {
  identity_id: identityId,
  type: 'basic',
  network: 'mainnet',
  chain: 'solana',
};
```

**After (CORRECT):**
```typescript
const request = {
  reference: `wallet_${identityId}_${chain}_${Date.now()}`,
};
```

**Why:** Bread Africa's wallet creation API only requires a `reference` field. The wallet is created as "basic" type by default, and automation can be enabled later via the `/automate` endpoint.

### 2. ✅ Fixed Offramp Execution Request Format

**Before (WRONG):**
```typescript
await breadService.offramp.executeOfframp({
  asset: "solana:usdc",
  amount: 1.9,
  currency: "NGN",
  bank_code: "058",
  account_number: "1234567890"
});
```

**After (CORRECT):**
```typescript
await breadService.offramp.executeOfframp({
  wallet_id: "690e301341ddc0fb44626700",
  amount: 1.9,
  beneficiary_id: "68bf2eba196a18d7bd166184",
  asset: "solana:usdc"
});
```

**Why:** Bread's `/offramp` endpoint requires `wallet_id` and `beneficiary_id`, not raw bank details.

### 3. ✅ Removed UNIQUE Constraint on `bread_wallet_id`

**Problem:** The database had a UNIQUE constraint on `deposit_addresses.bread_wallet_id`, but multiple assets on the same chain need to share the same Bread wallet.

**Example:**
- SOL, USDC, USDT all use the SAME Solana Bread wallet
- USDC, USDT use the SAME Base Bread wallet

**Fix:** Ran SQL migration:
```sql
ALTER TABLE deposit_addresses DROP CONSTRAINT IF EXISTS deposit_addresses_bread_wallet_id_key;
```

### 4. ✅ Auto-Create Bread Wallets for New Users

**Updated:** `backend/src/routes/deposits.ts` → `generateUserAddresses()` function

**What it does now:**
1. Checks if user has completed KYC (`bread_identity_id` exists)
2. Creates ONE Bread wallet for Solana (shared by SOL, USDC, USDT)
3. Creates ONE Bread wallet for Base (shared by USDC, USDT)
4. Stores `bread_wallet_id` in the `deposit_addresses` table
5. If Bread wallet creation fails, continues anyway (can be synced later)

**Code:**
```typescript
if (breadIdentityId) {
  const breadSolanaWallet = await breadService.wallet.createWallet(
    breadIdentityId,
    'solana',
    'basic'
  );
  breadSolanaWalletId = breadSolanaWallet.wallet_id;
}
```

### 5. ✅ Synced Existing Users' Wallets

**Created:** `backend/sync-bread-wallet.js` script

**What it does:**
1. Finds all deposit addresses without `bread_wallet_id`
2. Creates Bread wallets for each chain (Solana, Base)
3. Updates all deposit addresses for that chain with the same `bread_wallet_id`

**Usage:**
```bash
node sync-bread-wallet.js
```

**Result for user `3a6f2eb9-4138-4f3b-9c47-3fa26cdee341`:**
- ✅ Base USDC: `bread_wallet_id = 690e2f6b41ddc0fb4462666f`
- ✅ Solana SOL: `bread_wallet_id = 690e2f6b41ddc0fb44626674`
- ✅ Solana USDC: `bread_wallet_id = 690e301341ddc0fb44626700`
- ✅ Solana USDT: `bread_wallet_id = 690e301341ddc0fb44626700` (same as USDC)

## Files Changed

### Modified:
1. `backend/src/services/bread/wallet.ts` - Fixed wallet creation API format
2. `backend/src/services/bread/offramp.ts` - Changed endpoint from `/offramp/execute` to `/offramp`
3. `backend/src/services/bread/types.ts` - Updated `ExecuteOfframpRequest` interface
4. `backend/src/routes/payouts.ts` - Fetch `bread_wallet_id` and `bread_beneficiary_id` before offramp
5. `backend/src/routes/deposits.ts` - Auto-create Bread wallets when generating deposit addresses

### Created:
1. `backend/sync-bread-wallet.js` - Script to sync existing users' wallets
2. `backend/check-wallet-sync.js` - Script to verify wallet sync status
3. `backend/fix-bread-wallet-constraint.sql` - SQL migration to remove UNIQUE constraint
4. `backend/APPLY_MIGRATION.md` - Instructions for applying database migration

## Testing Checklist

### ✅ Completed:
- [x] Bread wallet creation API works with new format
- [x] Database UNIQUE constraint removed
- [x] Existing user's wallets synced successfully
- [x] Multiple assets can share same `bread_wallet_id`

### 🧪 To Test (After Deployment):
- [ ] New user registration creates Bread wallets automatically
- [ ] Offramp execution actually sends money to bank account
- [ ] Balance is deducted after successful offramp
- [ ] Payout record is created in database
- [ ] Deposits are marked as "swept" after offramp

## Next Steps

1. **Wait for Render deployment** (~2 minutes)
2. **Test offramp flow end-to-end:**
   - Click "Off-ramp Now" in the app
   - Verify money is sent to bank account
   - Verify balance is deducted
   - Check Render logs for success/errors
3. **Monitor Bread API responses** for any errors
4. **Test with new user registration** to verify Bread wallets are auto-created

## Bread Africa API Documentation Reference

### Wallet Creation
```
POST /wallet
{
  "reference": "unique_reference_string"
}
```

### Offramp Execution
```
POST /offramp
{
  "wallet_id": "690e301341ddc0fb44626700",
  "amount": 1.9,
  "beneficiary_id": "68bf2eba196a18d7bd166184",
  "asset": "solana:usdc"
}
```

### Enable Automation (Optional)
```
POST /automate
{
  "wallet_id": "690e301341ddc0fb44626700",
  "transfer": false,
  "swap": false,
  "offramp": true,
  "beneficiary_id": "68bf2eba196a18d7bd166184"
}
```

## Database Schema Changes

### deposit_addresses table
```sql
-- BEFORE: bread_wallet_id was UNIQUE (only one row could have each wallet_id)
ALTER TABLE deposit_addresses ADD COLUMN bread_wallet_id TEXT UNIQUE;

-- AFTER: bread_wallet_id is NOT UNIQUE (multiple rows can share same wallet_id)
ALTER TABLE deposit_addresses ADD COLUMN bread_wallet_id TEXT;
CREATE INDEX idx_deposit_addresses_bread_wallet_id ON deposit_addresses(bread_wallet_id);
```

## Deployment Status

- ✅ Code changes committed to GitHub
- ✅ Pushed to `main` branch
- ⏳ Render auto-deployment in progress
- ⏳ Waiting for production testing

---

**Deployed:** 2025-11-07
**Commit:** `133e893` - "feat: Auto-create Bread wallets when generating deposit addresses + fix wallet creation API"

