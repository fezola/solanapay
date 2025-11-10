# Gas Fee Sponsorship System - Complete Guide

## Overview

The gas sponsorship system allows the platform to pay Solana gas fees for user transactions. Users don't need to hold SOL - we handle it!

**Benefits:**
- ✅ Better UX - users don't need SOL for gas
- ✅ Simpler onboarding - only need USDC
- ✅ Full amount converted - no gas deductions
- ✅ Tracked and monitored - all fees logged

---

## 🎯 How It Works

### **Current Flow (Without Gas Sponsorship):**
1. User has 10 USDC
2. User needs ~0.000005 SOL for gas
3. User must buy SOL first
4. User pays gas from their SOL
5. User converts 10 USDC to NGN

### **New Flow (With Gas Sponsorship):**
1. User has 10 USDC
2. User initiates offramp
3. **Platform pays gas fee** (~0.000005 SOL)
4. User's full 10 USDC is converted to NGN
5. Gas fee logged and tracked

---

## 💰 Wallet Setup

### **Same Wallet for Both:**
The referral funding wallet is used for:
1. **Referral rewards** - $0.70 per referral (paid in USDC)
2. **Gas fees** - ~0.000005 SOL per transaction

### **Current Wallet:**
```
Address: CB7GgQd7nYJmXiVvHRRNsMX2bUYn6Z3roBgLg2DrZdGG
USDC Balance: $30.00 (for referrals)
SOL Balance: 0 SOL (need to add for gas!)
```

### **⚠️ IMPORTANT: Add SOL for Gas Fees**

You need to send some SOL to the wallet for gas fees:

**Recommended:** Send **0.1 SOL** (~$20-30 depending on SOL price)

This will cover approximately **20,000 transactions** (0.1 SOL / 0.000005 SOL per tx)

**How to add SOL:**
1. Buy SOL on Coinbase/Binance/Kraken
2. Withdraw to Solana network
3. Send to: `CB7GgQd7nYJmXiVvHRRNsMX2bUYn6Z3roBgLg2DrZdGG`

---

## 🔧 Implementation

### **1. Gas Sponsor Service**

Location: `backend/src/services/gas-sponsor/index.ts`

**Key Functions:**
```typescript
// Get the sponsor wallet
await gasSponsorService.getGasSponsorWallet();

// Check if wallet has enough SOL
await gasSponsorService.checkGasSponsorBalance();

// Sponsor a transaction
await gasSponsorService.sponsorTransaction(transaction, userPublicKey);

// Get stats
await gasSponsorService.getGasSponsorshipStats();
```

### **2. Database Tracking**

Table: `gas_fees_sponsored`

Tracks:
- User ID
- Transaction signature
- Fee amount (in lamports and USD)
- Transaction type (offramp, deposit, etc.)
- Sponsor wallet address
- Timestamp

### **3. Integration Example**

Here's how to use it in your offramp flow:

```typescript
import { gasSponsorService } from '../services/gas-sponsor/index.js';
import { Transaction } from '@solana/web3.js';

// In your offramp handler:
async function handleOfframp(userId: string, amount: number) {
  // 1. Create the transaction (USDC transfer, etc.)
  const transaction = new Transaction();
  // ... add instructions ...
  
  // 2. Sponsor the transaction (platform pays gas)
  const signature = await gasSponsorService.sponsorTransaction(
    transaction,
    userPublicKey
  );
  
  if (!signature) {
    throw new Error('Failed to sponsor transaction');
  }
  
  // 3. Transaction is confirmed, user's full USDC amount is converted
  return signature;
}
```

---

## 📊 Monitoring

### **Check Wallet Balance:**

```typescript
const stats = await gasSponsorService.getGasSponsorshipStats();

console.log(stats);
// {
//   walletAddress: 'CB7GgQd7nYJmXiVvHRRNsMX2bUYn6Z3roBgLg2DrZdGG',
//   solBalance: 0.1,
//   hasEnoughForGas: true,
//   estimatedTransactionsRemaining: 20000
// }
```

### **View Gas Fees Sponsored:**

```sql
-- Total gas fees sponsored (last 30 days)
SELECT * FROM get_gas_fee_stats();

-- User's gas fee history
SELECT * FROM get_user_gas_fees('user-id-here');

-- All gas fees
SELECT 
  user_id,
  transaction_signature,
  fee_amount_usd,
  transaction_type,
  created_at
FROM gas_fees_sponsored
ORDER BY created_at DESC
LIMIT 100;
```

---

## 💡 Cost Analysis

### **Gas Fee Costs:**

| Metric | Value |
|--------|-------|
| Average Solana gas fee | ~0.000005 SOL |
| SOL price (example) | $200 |
| Cost per transaction | ~$0.001 |
| 0.1 SOL covers | ~20,000 transactions |
| Monthly cost (1000 tx/month) | ~$1 |

### **Wallet Capacity:**

**Current Setup:**
- USDC: $30 → ~42 referrals
- SOL: 0 → **Need to add!**

**Recommended:**
- USDC: $50-100 for referrals
- SOL: 0.1-0.5 for gas fees

---

## 🚨 Alerts & Thresholds

### **Low Balance Alerts:**

**SOL Balance:**
- ⚠️ Warning: < 0.01 SOL (~2,000 transactions remaining)
- 🚨 Critical: < 0.005 SOL (~1,000 transactions remaining)

**USDC Balance:**
- ⚠️ Warning: < $10 (~14 referrals remaining)
- 🚨 Critical: < $5 (~7 referrals remaining)

### **Monitoring Query:**

```sql
-- Check both balances
SELECT 
  wallet_address,
  current_balance_usd AS usdc_balance,
  estimated_referrals_remaining,
  (current_balance_usd < 10) AS usdc_low_balance_alert
FROM check_funding_wallet_balance();

-- Check SOL balance (run in backend)
const stats = await gasSponsorService.getGasSponsorshipStats();
if (!stats.hasEnoughForGas) {
  console.error('🚨 SOL balance too low!');
}
```

---

## 🔐 Security

### **Encryption:**
- Private key encrypted with AES-256-GCM
- Encryption key stored in environment variable
- Never exposed to frontend

### **Access Control:**
- Only backend can access private key
- RLS policies protect gas fee data
- Users can only see their own sponsored fees

---

## 📋 Setup Checklist

Before enabling gas sponsorship:

- [x] Wallet generated (`CB7GgQd7nYJmXiVvHRRNsMX2bUYn6Z3roBgLg2DrZdGG`)
- [x] USDC funded ($30)
- [ ] **SOL funded (0.1 SOL recommended)**
- [x] Encryption key in `.env`
- [x] Database tables created
- [x] Gas sponsor service implemented
- [ ] Integration in offramp flow
- [ ] Monitoring dashboard setup

---

## 🎯 Next Steps

### **1. Fund Wallet with SOL**
```bash
# Send 0.1 SOL to:
CB7GgQd7nYJmXiVvHRRNsMX2bUYn6Z3roBgLg2DrZdGG
```

### **2. Verify SOL Balance**
```typescript
const stats = await gasSponsorService.getGasSponsorshipStats();
console.log('SOL Balance:', stats.solBalance);
console.log('Can sponsor gas:', stats.hasEnoughForGas);
```

### **3. Integrate in Offramp Flow**
Update your offramp handler to use `gasSponsorService.sponsorTransaction()`

### **4. Test**
- Create test offramp transaction
- Verify gas is sponsored
- Check `gas_fees_sponsored` table

---

## 🆘 Troubleshooting

### **Error: "WALLET_ENCRYPTION_KEY not configured"**
**Solution:** Add encryption key to `.env` file

### **Error: "Gas sponsor wallet has insufficient SOL balance"**
**Solution:** Send more SOL to the wallet

### **Error: "Failed to get gas sponsor wallet"**
**Solution:** Check database has encrypted private key

### **Transaction fails**
**Solution:** 
1. Check SOL balance
2. Check Solana RPC endpoint
3. Verify wallet has signing permissions

---

## 📞 Support

For issues:
1. Check wallet SOL balance
2. Review `gas_fees_sponsored` table
3. Check backend logs for errors
4. Verify encryption key is correct

---

**Ready to enable gas sponsorship?**

1. ✅ Send 0.1 SOL to `CB7GgQd7nYJmXiVvHRRNsMX2bUYn6Z3roBgLg2DrZdGG`
2. ✅ Verify with `gasSponsorService.getGasSponsorshipStats()`
3. ✅ Integrate in offramp flow
4. ✅ Test and monitor!

