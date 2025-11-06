# 🚀 Solana Mainnet Migration Guide

This guide will help you switch from Solana **devnet** to **mainnet-beta** for production.

---

## ⚠️ IMPORTANT: What Changes When Moving to Mainnet

### 1. **Real Money** 💰
- Devnet uses **fake tokens** (free from faucets)
- Mainnet uses **REAL cryptocurrency** with real value
- All transactions cost **real SOL** for gas fees
- USDC/USDT on mainnet are **real stablecoins** worth real USD

### 2. **RPC Endpoints**
- **Devnet:** `https://api.devnet.solana.com` (free, slower)
- **Mainnet:** `https://api.mainnet-beta.solana.com` (free, rate-limited)
- **Recommended for Production:** Use a paid RPC provider (see below)

### 3. **Token Mint Addresses**

| Token | Devnet | Mainnet |
|-------|--------|---------|
| **USDC** | `4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU` | `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v` |
| **USDT** | `EJwZgeZrdC8TXTQbQBoL6bfuAnFUUy1PVCMB4DYPzVaS` | `Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB` |

### 4. **Confirmations**
- Mainnet transactions are **final** and **irreversible**
- Devnet transactions can be reset when the network resets
- Mainnet requires more confirmations for security (we use `finalized` commitment)

---

## 📋 Step-by-Step Migration

### Step 1: Update Backend Environment Variables on Render

Go to your Render dashboard: https://dashboard.render.com

1. Click on your **solanapay-backend** service
2. Go to **Environment** tab
3. Update/Add these variables:

```env
# Change from devnet to mainnet
SOLANA_NETWORK=mainnet-beta

# Update RPC URL (see Step 2 for recommended providers)
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com

# IMPORTANT: These are MAINNET addresses (already correct in your code)
USDC_SOL_MINT=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v
USDT_SOL_MINT=Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB
```

4. Click **Save Changes**
5. Render will automatically redeploy your backend

---

### Step 2: Get a Production-Grade RPC Provider (HIGHLY RECOMMENDED)

The free Solana RPC (`https://api.mainnet-beta.solana.com`) has **strict rate limits** and can be slow.

For production, use one of these providers:

#### **Option 1: Helius (Recommended)** ⭐
- **Free Tier:** 100,000 requests/day
- **Website:** https://helius.dev
- **Setup:**
  1. Sign up at https://dev.helius.xyz
  2. Create a new project
  3. Copy your RPC URL: `https://mainnet.helius-rpc.com/?api-key=YOUR_API_KEY`
  4. Update `SOLANA_RPC_URL` on Render

#### **Option 2: QuickNode**
- **Free Tier:** 10M requests/month
- **Website:** https://quicknode.com
- **Setup:**
  1. Sign up at https://quicknode.com
  2. Create a Solana Mainnet endpoint
  3. Copy your RPC URL
  4. Update `SOLANA_RPC_URL` on Render

#### **Option 3: Alchemy**
- **Free Tier:** 300M compute units/month
- **Website:** https://alchemy.com
- **Setup:**
  1. Sign up at https://alchemy.com
  2. Create a Solana Mainnet app
  3. Copy your RPC URL
  4. Update `SOLANA_RPC_URL` on Render

---

### Step 3: Set Up Treasury Wallet (CRITICAL!) 🔐

Your app needs a **treasury wallet** to receive user deposits.

#### **Generate a New Mainnet Wallet:**

```bash
# Install Solana CLI (if not already installed)
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"

# Generate a new keypair
solana-keygen new --outfile ~/solpay-treasury.json

# Get the public address
solana-keygen pubkey ~/solpay-treasury.json
```

**Example output:**
```
pubkey: 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU
```

#### **Fund the Treasury Wallet:**

1. **Send SOL** to the treasury address (for gas fees)
   - Minimum: **0.1 SOL** (~$20 USD)
   - Recommended: **0.5 SOL** (~$100 USD)

2. You can buy SOL on:
   - Coinbase
   - Binance
   - Kraken
   - Any major exchange

#### **Add to Render Environment:**

```env
SOLANA_TREASURY_ADDRESS=7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU
SOLANA_TREASURY_PRIVATE_KEY=[1,2,3,4,5,...]  # The JSON array from the keypair file
```

⚠️ **SECURITY WARNING:**
- **NEVER** commit the private key to Git
- **NEVER** share the private key
- Store it securely in Render's environment variables only

---

### Step 4: Update Frontend (if needed)

The frontend doesn't need changes because it uses the backend API. However, if you're using Solana wallet adapters directly:

**Check `src/services/solana.ts` or similar files:**

```typescript
// Make sure you're using mainnet-beta
const connection = new Connection(
  'https://api.mainnet-beta.solana.com',
  'confirmed'
);
```

---

### Step 5: Test the Migration

#### **1. Check Backend Logs on Render:**

After deployment, check the logs for:

```
✅ Connected to Solana mainnet-beta
✅ Treasury address: 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU
```

#### **2. Test Deposit Address Generation:**

In your app:
1. Log in
2. Go to **Deposit** screen
3. Select **USDC** → **Solana**
4. Check that the address is a valid Solana mainnet address

#### **3. Test with a Small Amount:**

⚠️ **Start with a SMALL test transaction!**

1. Send **$1 worth of USDC** to the deposit address
2. Wait for confirmation (1-2 minutes)
3. Check if the balance updates in your app
4. Try withdrawing to your bank account

---

## 🔍 Verification Checklist

Before going live, verify:

- [ ] `SOLANA_NETWORK=mainnet-beta` on Render
- [ ] `SOLANA_RPC_URL` points to mainnet (not devnet)
- [ ] `USDC_SOL_MINT=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v` (mainnet USDC)
- [ ] `USDT_SOL_MINT=Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB` (mainnet USDT)
- [ ] Treasury wallet has at least 0.1 SOL for gas fees
- [ ] Treasury private key is stored securely in Render (not in Git)
- [ ] Backend logs show "Connected to Solana mainnet-beta"
- [ ] Test deposit with $1 USDC works
- [ ] Test withdrawal to bank account works

---

## 🚨 Common Issues & Solutions

### Issue 1: "Insufficient funds for transaction"
**Cause:** Treasury wallet doesn't have enough SOL for gas fees  
**Solution:** Send at least 0.1 SOL to the treasury address

### Issue 2: "Invalid mint address"
**Cause:** Using devnet USDC/USDT addresses on mainnet  
**Solution:** Update to mainnet addresses (see table above)

### Issue 3: "RPC rate limit exceeded"
**Cause:** Using free Solana RPC with too many requests  
**Solution:** Switch to Helius, QuickNode, or Alchemy (see Step 2)

### Issue 4: "Transaction not found"
**Cause:** Transaction was sent to devnet instead of mainnet  
**Solution:** Verify `SOLANA_NETWORK=mainnet-beta` on Render

---

## 💡 Best Practices for Production

### 1. **Use a Paid RPC Provider**
- Free RPC is unreliable for production
- Helius free tier is usually sufficient to start

### 2. **Monitor Treasury Balance**
- Set up alerts when SOL balance < 0.05
- Auto-refill from a hot wallet

### 3. **Use Multiple RPC Endpoints**
- Primary: Helius
- Fallback: QuickNode
- This prevents downtime if one provider has issues

### 4. **Increase Confirmations for Large Amounts**
- Small amounts (<$100): `confirmed` commitment
- Large amounts (>$100): `finalized` commitment (already set in code)

### 5. **Enable Transaction Monitoring**
- Log all transactions to Supabase
- Set up alerts for failed transactions
- Monitor for unusual activity

---

## 📊 Cost Estimates

### RPC Costs (Monthly)
- **Free Tier (Helius):** $0 (up to 100k requests/day)
- **Paid Tier (Helius):** $50-200/month (unlimited requests)

### Gas Fees (SOL)
- **Per Transaction:** ~0.000005 SOL (~$0.001)
- **1000 Transactions:** ~0.005 SOL (~$1)
- **10,000 Transactions:** ~0.05 SOL (~$10)

### Total Monthly Cost Estimate
- **0-1000 users:** $0-50/month
- **1000-10,000 users:** $50-200/month
- **10,000+ users:** $200-500/month

---

## 🎯 Next Steps After Migration

1. **Monitor for 24 hours** - Watch logs and user transactions
2. **Test all features** - Deposit, withdraw, swap, etc.
3. **Update documentation** - Let users know you're on mainnet
4. **Set up monitoring** - Use Sentry or similar for error tracking
5. **Plan for scaling** - Upgrade RPC tier as you grow

---

## 📞 Support

If you encounter issues:

1. **Check Render logs** - Most issues show up here
2. **Check Solana Explorer** - https://explorer.solana.com
3. **Helius Discord** - https://discord.gg/helius (for RPC issues)
4. **Solana Discord** - https://discord.gg/solana (for general help)

---

**You're now ready to go live on Solana mainnet! 🚀**

