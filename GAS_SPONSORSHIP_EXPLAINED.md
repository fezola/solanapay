# Gas Sponsorship - When It's Used vs Not Used

## 🎯 **Quick Answer**

**Gas sponsorship is NOT used for Bread Africa offramps** because Bread handles the blockchain transactions on their end.

**Gas sponsorship IS used for:**
- Direct USDC deposits to user wallets
- Direct USDC withdrawals from user wallets
- Any future Solana transactions we add

---

## 📊 **Current SolPay Flow**

### **Offramp Flow (Bread Africa) - NO GAS SPONSORSHIP NEEDED**

```
User initiates offramp
    ↓
User sends USDC to Bread wallet address
    ↓
Bread receives USDC (Bread pays gas on their end)
    ↓
Bread converts USDC → NGN
    ↓
Bread sends NGN to user's bank account
    ↓
Done! ✅
```

**Why no gas sponsorship?**
- User sends USDC from their own wallet (they pay gas)
- Bread receives USDC in their wallet (Bread pays gas)
- We don't handle the blockchain transaction directly

---

## 🔧 **Where Gas Sponsorship WOULD Be Used**

### **Scenario 1: Direct Wallet Deposits (Future Feature)**

If we add a feature where users can deposit USDC directly to their SolPay wallet:

```typescript
// Example: User deposits USDC to their SolPay wallet
import { gasSponsorService } from '../services/gas-sponsor/index.js';
import { Transaction, SystemProgram } from '@solana/web3.js';

async function depositToUserWallet(userId: string, amount: number) {
  // Create transaction to transfer USDC to user's wallet
  const transaction = new Transaction();
  // ... add USDC transfer instructions ...
  
  // Platform sponsors the gas fee
  const signature = await gasSponsorService.sponsorTransaction(
    transaction,
    userPublicKey
  );
  
  return signature;
}
```

### **Scenario 2: Direct Wallet Withdrawals (Future Feature)**

If we add a feature where users can withdraw USDC from their SolPay wallet to another wallet:

```typescript
// Example: User withdraws USDC to external wallet
async function withdrawFromUserWallet(userId: string, toAddress: string, amount: number) {
  // Create transaction to transfer USDC from user's wallet to external address
  const transaction = new Transaction();
  // ... add USDC transfer instructions ...
  
  // Platform sponsors the gas fee
  const signature = await gasSponsorService.sponsorTransaction(
    transaction,
    userPublicKey
  );
  
  return signature;
}
```

### **Scenario 3: Referral Reward Payments (Future Enhancement)**

If we want to automatically send USDC referral rewards to users' wallets:

```typescript
// Example: Send referral reward to user's wallet
async function sendReferralReward(userId: string, amount: number) {
  // Create transaction to send USDC from referral wallet to user
  const transaction = new Transaction();
  // ... add USDC transfer instructions ...
  
  // Platform sponsors the gas fee
  const signature = await gasSponsorService.sponsorTransaction(
    transaction,
    userPublicKey
  );
  
  return signature;
}
```

---

## 💰 **Current Wallet Status**

### **Referral Funding Wallet:**
```
Address: CB7GgQd7nYJmXiVvHRRNsMX2bUYn6Z3roBgLg2DrZdGG

USDC Balance: $30.00
- Purpose: Referral rewards ($0.70 per referral)
- Capacity: ~42 referrals

SOL Balance: 0.14 SOL
- Purpose: Gas fees for future transactions
- Capacity: ~28,000 transactions
- Cost per transaction: ~0.000005 SOL (~$0.001)
```

---

## 🔍 **How to Check Gas Sponsor Status**

### **Backend API:**

```bash
# Check if gas sponsorship is available
GET /api/gas-sponsor/available

# Get detailed stats
GET /api/gas-sponsor/stats
```

### **Response Example:**

```json
{
  "success": true,
  "stats": {
    "walletAddress": "CB7GgQd7nYJmXiVvHRRNsMX2bUYn6Z3roBgLg2DrZdGG",
    "solBalance": 0.14,
    "hasEnoughForGas": true,
    "estimatedTransactionsRemaining": 28000
  }
}
```

### **In Code:**

```typescript
import { gasSponsorService } from './services/gas-sponsor/index.js';

// Check balance
const stats = await gasSponsorService.getGasSponsorshipStats();
console.log('SOL Balance:', stats.solBalance);
console.log('Can sponsor:', stats.hasEnoughForGas);
console.log('Transactions remaining:', stats.estimatedTransactionsRemaining);
```

---

## 📋 **Summary**

| Feature | Gas Sponsorship? | Why? |
|---------|------------------|------|
| **Bread Africa Offramp** | ❌ No | Bread handles blockchain transactions |
| **Direct USDC Deposits** | ✅ Yes | We handle the transaction |
| **Direct USDC Withdrawals** | ✅ Yes | We handle the transaction |
| **Referral Reward Payments** | ✅ Yes (future) | We handle the transaction |
| **Internal Transfers** | ✅ Yes (future) | We handle the transaction |

---

## 🎯 **Current Status**

✅ **Gas sponsorship system is ready and funded**
- Service implemented: `backend/src/services/gas-sponsor/index.ts`
- Database tracking: `gas_fees_sponsored` table
- API endpoints: `/api/gas-sponsor/*`
- Wallet funded: 0.14 SOL (~28,000 transactions)

✅ **Not currently used in production**
- Bread Africa handles offramp transactions
- No direct wallet features yet

✅ **Ready for future features**
- Can be integrated when we add direct wallet features
- Monitoring and tracking already in place

---

## 🚀 **Next Steps**

### **For Current Offramp Flow:**
- ✅ No changes needed
- ✅ Bread Africa handles everything
- ✅ Users pay their own gas when sending to Bread

### **For Future Features:**
When we add direct wallet features:
1. Import `gasSponsorService`
2. Create transaction
3. Call `sponsorTransaction()`
4. Transaction is confirmed with platform-paid gas

---

## 💡 **Example: Future Direct Deposit Feature**

```typescript
// backend/src/routes/deposits.ts

import { gasSponsorService } from '../services/gas-sponsor/index.js';

fastify.post('/direct', async (request, reply) => {
  const userId = request.userId!;
  const { amount, fromAddress } = request.body;
  
  // Create USDC transfer transaction
  const transaction = createUSDCTransfer(fromAddress, userWallet, amount);
  
  // Platform sponsors the gas fee
  const signature = await gasSponsorService.sponsorTransaction(
    transaction,
    fromAddress
  );
  
  // Log the sponsored gas fee
  await supabaseAdmin.rpc('log_gas_fee_sponsored', {
    p_user_id: userId,
    p_transaction_signature: signature,
    p_blockchain_network: 'solana',
    p_fee_amount_native: 5000, // ~0.000005 SOL in lamports
    p_fee_amount_usd: 0.001,
    p_transaction_type: 'deposit',
    p_sponsor_wallet_address: 'CB7GgQd7...',
  });
  
  return { success: true, signature };
});
```

---

## 🆘 **Troubleshooting**

### **"Why isn't gas sponsorship working for offramps?"**
**Answer:** It's not supposed to! Bread Africa handles offramp transactions. Gas sponsorship is for future direct wallet features.

### **"Do I need to add more SOL?"**
**Answer:** Not right now. 0.14 SOL is enough for ~28,000 transactions. Monitor it when we add direct wallet features.

### **"How do I monitor SOL balance?"**
**Answer:** 
```bash
GET /api/gas-sponsor/stats
```
Or check the wallet on Solana explorer: https://explorer.solana.com/address/CB7GgQd7nYJmXiVvHRRNsMX2bUYn6Z3roBgLg2DrZdGG

---

**TL;DR:** Gas sponsorship is ready but not currently used. Bread Africa handles offramp transactions. We'll use gas sponsorship when we add direct wallet features in the future.

