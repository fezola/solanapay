# 🔧 Fix Base Bread Wallet Addresses - Migration Guide

## 🚨 Problem

Users with Base chain assets (USDC, USDT) have **incorrect Bread wallet addresses** stored in the database:
- The database stores **Solana (SVM) addresses** instead of **EVM addresses**
- This causes offramp to fail with ENS resolver errors
- Example error: `could not decode result data (value="0x", info={ "method": "resolver", "signature": "resolver(bytes32)" }`

## ✅ Solution

This migration script safely fixes the `bread_wallet_address` field for Base chain deposits by:
1. Fetching the correct EVM address from Bread API
2. Updating only the `bread_wallet_address` field in the database
3. **NOT touching user funds or private keys** (funds remain safe in deposit wallets)

## 🔒 Safety Features

- **Dry run by default**: Shows what will change without making changes
- **Read-only first**: Fetches data from Bread API before any updates
- **User funds untouched**: Only updates the Bread wallet address field
- **Detailed logging**: Shows exactly what will be changed

## 📋 Prerequisites

Make sure your `.env` file has:
```bash
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
BREAD_API_KEY=your_bread_api_key
```

## 🚀 Usage

### Step 1: Dry Run (Safe - No Changes)

First, run in dry-run mode to see what will be changed:

```bash
cd backend
node fix-base-bread-wallet-addresses.js
```

This will:
- ✅ Show all Base chain deposit addresses
- ✅ Fetch correct EVM addresses from Bread API
- ✅ Display what will be updated
- ❌ **NOT make any changes to the database**

### Step 2: Review the Output

The script will show something like:

```
📊 SUMMARY: Found 2 address(es) that need fixing

The following addresses will be updated:

1. User: abc123 | Asset: USDC
   FROM: EtBM6oyeYbgVhAcedWhxd6XnhfEpSisfMVUhCJxpDmzY (SVM - WRONG)
   TO:   0x1234567890abcdef1234567890abcdef12345678 (EVM - CORRECT)

2. User: abc123 | Asset: USDT
   FROM: EtBM6oyeYbgVhAcedWhxd6XnhfEpSisfMVUhCJxpDmzY (SVM - WRONG)
   TO:   0x1234567890abcdef1234567890abcdef12345678 (EVM - CORRECT)
```

### Step 3: Apply Changes (Live Mode)

If the dry run looks correct, apply the changes:

```bash
node fix-base-bread-wallet-addresses.js --apply
```

This will:
- ✅ Update the `bread_wallet_address` field for Base chain deposits
- ✅ Show confirmation for each update
- ✅ Keep user funds safe in their deposit wallets

## 🔍 Verification

After running the migration:

1. **Check the database**:
   ```sql
   SELECT user_id, network, asset_symbol, bread_wallet_address
   FROM deposit_addresses
   WHERE network = 'base';
   ```
   - Base addresses should now start with `0x` (EVM format)
   - NOT Solana addresses (base58 format)

2. **Test offramp**:
   - Try off-ramping USDT on Base
   - Should no longer get ENS resolver errors
   - Should use correct exchange rate (not 1600 fallback)

## 📊 What Gets Updated

| Field | Before | After |
|-------|--------|-------|
| `bread_wallet_address` | `EtBM6oyeYbgVhAcedWhxd6XnhfEpSisfMVUhCJxpDmzY` (SVM) | `0x1234...5678` (EVM) |

## ❌ What Does NOT Get Updated

- ✅ User deposit wallet addresses (unchanged)
- ✅ Private keys (unchanged)
- ✅ User funds (remain in deposit wallets)
- ✅ Bread wallet IDs (unchanged)
- ✅ Other chains (Solana, Polygon, etc.)

## 🛡️ Rollback

If something goes wrong, you can manually revert by:

1. Finding the old address from the dry run output
2. Running:
   ```sql
   UPDATE deposit_addresses
   SET bread_wallet_address = 'old_address'
   WHERE network = 'base' AND user_id = 'user_id';
   ```

## 📝 Notes

- This migration only affects **Base chain** deposits
- Solana deposits are unaffected (they already use SVM addresses correctly)
- The fix also includes adding USDT support for Base chain transfers
- After this migration, new wallets will automatically use the correct address format

## 🐛 Troubleshooting

**Error: "Could not fetch wallet details from Bread API"**
- Check that `BREAD_API_KEY` is correct
- Verify the Bread wallet ID exists in Bread's system

**Error: "No EVM address available from Bread API"**
- The Bread wallet might not have an EVM address
- Contact Bread support or recreate the wallet

**No addresses found to fix**
- All addresses are already correct
- Or no Base chain deposits exist yet

