# Offramp Debugging Guide

## Quick Reference: What to Look For in Logs

When you execute an offramp, you should see these log messages in order:

### 1. Initial Request
```json
{
  "msg": "🚀 Executing offramp (simplified flow)",
  "body": {
    "asset": "USDC",
    "chain": "solana",
    "amount": 1,
    "beneficiary_id": "xxx-xxx-xxx",
    "currency": "NGN"
  }
}
```

### 2. Quote Received
```json
{
  "msg": "Quote received from Bread",
  "quote": {
    "type": "offramp",
    "fee": 0.005,
    "rate": 1459.99,
    "input_amount": 1,
    "output_amount": 1453
  }
}
```

### 3. Bank Account Verified ✅ NEW
```json
{
  "msg": "✅ Selected bank account verified",
  "beneficiaryId": "xxx-xxx-xxx",
  "bankName": "PalmPay",  // ← CHECK THIS!
  "accountNumber": "1234567890",
  "accountName": "Your Name"
}
```
**🔍 ACTION:** Verify `bankName` matches the bank you selected in the app!

### 4. Bread Wallet Created/Verified
```json
{
  "msg": "Bread wallet verified and address retrieved",
  "breadWalletAddress": "7cJdH1d6NnGF..."
}
```

### 5. Crypto Transfer
```json
{
  "msg": "Transfer completed",
  "transfer": {
    "signature": "5x...",
    "amount": 1000000,
    "fromAddress": "...",
    "toAddress": "..."
  }
}
```

### 6. Quote Record Creation ✅ NEW
```json
{
  "msg": "Creating quote record...",
  "userId": "xxx",
  "asset": "USDC",
  "chain": "solana",
  "amount": 1,
  "rate": 1459.99,
  "outputAmount": 1453
}
```

```json
{
  "msg": "✅ Quote record created successfully",
  "quoteId": "xxx-xxx-xxx"
}
```

**🔍 IF THIS FAILS:**
```json
{
  "msg": "Failed to create quote record",
  "error": {...},
  "errorDetails": {...},
  "errorMessage": "..."
}
```
**Common causes:**
- Missing required fields in quotes table
- Database constraint violations
- Invalid data types

### 7. NGN Wallet Credited
```json
{
  "msg": "NGN wallet credited successfully",
  "transactionId": "xxx",
  "grossAmountNaira": 1453,
  "netAmount": 1438.47,
  "fee": 14.53,
  "walletReference": "OFFRAMP-xxx"
}
```

### 8. Payout Record Creation ✅ NEW
```json
{
  "msg": "Creating payout record...",
  "userId": "xxx",
  "quoteId": "xxx-xxx-xxx",
  "beneficiaryId": "xxx-xxx-xxx",
  "fiatAmount": 1438.47,
  "currency": "NGN"
}
```

```json
{
  "msg": "✅ Payout record created successfully",
  "payoutId": "xxx-xxx-xxx"
}
```

**🔍 IF THIS FAILS:**
```json
{
  "msg": "Failed to create payout record",
  "error": {...},
  "errorDetails": {...},
  "errorMessage": "..."
}
```
**Common causes:**
- Missing `quote_id` (quote creation failed earlier)
- Invalid `beneficiary_id` (bank account doesn't exist)
- Missing required fields in payouts table
- Database constraint violations

### 9. Success Response
```json
{
  "success": true,
  "message": "NGN credited to your wallet",
  "payout": {...},
  "wallet": {
    "transactionId": "xxx",
    "grossAmount": 1453,
    "platformFee": 14.53,
    "netAmount": 1438.47,
    "currency": "NGN"
  }
}
```

---

## Frontend Console Logs

### 1. Offramp Execution
```
✅ Offramp executed: { payout: {...}, wallet: {...} }
```

### 2. Transaction Object Creation ✅ NEW
```
📝 Creating transaction object: {
  payoutId: "xxx",
  beneficiaryId: "xxx",
  bankAccount: {
    id: "xxx",
    bankName: "PalmPay",  // ← CHECK THIS!
    accountNumber: "1234567890",
    accountName: "Your Name"
  },
  amount: 1,
  nairaAmount: 1438.47
}
```

### 3. Transaction Object Created ✅ NEW
```
✅ Transaction object created: {
  id: "xxx",
  type: "offramp",
  crypto: "USDC",
  network: "Solana",
  amount: 1,
  nairaAmount: 1438.47,
  ...
}
```

### 4. Success Toast ✅ NEW
```
Toast: "₦1,439 sent to PalmPay (1234567890)!"
```
**🔍 ACTION:** Verify the bank name and account number match your selection!

### 5. Transaction History Loaded ✅ NEW
```
✅ Loaded transactions from backend: 10
📊 Transaction breakdown: {
  total: 10,
  deposits: 5,
  offramps: 5  // ← Should be > 0 if you have offramps
}
```

---

## Common Error Scenarios

### Error 1: "Failed to create quote record"

**Symptoms:**
- Offramp fails after crypto transfer
- Money is transferred but no payout record created
- Error message: "Failed to create quote record"

**Debugging:**
1. Check backend logs for quote creation error
2. Look for `errorDetails` in the log
3. Common causes:
   - Missing required fields in `quotes` table
   - Invalid data types (e.g., string instead of number)
   - Database constraint violations

**Fix:**
- Check Supabase `quotes` table schema
- Ensure all required fields are present
- Verify data types match schema

### Error 2: "Failed to create payout record"

**Symptoms:**
- Offramp fails after NGN wallet credit
- Money is in wallet but no payout record
- Error message: "Failed to create payout record"

**Debugging:**
1. Check backend logs for payout creation error
2. Look for `errorDetails` in the log
3. Common causes:
   - Missing `quote_id` (quote creation failed)
   - Invalid `beneficiary_id`
   - Missing required fields in `payouts` table

**Fix:**
- Verify quote was created successfully
- Check beneficiary ID is valid
- Check Supabase `payouts` table schema

### Error 3: Wrong Bank Account Selected

**Symptoms:**
- Money goes to wrong bank account
- Expected PalmPay but went to UBA

**Debugging:**
1. Check backend log for "✅ Selected bank account verified"
2. Verify `bankName` matches your selection
3. Check frontend console for "📝 Creating transaction object"
4. Verify `bankAccount.bankName` matches your selection

**Fix:**
- Check frontend bank selection dropdown
- Verify `selectedBank` state is correct
- Add confirmation modal before offramp

### Error 4: Offramps Not Showing in History

**Symptoms:**
- Offramp executed successfully
- Money transferred
- But transaction doesn't appear in history

**Debugging:**
1. Check backend logs for "Fetched payouts for user"
2. Verify `payoutsCount > 0`
3. Check frontend console for "📊 Transaction breakdown"
4. Verify `offramps > 0`

**Possible Causes:**
- Payout record not created (check Error 2)
- Quote record not created (check Error 1)
- Transaction API not fetching payouts correctly
- Frontend filtering out offramps

**Fix:**
- Verify payout record exists in Supabase `payouts` table
- Verify quote record exists in Supabase `quotes` table
- Check transaction API query
- Check frontend transaction filtering logic

---

## Step-by-Step Debugging Process

### Step 1: Execute Test Offramp
1. Open browser console (F12)
2. Open Render logs in another tab
3. Execute a small offramp (1 USDC)
4. Watch both logs simultaneously

### Step 2: Verify Bank Account Selection
**In backend logs, find:**
```
✅ Selected bank account verified
  bankName: "PalmPay"  // ← Does this match your selection?
```

**In frontend console, find:**
```
📝 Creating transaction object:
  bankAccount: {
    bankName: "PalmPay"  // ← Does this match?
  }
```

**In toast notification:**
```
"₦1,439 sent to PalmPay (1234567890)!"
```

**🔍 If any of these don't match, you have a beneficiary selection bug!**

### Step 3: Verify Quote Creation
**In backend logs, find:**
```
Creating quote record...
✅ Quote record created successfully
  quoteId: "xxx"
```

**🔍 If you see "Failed to create quote record", check the error details!**

### Step 4: Verify Payout Creation
**In backend logs, find:**
```
Creating payout record...
✅ Payout record created successfully
  payoutId: "xxx"
```

**🔍 If you see "Failed to create payout record", check the error details!**

### Step 5: Verify Transaction History
**In backend logs, find:**
```
Fetched payouts for user
  payoutsCount: 5  // ← Should be > 0
```

**In frontend console, find:**
```
📊 Transaction breakdown:
  offramps: 5  // ← Should match backend count
```

**🔍 If offramps count is 0, check if payout records exist in database!**

### Step 6: Check Database Directly
1. Open Supabase dashboard
2. Go to Table Editor
3. Check `payouts` table:
   - Filter by `user_id`
   - Verify records exist
   - Check `status` field
4. Check `quotes` table:
   - Verify quote records exist
   - Check if `is_used = true`

---

## Quick Fixes

### Fix 1: Clear Invalid Bread Wallet IDs
If you see "Stored Bread wallet does not exist on Bread":
```sql
UPDATE bank_accounts
SET bread_wallet_id = NULL
WHERE user_id = 'your-user-id';
```

### Fix 2: Reset Payout Status
If payout is stuck in "processing":
```sql
UPDATE payouts
SET status = 'completed'
WHERE id = 'payout-id';
```

### Fix 3: Mark Quote as Unused
If quote is stuck as "used":
```sql
UPDATE quotes
SET is_used = false, used_at = NULL
WHERE id = 'quote-id';
```

---

## Success Indicators

✅ **Offramp Successful If:**
1. Backend logs show "✅ Payout record created successfully"
2. Frontend console shows "✅ Transaction object created"
3. Toast shows correct bank name and account number
4. Transaction appears in history with type "offramp"
5. Money arrives in correct bank account

❌ **Offramp Failed If:**
- Any step shows "Failed to create..." error
- Wrong bank account in logs
- Transaction doesn't appear in history
- Money doesn't arrive in bank account

