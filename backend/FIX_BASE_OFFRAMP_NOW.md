# 🚨 URGENT: Fix Base Offramp Error NOW

## The Problem

Your users are getting this error when trying to offramp Base USDC/USDT:

```
Error: could not decode result data (ENS resolver error)
```

**Root Cause**: The database has **Solana addresses** stored for Base chain Bread wallets instead of **EVM addresses**.

Example from logs:
- ❌ Current: `EtBM6oyeYbgVhAcedWhxd6XnhfEpSisfMVUhCJxpDmzY` (Solana format)
- ✅ Should be: `0x1234567890abcdef...` (EVM format)

## The Fix (2 Minutes)

### Step 1: Wait for Deployment (1 minute)
- Code is already pushed to GitHub
- Render is deploying automatically
- Check: https://dashboard.render.com
- Wait for "Live" status

### Step 2: Run Migration via Browser (1 minute)

**DRY RUN (Preview - Safe)**:
```
https://solanapay-xmli.onrender.com/admin/migrate-base-wallets?dry_run=true
```

This will show you what will be changed WITHOUT making any changes.

**APPLY CHANGES (Fix the issue)**:
```
https://solanapay-xmli.onrender.com/admin/migrate-base-wallets?dry_run=false
```

This will:
1. Create new Bread wallets with correct EVM addresses
2. Update database with new wallet IDs and addresses
3. Fix all 6 users with Base deposits

### Step 3: Test Offramp
- Try off-ramping Base USDC or USDT
- Should work without ENS resolver error
- Should show correct exchange rate (not 1600)

## What the Migration Does

**Safe Operations**:
- ✅ Creates new Bread wallets via Bread API
- ✅ Updates `bread_wallet_id` in database
- ✅ Updates `bread_wallet_address` in database
- ✅ User funds remain in their deposit wallets (untouched)
- ✅ Private keys unchanged
- ✅ Can be re-run safely if needed

**Does NOT**:
- ❌ Touch user funds
- ❌ Move any crypto
- ❌ Change private keys
- ❌ Delete anything

## Expected Output

### Dry Run Response:
```json
{
  "mode": "DRY_RUN",
  "usersFound": 6,
  "usersProcessed": 6,
  "results": [
    {
      "userId": "6487af16-14e0-46b1-af5f-00af960123a8",
      "assets": ["USDC", "USDT"],
      "depositAddress": "0x9B627b77F9f99d3946A20829dcF182D708A83dbB",
      "oldBreadWalletId": "6920dcab5908e7571e4a78f6",
      "oldBreadAddress": "EtBM6oyeYbgVhAcedWhxd6XnhfEpSisfMVUhCJxpDmzY",
      "action": "DRY_RUN - Would create new Bread wallet"
    },
    ...
  ],
  "message": "Dry run complete. Call with ?dry_run=false to apply changes."
}
```

### Live Run Response:
```json
{
  "mode": "LIVE",
  "usersFound": 6,
  "usersProcessed": 6,
  "results": [
    {
      "userId": "6487af16-14e0-46b1-af5f-00af960123a8",
      "assets": ["USDC", "USDT"],
      "depositAddress": "0x9B627b77F9f99d3946A20829dcF182D708A83dbB",
      "oldBreadWalletId": "6920dcab5908e7571e4a78f6",
      "oldBreadAddress": "EtBM6oyeYbgVhAcedWhxd6XnhfEpSisfMVUhCJxpDmzY",
      "newBreadWalletId": "692abc123def456789",
      "newBreadAddress": "0x1234567890abcdef1234567890abcdef12345678",
      "network": "evm",
      "action": "SUCCESS",
      "assetsUpdated": 2
    },
    ...
  ],
  "message": "Migration complete! Users can now offramp on Base chain."
}
```

## Verification

After running the migration, verify in database:

```sql
SELECT user_id, asset_symbol, bread_wallet_address
FROM deposit_addresses
WHERE network = 'base';
```

All `bread_wallet_address` should now start with `0x` (EVM format).

## Troubleshooting

**Error: "Unauthorized" or "Forbidden"**
- You need to be logged in as admin (fezola004@gmail.com)
- The endpoint uses admin middleware

**Error: "Failed to create Bread wallet"**
- Check Bread API key is configured in Render environment variables
- Check Render logs for detailed error

**Error: "No Base chain addresses found"**
- All users already fixed
- Or no users have Base deposits

## Timeline

1. **Now**: Code deployed to GitHub
2. **1 minute**: Render finishes deployment
3. **2 minutes**: You run dry run to preview
4. **3 minutes**: You run live migration
5. **4 minutes**: Users can offramp successfully

## Summary

**The Issue**: Database has wrong address format (Solana instead of EVM)

**The Fix**: Call migration endpoint via browser

**The Result**: Base offramp works perfectly

**User Impact**: 6 existing users fixed, all future users work automatically

---

## Quick Commands

**Preview (Safe)**:
```
https://solanapay-xmli.onrender.com/admin/migrate-base-wallets?dry_run=true
```

**Fix (Apply)**:
```
https://solanapay-xmli.onrender.com/admin/migrate-base-wallets?dry_run=false
```

**That's it!** 🎉

