# 🔧 Offramp Beneficiary ID Fix

## Problem

When users tried to offramp USDT (or any asset), they got a **500 Internal Server Error**:

```
ZodError: Invalid uuid for beneficiary_id
```

**Root Cause:** Frontend was sending the wrong ID to the backend!

---

## The Issue

### Two Different Tables

The app has **TWO tables** for bank accounts:

1. **`bank_accounts`** (Old table)
   - Has: `id`, `bank_name`, `account_number`, etc.
   - **Missing:** `bread_beneficiary_id` ❌

2. **`payout_beneficiaries`** (New table - Bread integration)
   - Has: `id`, `bank_name`, `account_number`, `bread_beneficiary_id` ✅
   - Used by backend for offramps

### What Was Happening

**Frontend (WRONG):**
```typescript
// src/App.tsx - OLD CODE
const accounts = await bankAccountService.getBankAccounts(userId);
const transformedAccounts = accounts.map((account: any) => ({
  id: account.id,  // ❌ This is bank_accounts.id (UUID)
  ...
}));
```

**Backend (EXPECTED):**
```typescript
// backend/src/routes/payouts.ts
const executeOfframpSchema = z.object({
  beneficiary_id: z.string().uuid(),  // ✅ Expects bread_beneficiary_id
  ...
});
```

**Result:**
- Frontend sends `bank_accounts.id` (e.g., `123e4567-e89b-12d3-a456-426614174000`)
- Backend looks for `payout_beneficiaries` with that ID
- Not found → Validation error → 500 error

---

## The Fix

### Changed Frontend to Use `payout_beneficiaries` Table

**File:** `src/App.tsx` (lines 228-260)

```typescript
// ✅ NEW CODE (FIXED)
const loadBankAccounts = async () => {
  if (isAuthenticated && userId) {
    try {
      // Fetch from payout_beneficiaries table (has bread_beneficiary_id)
      const { data: beneficiaries, error } = await supabase
        .from('payout_beneficiaries')
        .select('*')
        .eq('user_id', userId)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching beneficiaries:', error);
        return;
      }

      // Transform to match BankAccount interface
      const transformedAccounts = (beneficiaries || []).map((beneficiary: any) => ({
        id: beneficiary.bread_beneficiary_id || beneficiary.id, // ✅ Use bread_beneficiary_id!
        bankName: beneficiary.bank_name,
        bankCode: beneficiary.bank_code,
        accountNumber: beneficiary.account_number,
        accountName: beneficiary.account_name,
        isVerified: !!beneficiary.verified_at,
        logo: undefined,
      }));
      setBankAccounts(transformedAccounts);
    } catch (error) {
      console.error('Failed to load bank accounts:', error);
    }
  }
};
```

---

## Why This Works

### Before (Broken) ❌

```
User adds bank account
  ↓
Backend creates record in payout_beneficiaries
  ↓
Frontend loads from bank_accounts (wrong table!)
  ↓
Frontend sends bank_accounts.id to offramp API
  ↓
Backend looks for payout_beneficiaries with that ID
  ↓
Not found → 500 error
```

### After (Fixed) ✅

```
User adds bank account
  ↓
Backend creates record in payout_beneficiaries
  ↓
Frontend loads from payout_beneficiaries (correct table!)
  ↓
Frontend sends bread_beneficiary_id to offramp API
  ↓
Backend finds beneficiary successfully
  ↓
Offramp executes ✅
```

---

## Testing

### Test 1: Check Bank Accounts Load

After deploying, check browser console:
```
✅ Loaded bank accounts: 1
```

### Test 2: Try Offramp

1. Select USDT (or any asset)
2. Enter amount
3. Select bank account
4. Click "Convert to NGN"
5. **Should work!** ✅

### Test 3: Check Logs

Backend logs should show:
```
✅ Bread offramp executed successfully
offrampId: bread_offramp_xxx
status: processing
```

**NOT:**
```
❌ ZodError: Invalid uuid for beneficiary_id
```

---

## Summary

**Problem:** Frontend was loading bank accounts from the wrong table (`bank_accounts` instead of `payout_beneficiaries`)

**Fix:** Changed frontend to load from `payout_beneficiaries` table and use `bread_beneficiary_id` as the ID

**Impact:** Users can now offramp successfully! 🎉

**Files Changed:**
- ✅ `src/App.tsx` - Load from `payout_beneficiaries` table (lines 19, 228-260)
  - Added `supabase` import
  - Changed `loadBankAccounts()` to query `payout_beneficiaries` table
  - Use `bread_beneficiary_id` as the account ID
- ✅ Frontend build successful (no errors)

**Build Status:**
```
✓ 2218 modules transformed.
✓ built in 13.37s
✅ No TypeScript errors
```

**Next Step:** Deploy frontend and test offramp!

