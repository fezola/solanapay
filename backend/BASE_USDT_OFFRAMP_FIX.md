# 🔧 Base USDT Offramp Fix - Complete Solution

## 🚨 Issues Identified

### Issue 1: Wrong Bread Wallet Address Format
**Problem**: Base chain deposits were storing **Solana (SVM) addresses** instead of **EVM addresses**

**Error**:
```
Error: could not decode result data (value="0x", info={ "method": "resolver", "signature": "resolver(bytes32)" }, code=BAD_DATA, version=6.15.0)
```

**Root Cause**: 
- `wallet.ts` was extracting addresses in wrong order: `svm || evm`
- For Base wallets, it grabbed the SVM address first
- ERC20 transfer tried to send to Solana address → ENS resolver error

**Example**:
- ❌ **Wrong**: `EtBM6oyeYbgVhAcedWhxd6XnhfEpSisfMVUhCJxpDmzY` (Solana address)
- ✅ **Correct**: `0x1234567890abcdef1234567890abcdef12345678` (EVM address)

### Issue 2: USDT/Base Using Fallback Price (1600)
**Problem**: USDT on Base was using fallback rate of 1600 instead of real Bread Africa rate

**Root Cause**:
- `transfer.ts` was missing USDT contract address for Base chain
- Transfer failed → Rate fetch failed → Fallback to 1600

**Missing**:
```javascript
base: {
  USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
  // USDT was missing!
}
```

## ✅ Fixes Applied

### Fix 1: Correct Address Extraction in `wallet.ts`

**File**: `backend/src/services/bread/wallet.ts`

**Changes**:
1. In `createWallet()` method (lines 98-120):
   ```javascript
   // OLD (WRONG):
   const address = walletData.address?.svm || walletData.address?.evm || walletData.address;
   
   // NEW (CORRECT):
   let address: string;
   if (network === 'svm') {
     address = walletData.address?.svm || walletData.address;
   } else if (network === 'evm') {
     address = walletData.address?.evm || walletData.address;
   } else {
     address = walletData.address?.svm || walletData.address?.evm || walletData.address;
   }
   ```

2. In `getWallet()` method (lines 144-193):
   - Same fix applied for consistency

**Result**: New wallets will automatically get the correct address format

### Fix 2: Add USDT Contract for Base Chain

**File**: `backend/src/services/transfer.ts`

**Changes** (lines 30-39):
```javascript
const EVM_TOKEN_ADDRESSES: Record<string, Record<string, string>> = {
  base: {
    USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    USDT: '0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2', // ✅ ADDED
  },
  // ... other chains
};
```

**Result**: USDT transfers on Base now work correctly

### Fix 3: Safe Migration Script for Existing Users

**File**: `backend/fix-base-bread-wallet-addresses.js`

**Purpose**: Fix existing database records without touching user funds

**Features**:
- ✅ Dry run by default (safe)
- ✅ Fetches correct EVM address from Bread API
- ✅ Updates only `bread_wallet_address` field
- ✅ Does NOT touch user funds or private keys
- ✅ Detailed logging and verification

**Usage**:
```bash
# Step 1: Dry run (see what will change)
node fix-base-bread-wallet-addresses.js

# Step 2: Apply changes
node fix-base-bread-wallet-addresses.js --apply
```

## 🔄 Migration Steps

### For Production Deployment:

1. **Deploy Code Changes**:
   ```bash
   git add backend/src/services/bread/wallet.ts
   git add backend/src/services/transfer.ts
   git commit -m "Fix Base wallet address extraction and add USDT support"
   git push
   ```

2. **Run Migration Script** (on production server):
   ```bash
   cd backend
   
   # Dry run first
   node fix-base-bread-wallet-addresses.js
   
   # Review output, then apply
   node fix-base-bread-wallet-addresses.js --apply
   ```

3. **Verify**:
   - Check database: Base addresses should start with `0x`
   - Test USDT/Base offramp
   - Verify correct exchange rate is used (not 1600)

## 🛡️ Safety Guarantees

### User Funds Are Safe ✅
- Migration only updates `bread_wallet_address` field
- User deposit wallets remain unchanged
- Private keys remain unchanged
- Funds stay in user's deposit wallets

### What Gets Updated
| Field | Before | After |
|-------|--------|-------|
| `bread_wallet_address` | `EtBM6...pDmzY` (SVM) | `0x1234...5678` (EVM) |

### What Does NOT Get Updated
- ❌ User deposit addresses
- ❌ Private keys
- ❌ User balances
- ❌ Bread wallet IDs
- ❌ Solana/Polygon deposits

## 🧪 Testing

### Test Case 1: USDT/Base Offramp
1. User has USDT on Base chain
2. Initiate offramp
3. **Expected**: 
   - ✅ Correct exchange rate (from Bread API, not 1600)
   - ✅ Transfer to correct EVM address
   - ✅ No ENS resolver errors
   - ✅ Successful offramp

### Test Case 2: USDC/Base Offramp
1. User has USDC on Base chain
2. Initiate offramp
3. **Expected**:
   - ✅ Works as before (USDC was already working)

### Test Case 3: Solana Assets
1. User has USDC/USDT/SOL on Solana
2. Initiate offramp
3. **Expected**:
   - ✅ Unaffected by changes
   - ✅ Still uses SVM addresses correctly

## 📊 Verification Queries

```sql
-- Check Base addresses are now EVM format
SELECT user_id, asset_symbol, bread_wallet_address
FROM deposit_addresses
WHERE network = 'base';
-- Should return addresses starting with 0x

-- Check Solana addresses are still SVM format
SELECT user_id, asset_symbol, bread_wallet_address
FROM deposit_addresses
WHERE network = 'solana';
-- Should return base58 addresses (not 0x)
```

## 🎯 Expected Outcomes

After applying all fixes:

1. ✅ **USDT/Base offramp works** with correct pricing
2. ✅ **No more ENS resolver errors** for Base chain
3. ✅ **Correct exchange rates** from Bread Africa API
4. ✅ **User funds remain safe** in deposit wallets
5. ✅ **New wallets automatically use correct format**
6. ✅ **Existing wallets fixed via migration script**

## 📝 Files Changed

1. `backend/src/services/bread/wallet.ts` - Fixed address extraction
2. `backend/src/services/transfer.ts` - Added USDT/Base support
3. `backend/fix-base-bread-wallet-addresses.js` - Migration script
4. `backend/FIX_BASE_WALLET_ADDRESSES.md` - Migration guide
5. `backend/BASE_USDT_OFFRAMP_FIX.md` - This summary

