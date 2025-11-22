# 🚀 Run Migration on Render Production Server

## Overview

The migration script `recreate-base-bread-wallets-safe.js` needs to be run on the **Render production server** because:
- It requires the production Bread API key (stored in Render environment variables)
- Local API key doesn't have permission to create wallets

## Steps to Run Migration on Render

### Option 1: Using Render Shell (Recommended)

1. **Go to Render Dashboard**:
   - Navigate to https://dashboard.render.com
   - Select your backend service (`solanapay-xmli` or similar)

2. **Open Shell**:
   - Click on the "Shell" tab in the left sidebar
   - This opens a terminal connected to your production server

3. **Run Dry Run First** (Safe):
   ```bash
   cd /opt/render/project/src/backend
   node recreate-base-bread-wallets-safe.js
   ```
   
   This will show you what will be changed WITHOUT making any changes.

4. **Review the Output**:
   - Check that it found the correct users
   - Verify the old addresses are Solana format (wrong)
   - Confirm it will create new Bread wallets

5. **Apply Changes**:
   ```bash
   node recreate-base-bread-wallets-safe.js --apply
   ```
   
   This will:
   - Create new Bread wallets for each user's Base chain
   - Update `bread_wallet_id` and `bread_wallet_address` in database
   - User funds remain safe in their deposit wallets

### Option 2: Using Render API (Advanced)

If Shell is not available, you can trigger it via a one-time job:

1. Create a one-time job in Render dashboard
2. Set command: `node backend/recreate-base-bread-wallets-safe.js --apply`
3. Run the job

## Expected Output

### Dry Run Output:
```
🔧 SAFE SCRIPT: Recreate Bread Wallets for Base Chain
============================================================
Mode: 🔒 DRY RUN (no changes)

📋 Step 1: Finding users with Base chain deposits...

Found 6 user(s) with Base chain deposits

👤 Processing user: 6487af16-14e0-46b1-af5f-00af960123a8
   Found 2 Base asset(s): USDC, USDT
   Deposit Address: 0x9B627b77F9f99d3946A20829dcF182D708A83dbB
   Old Bread Wallet ID: 6920dcab5908e7571e4a78f6
   Old Bread Address: EtBM6oyeYbgVhAcedWhxd6XnhfEpSisfMVUhCJxpDmzY
   🔒 DRY RUN: Would create new Bread wallet for Base

...

📊 SUMMARY: 6 user(s) processed

🔒 DRY RUN MODE: No changes were made.
💡 To apply these changes, run: node recreate-base-bread-wallets-safe.js --apply
```

### Live Run Output:
```
🔧 SAFE SCRIPT: Recreate Bread Wallets for Base Chain
============================================================
Mode: ✍️  LIVE (will update database)

👤 Processing user: 6487af16-14e0-46b1-af5f-00af960123a8
   Found 2 Base asset(s): USDC, USDT
   Deposit Address: 0x9B627b77F9f99d3946A20829dcF182D708A83dbB
   Old Bread Wallet ID: 6920dcab5908e7571e4a78f6
   Old Bread Address: EtBM6oyeYbgVhAcedWhxd6XnhfEpSisfMVUhCJxpDmzY
   🔨 Creating new Bread wallet for Base...
   ✅ New Bread Wallet Created:
      Wallet ID: 692abc123def456789
      EVM Address: 0x1234567890abcdef1234567890abcdef12345678
      Network: evm
   ✅ Database updated for 2 asset(s)

...

✅ Migration complete!
```

## Verification After Migration

1. **Check Database**:
   ```sql
   SELECT user_id, asset_symbol, bread_wallet_address
   FROM deposit_addresses
   WHERE network = 'base';
   ```
   
   All `bread_wallet_address` should now start with `0x` (EVM format)

2. **Test Offramp**:
   - Try off-ramping USDT on Base
   - Should work with correct exchange rate
   - No more ENS resolver errors

## Safety Notes

✅ **User funds are safe**:
- Migration only updates `bread_wallet_id` and `bread_wallet_address`
- User deposit wallets remain unchanged
- Private keys remain unchanged
- Funds stay in user's deposit wallets

✅ **New users**:
- New users will automatically get correct Bread wallet addresses
- No migration needed for new users

## Troubleshooting

**Error: "Missing authorization key"**
- You're running on local machine, not production
- Must run on Render server where BREAD_API_KEY is configured

**Error: "No users found"**
- All users already have correct addresses
- Or no Base chain deposits exist

**Error: "Failed to create Bread wallet"**
- Check Bread API key is valid
- Check Bread API is accessible from Render
- Contact Bread support if issue persists

## Alternative: Manual Fix for Specific User

If you need to fix a specific user manually:

```bash
# On Render Shell
node -e "
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function fixUser(userId) {
  // Create new Bread wallet
  const response = await axios.post(
    'https://processor-prod.up.railway.app/wallet',
    { reference: \`wallet_\${userId}_base_\${Date.now()}\` },
    { headers: { 'Authorization': \`Bearer \${process.env.BREAD_API_KEY}\` } }
  );
  
  const walletId = response.data.data.wallet_id;
  const evmAddress = response.data.data.address.evm;
  
  // Update database
  await supabase
    .from('deposit_addresses')
    .update({
      bread_wallet_id: walletId,
      bread_wallet_address: evmAddress,
      bread_synced_at: new Date().toISOString()
    })
    .eq('user_id', userId)
    .eq('network', 'base');
  
  console.log('✅ Fixed user:', userId);
  console.log('   Wallet ID:', walletId);
  console.log('   Address:', evmAddress);
}

fixUser('USER_ID_HERE').then(() => process.exit(0));
"
```

Replace `USER_ID_HERE` with the actual user ID.

