# Daily Limits Removal - Unlimited Offramp for All Users

## Problem
Users were seeing "Exceeds Daily Limit" and "Daily limit remaining: ₦0" even after KYC was removed, blocking them from executing offramps.

## Root Cause
Multiple places in the codebase were still enforcing daily/weekly/monthly transaction limits:
1. Backend quote creation checked limits and rejected transactions
2. Frontend displayed limit warnings and disabled the offramp button
3. Frontend set limits to ₦0 for users without KYC

## Solution
Removed all limit checks and set unlimited limits for all users.

---

## Changes Made

### 1. Backend Quote Creation (`backend/src/routes/quotes.ts`)

**Removed Lines 42-60:**

```typescript
// BEFORE: Checked daily limits and rejected transactions
// Check limits
const { data: limits } = await supabaseAdmin
  .from('transaction_limits')
  .select('*')
  .eq('user_id', userId)
  .eq('period', 'daily');

if (limits && limits.length > 0) {
  const dailyLimit = limits[0];
  const estimatedAmount = body.fiat_target ||
    (body.crypto_amount! * (await rateEngine.getAssetPrice(body.asset as Asset)) * 1600);

  if (parseFloat(dailyLimit.used_amount) + estimatedAmount > parseFloat(dailyLimit.limit_amount)) {
    return reply.status(400).send({
      error: 'Daily limit exceeded',
      message: 'This transaction would exceed your daily limit',
    });
  }
}
```

**Replaced With:**

```typescript
// AFTER: No limit checks
// KYC check removed - offramp is now open for all users
// Daily limit check removed - no limits enforced
```

---

### 2. Frontend Offramp Screen (`src/components/OfframpScreen.tsx`)

#### Removed Limit Calculations (Lines 154-166)

```typescript
// BEFORE: Calculated daily remaining and checked if exceeded
const dailyRemaining = limits.daily.limit - limits.daily.used;
const exceedsLimit = youReceive > dailyRemaining;

// Debug logging
useEffect(() => {
  console.log('🔍 OfframpScreen Debug:', {
    kycTier,
    limits,
    dailyRemaining,
    youReceive,
    exceedsLimit,
  });
}, [kycTier, limits, youReceive, exceedsLimit]);
```

**Replaced With:**

```typescript
// AFTER: No limit calculations
// Daily limit check removed - no limits enforced for any users
```

#### Removed Limit Check in Validation (Lines 258-261)

```typescript
// BEFORE: Blocked offramp if exceeded limit
if (exceedsLimit) {
  toast.error(`Transaction would exceed daily limit. Maximum: ₦${dailyRemaining.toLocaleString()}`);
  return;
}
```

**Replaced With:**

```typescript
// AFTER: No limit check
// Daily limit check removed - no limits enforced
```

#### Removed Limit Warning UI (Lines 539-551)

```typescript
// BEFORE: Showed red warning box
{exceedsLimit && (
  <div className="bg-red-50 p-4 rounded-xl border border-red-100">
    <div className="flex gap-2">
      <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
      <div>
        <p className="text-red-900 mb-1">Exceeds Daily Limit</p>
        <p className="text-red-800">
          Daily limit remaining: ₦{dailyRemaining.toLocaleString()}
        </p>
      </div>
    </div>
  </div>
)}
```

**Replaced With:**

```typescript
// AFTER: No warning UI
{/* Daily limit warning removed - no limits enforced */}
```

#### Removed Limit from Button Disabled Condition (Line 562)

```typescript
// BEFORE: Disabled button if exceeded limit
disabled={
  isProcessing ||
  !amount ||
  !selectedBankAccount ||
  parseFloat(amount) > currentAsset.balance ||
  parseFloat(amount) < currentAsset.minAmount ||
  exceedsLimit ||  // ← REMOVED
  bankAccounts.length === 0
}
```

**After:** Removed `exceedsLimit` from the condition

---

### 3. Frontend App State (`src/App.tsx`)

**Changed Lines 105-122:**

```typescript
// BEFORE: Set limits based on KYC tier (₦0 for tier 0)
const [limits, setLimits] = useState({
  daily: {
    limit: kycTier === 1 ? 5000000 : kycTier === 2 ? 10000000 : 0,
    used: 0,
    resets: new Date(Date.now() + 18 * 60 * 60 * 1000).toISOString(),
  },
  // ... similar for weekly and monthly
});
```

```typescript
// AFTER: Set unlimited limits for all users
const [limits, setLimits] = useState({
  daily: {
    limit: 999999999999, // Unlimited
    used: 0,
    resets: new Date(Date.now() + 18 * 60 * 60 * 1000).toISOString(),
  },
  // ... similar for weekly and monthly
});
```

---

## Impact

### ✅ What Now Works

1. **No daily limit checks** - Backend doesn't check limits
2. **No limit warnings** - Frontend doesn't show "Exceeds Daily Limit"
3. **Unlimited offramps** - Users can offramp any amount (up to their balance)
4. **No ₦0 limit** - All users have unlimited limits

### 🔄 Complete Flow (No Limits)

1. User deposits $100 USDC → ✅
2. User creates offramp for $100 → ✅ No limit check
3. User executes offramp → ✅ Processes successfully
4. User can immediately offramp again → ✅ No daily limit

---

## Testing

**Before Fix:**
- User tries to offramp
- ❌ Sees "Exceeds Daily Limit"
- ❌ Sees "Daily limit remaining: ₦0"
- ❌ Button disabled

**After Fix:**
- User tries to offramp
- ✅ No limit warnings
- ✅ Button enabled (if other validations pass)
- ✅ Offramp executes successfully

---

## Notes

- The `transaction_limits` table still exists in the database but is not checked
- Limit tracking (`updateUserLimits`) still runs but doesn't block transactions
- This change makes offramp truly unlimited for all users
- Only validation remaining: minimum amount ($1) and sufficient balance

