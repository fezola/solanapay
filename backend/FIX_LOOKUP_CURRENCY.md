# 🐛 BUG FOUND: Missing `currency` field in `/lookup` API call

## The Problem

The Bread API `/lookup` endpoint requires a `currency` field, but our code is NOT sending it!

**File:** `backend/src/services/bread/offramp.ts`  
**Line:** 181-184

### Current Code (BROKEN):
```typescript
const response = await this.client.post<any>('/lookup', {
  bank_code: bankCode,
  account_number: accountNumber,
});
```

### Fixed Code:
```typescript
const response = await this.client.post<any>('/lookup', {
  currency: 'NGN',  // ← ADD THIS!
  bank_code: bankCode,
  account_number: accountNumber,
});
```

## How to Fix

1. Open `backend/src/services/bread/offramp.ts`
2. Find line 181 (the `/lookup` API call)
3. Add `currency: 'NGN',` to the request payload
4. Save the file
5. Run `npm run build` in the backend folder
6. Commit and push to trigger Render deployment

## Test Results

✅ **TESTED AND WORKING!** The complete flow works when `currency` is included:
- Identity creation: ✅ Works
- Account lookup WITH currency: ✅ Works  
- Beneficiary creation: ✅ Works

❌ **WITHOUT currency field:** Returns 400 error: `"currency" is required`

## Next Steps

After fixing this, the beneficiary creation should work end-to-end!

