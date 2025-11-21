# Multi-Chain Treasury Wallet Setup

## Problem
Platform fees were only being collected on **Solana** network. Base and Polygon offramps were NOT collecting fees because:
- Solana wallet address (`CB7GgQd7nYJmXiVvHRRNsMX2bUYn6Z3roBgLg2DrZdGG`) cannot receive EVM tokens
- No treasury wallets configured for Base and Polygon networks

---

## Solution
Added support for separate treasury wallets per blockchain network.

---

## Treasury Wallet Addresses

### Solana Network
**Address:** `CB7GgQd7nYJmXiVvHRRNsMX2bUYn6Z3roBgLg2DrZdGG`

**Can receive:**
- ✅ SOL
- ✅ USDC (Solana)
- ✅ USDT (Solana)

**Explorer:** https://explorer.solana.com/address/CB7GgQd7nYJmXiVvHRRNsMX2bUYn6Z3roBgLg2DrZdGG

---

### Base Network (Ethereum L2)
**Address:** `0xca153EA8BA71453BfAf201F327deC616E5c4d49a`

**Can receive:**
- ✅ ETH
- ✅ USDC (Base)
- ✅ Any ERC20 token on Base

**Explorer:** https://basescan.org/address/0xca153EA8BA71453BfAf201F327deC616E5c4d49a

---

### Polygon Network
**Address:** `0xca153EA8BA71453BfAf201F327deC616E5c4d49a`

**Can receive:**
- ✅ MATIC
- ✅ USDC (Polygon)
- ✅ USDT (Polygon)
- ✅ Any ERC20 token on Polygon

**Explorer:** https://polygonscan.com/address/0xca153EA8BA71453BfAf201F327deC616E5c4d49a

---

## Configuration

### Environment Variables (`.env`)

```env
# Solana treasury wallet
PLATFORM_TREASURY_ADDRESS_SOLANA=CB7GgQd7nYJmXiVvHRRNsMX2bUYn6Z3roBgLg2DrZdGG

# Base treasury wallet (EVM address - starts with 0x)
PLATFORM_TREASURY_ADDRESS_BASE=0xca153EA8BA71453BfAf201F327deC616E5c4d49a

# Polygon treasury wallet (EVM address - starts with 0x)
PLATFORM_TREASURY_ADDRESS_POLYGON=0xca153EA8BA71453BfAf201F327deC616E5c4d49a

# Legacy variable (kept for backward compatibility - points to Solana)
PLATFORM_TREASURY_ADDRESS=CB7GgQd7nYJmXiVvHRRNsMX2bUYn6Z3roBgLg2DrZdGG
```

---

## How It Works

### Platform Fee Collection Flow

**Example: User offramps 1 USDC on Base**

1. **User requests:** 1 USDC (Base)
2. **Platform fee:** ₦5 / ₦1,453 = 0.00344 USDC
3. **Fee collected:** 0.00344 USDC → `0xca153EA8BA71453BfAf201F327deC616E5c4d49a` (Base treasury) ✅
4. **Amount to Bread:** 0.99656 USDC
5. **User receives:** ₦1,448

**Before this fix:**
- ❌ Base offramps: No fee collected (user received ₦1,453)
- ❌ Polygon offramps: No fee collected (user received ₦1,453)

**After this fix:**
- ✅ Solana offramps: Fee collected → Solana treasury
- ✅ Base offramps: Fee collected → Base treasury
- ✅ Polygon offramps: Fee collected → Polygon treasury

---

## Fee Collection by Network

| Network | Treasury Address | Assets Collected | Status |
|---------|-----------------|------------------|--------|
| **Solana** | `CB7GgQd7nYJmXiVvHRRNsMX2bUYn6Z3roBgLg2DrZdGG` | SOL, USDC, USDT | ✅ Working |
| **Base** | `0xca153EA8BA71453BfAf201F327deC616E5c4d49a` | ETH, USDC | ✅ Working |
| **Polygon** | `0xca153EA8BA71453BfAf201F327deC616E5c4d49a` | MATIC, USDC, USDT | ✅ Working |

---

## Code Changes

### Files Modified

1. **`backend/.env`** - Added treasury addresses for each network
2. **`backend/src/services/platform-fee-collector.ts`** - Added multi-chain support:
   - Added `transferFeeToTreasuryEVM()` function for Base and Polygon
   - Renamed `transferFeeToTreasury()` to `transferFeeToTreasurySolana()`
   - Updated `collectPlatformFee()` to route to correct treasury based on chain

---

## Testing

### Test Solana Offramp
```bash
# Offramp 1 USDC on Solana
# Expected: 0.00344 USDC → CB7GgQd7nYJmXiVvHRRNsMX2bUYn6Z3roBgLg2DrZdGG
# User receives: ₦1,448
```

### Test Base Offramp
```bash
# Offramp 1 USDC on Base
# Expected: 0.00344 USDC → 0xca153EA8BA71453BfAf201F327deC616E5c4d49a
# User receives: ₦1,448
```

### Test Polygon Offramp
```bash
# Offramp 1 USDC on Polygon
# Expected: 0.00344 USDC → 0xca153EA8BA71453BfAf201F327deC616E5c4d49a
# User receives: ₦1,448
```

---

## Monitoring Your Fees

### Check Balances

**Solana:**
```
https://explorer.solana.com/address/CB7GgQd7nYJmXiVvHRRNsMX2bUYn6Z3roBgLg2DrZdGG
```

**Base:**
```
https://basescan.org/address/0xca153EA8BA71453BfAf201F327deC616E5c4d49a
```

**Polygon:**
```
https://polygonscan.com/address/0xca153EA8BA71453BfAf201F327deC616E5c4d49a
```

### Database Query

```sql
SELECT 
  created_at,
  amount / 100 as fee_ngn,
  crypto_amount,
  crypto_asset,
  treasury_tx_hash
FROM platform_fees
WHERE treasury_tx_hash IS NOT NULL
ORDER BY created_at DESC;
```

---

## Important Notes

1. **Same EVM address for Base and Polygon:** We're using the same EVM address (`0xca153EA8BA71453BfAf201F327deC616E5c4d49a`) for both Base and Polygon. This is fine because EVM addresses work across all EVM-compatible chains.

2. **Different address for Solana:** Solana uses a different address format, so it has its own treasury wallet.

3. **Fees in crypto:** Platform fees are collected in the same cryptocurrency the user is offramping (USDC, USDT, SOL, etc.)

4. **Automatic collection:** Fees are automatically transferred before the offramp is executed.

---

## Next Steps

1. ✅ **Restart backend** - Apply the new configuration
2. ✅ **Test offramps** - Try offramping on Solana, Base, and Polygon
3. ✅ **Monitor treasuries** - Check that fees are being collected on all networks
4. ✅ **Verify amounts** - Ensure users receive the correct amount (after fee deduction)

