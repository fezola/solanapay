# 🔄 Manual vs Automatic Offramp Guide

## Overview

Bread Africa supports **two offramp modes** for your crypto-to-fiat application:

| Mode | Wallet Type | Conversion Trigger | User Experience |
|------|-------------|-------------------|-----------------|
| **Automatic** | `offramp` | Instant (on deposit) | Deposit → Auto-convert → Bank |
| **Manual** | `basic` | User-triggered | Deposit → Hold → Cash out when ready |

---

## 🤖 Automatic Mode (Current Implementation)

### How It Works

```
User deposits USDC
       ↓
Bread wallet receives crypto
       ↓
AUTOMATIC conversion to NGN
       ↓
Money sent to bank account
       ↓
User receives NGN (5-30 min)
```

### Implementation

```typescript
// Create automatic offramp wallet
const wallet = await breadService.wallet.createWallet(
  identityId,
  'solana',
  'offramp',  // ← Automatic mode
  beneficiaryId  // ← Required: where to send NGN
);

// User deposits to wallet.address
// Bread automatically converts and sends to bank
// No manual trigger needed!
```

### Pros & Cons

✅ **Pros:**
- Instant cashouts
- Simpler user flow
- No manual intervention needed
- Best for remittance use cases

❌ **Cons:**
- User can't hold crypto
- No control over conversion timing
- Can't batch multiple deposits
- User must have bank account set up first

### Best For:
- Remittance apps
- Instant cashout services
- Users who want fiat immediately
- Simple "deposit and receive" flows

---

## 🎮 Manual Mode (Optional)

### How It Works

```
User deposits USDC
       ↓
Bread wallet receives crypto
       ↓
Crypto STAYS in wallet
       ↓
User sees crypto balance in app
       ↓
User clicks "Cash Out"
       ↓
You trigger offramp API
       ↓
Bread converts to NGN
       ↓
Money sent to bank account
```

### Implementation

#### Step 1: Create Basic Wallet

```typescript
// Create manual wallet (no beneficiary needed yet)
const wallet = await breadService.wallet.createWallet(
  identityId,
  'solana',
  'basic'  // ← Manual mode
);

// User can deposit to wallet.address
// Crypto will stay in the wallet
```

#### Step 2: Show Crypto Balance

```typescript
// Get wallet balance from Bread
const balance = await breadService.wallet.getWalletBalance(wallet.id);

// Show in app:
// "You have 100 USDC ($100)"
```

#### Step 3: User Triggers Cashout

```typescript
// When user clicks "Cash Out"
const offramp = await breadService.offramp.executeOfframp({
  walletId: wallet.id,
  beneficiaryId: beneficiary.id,  // ← Can be different each time
  amount: '100',  // ← User chooses amount
});

// Bread converts 100 USDC → NGN
// Sends to beneficiary's bank account
```

### Pros & Cons

✅ **Pros:**
- Users can hold crypto
- Batch multiple deposits before cashing out
- More control over conversion timing
- Can cash out to different bank accounts
- Better for crypto-savvy users

❌ **Cons:**
- More complex user flow
- Requires manual trigger
- User needs to understand crypto balances
- More code to maintain

### Best For:
- Crypto wallets with offramp feature
- Users who want to hold crypto
- Batch processing scenarios
- Multi-beneficiary support

---

## 🔀 Hybrid Approach (Recommended)

You can support **both modes** and let users choose:

### User Settings

```typescript
interface UserSettings {
  offrampMode: 'automatic' | 'manual';
}

// When creating wallet
const walletType = user.settings.offrampMode === 'automatic' 
  ? 'offramp' 
  : 'basic';

const wallet = await breadService.wallet.createWallet(
  identityId,
  'solana',
  walletType,
  walletType === 'offramp' ? beneficiaryId : undefined
);
```

### UI Flow

**Automatic Mode:**
```
[Deposit] → [Processing...] → [Money in bank ✓]
```

**Manual Mode:**
```
[Deposit] → [Balance: 100 USDC] → [Cash Out] → [Money in bank ✓]
```

---

## 📊 Comparison Table

| Feature | Automatic | Manual |
|---------|-----------|--------|
| **Conversion** | Instant | User-triggered |
| **Crypto Balance** | Not visible | Visible in app |
| **Bank Account** | Required upfront | Can add later |
| **Multiple Deposits** | Each converts separately | Can batch |
| **User Control** | Low | High |
| **Complexity** | Simple | Moderate |
| **Code Changes** | None (current) | Moderate |

---

## 🛠️ Implementation Guide

### Current State (Automatic Only)

Your app currently uses **automatic mode**:

```typescript
// backend/src/services/bread/integration.ts
const wallet = await this.breadService.wallet.createWallet(
  identity.id,
  chain,
  'offramp',  // ← Automatic
  beneficiary.id
);
```

**No changes needed** if you want to keep automatic mode only!

---

### Adding Manual Mode Support

If you want to add manual mode, here's what you need:

#### 1. Update Database Schema

```sql
-- Add wallet_type column to deposit_addresses
ALTER TABLE deposit_addresses 
ADD COLUMN wallet_type VARCHAR(20) DEFAULT 'offramp';

-- Add user preference
ALTER TABLE users 
ADD COLUMN offramp_mode VARCHAR(20) DEFAULT 'automatic';
```

#### 2. Update Wallet Creation

```typescript
// backend/src/routes/deposits.ts
async function generateUserAddresses(userId: string, mode: 'automatic' | 'manual') {
  const walletType = mode === 'automatic' ? 'offramp' : 'basic';
  
  // For automatic mode, need beneficiary
  let beneficiaryId;
  if (walletType === 'offramp') {
    const { data: beneficiary } = await supabase
      .from('bank_accounts')
      .select('bread_beneficiary_id')
      .eq('user_id', userId)
      .eq('is_default', true)
      .single();
    
    beneficiaryId = beneficiary?.bread_beneficiary_id;
  }
  
  const wallet = await breadService.wallet.createWallet(
    identityId,
    'solana',
    walletType,
    beneficiaryId
  );
}
```

#### 3. Add Balance Endpoint

```typescript
// backend/src/routes/deposits.ts
fastify.get('/crypto-balance', async (request, reply) => {
  const userId = request.userId!;
  
  // Get Bread wallet IDs
  const { data: addresses } = await supabase
    .from('deposit_addresses')
    .select('bread_wallet_id, asset, chain')
    .eq('user_id', userId)
    .eq('wallet_type', 'basic');
  
  const balances = [];
  for (const addr of addresses || []) {
    if (addr.bread_wallet_id) {
      const balance = await breadService.wallet.getWalletBalance(
        addr.bread_wallet_id
      );
      balances.push({
        asset: addr.asset,
        chain: addr.chain,
        balance: balance.balance,
      });
    }
  }
  
  return { balances };
});
```

#### 4. Update Offramp Execution

```typescript
// backend/src/routes/payouts.ts
fastify.post('/execute', async (request, reply) => {
  // ... existing code ...
  
  // For manual mode, use Bread wallet balance
  const { data: depositAddress } = await supabase
    .from('deposit_addresses')
    .select('bread_wallet_id, wallet_type')
    .eq('user_id', userId)
    .eq('asset', quote.asset)
    .eq('chain', quote.chain)
    .single();
  
  if (depositAddress?.wallet_type === 'basic') {
    // Manual mode: trigger offramp from Bread wallet
    const offramp = await breadService.offramp.executeOfframp({
      walletId: depositAddress.bread_wallet_id!,
      beneficiaryId: beneficiary.bread_beneficiary_id!,
      amount: quote.crypto_amount,
    });
  } else {
    // Automatic mode: already converted, just record payout
    // ... existing code ...
  }
});
```

---

## 🎯 Recommendation

### For Your App (SolPay):

**Stick with AUTOMATIC mode** because:

1. ✅ Simpler user experience
2. ✅ Faster cashouts
3. ✅ Less code complexity
4. ✅ Better for remittance use case
5. ✅ Already implemented and working

**Only add MANUAL mode if:**
- Users specifically request to hold crypto
- You want to add a "crypto wallet" feature
- You need batch processing
- You have developer resources for the extra complexity

---

## 📝 Summary

| Question | Answer |
|----------|--------|
| **What mode are you using now?** | Automatic (`offramp`) |
| **Do you need to change?** | No, automatic is perfect for your use case |
| **Can you support both?** | Yes, but adds complexity |
| **Should you support both?** | Only if users request it |

**Bottom line:** Your current automatic implementation is the right choice for a crypto offramp app! 🎉


