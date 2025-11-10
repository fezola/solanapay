# Referral Funding Wallet Setup Guide

## Overview
The referral system now requires a dedicated funding wallet to pay out referral rewards. This wallet will be used to fund all referral bonuses ($0.70 per successful referral).

## ✅ What's Been Done

1. **Updated Referral Reward**: Changed from $1.00 to **$0.70 per referral**
2. **Created Funding Wallet System**: Database tables and functions to track the funding wallet
3. **Updated All Code**: Frontend, backend, and database functions now use $0.70
4. **Added Balance Checks**: System will check funding wallet balance before crediting rewards

## 📋 Setup Steps

### Step 1: Create or Use Existing Solana Wallet

You need a Solana wallet address to fund the referral system. You can:

**Option A: Create a new wallet** (Recommended for security)
- Use Phantom Wallet, Solflare, or any Solana wallet
- Save the wallet address (public key)
- **IMPORTANT**: Keep the private key/seed phrase secure!

**Option B: Use an existing wallet**
- Use any Solana wallet you already have
- Make sure it's a wallet you control and can fund

### Step 2: Fund the Wallet with $50 USDC

1. **Get the wallet address** from Step 1
2. **Send $50 USDC** to this wallet on the **Solana network**
   - You can buy USDC on exchanges like Coinbase, Binance, Kraken
   - Transfer to your Solana wallet address
   - **Make sure it's USDC on Solana network** (not Ethereum or other chains)

### Step 3: Register the Wallet in Database

Once you have the wallet address and it's funded, run this SQL in Supabase:

```sql
-- Replace 'YOUR_SOLANA_WALLET_ADDRESS_HERE' with your actual wallet address
INSERT INTO referral_funding_wallet (
  wallet_address,
  network,
  asset,
  initial_balance_usd,
  current_balance_usd,
  low_balance_threshold_usd,
  is_active
) VALUES (
  'YOUR_SOLANA_WALLET_ADDRESS_HERE',  -- ← REPLACE THIS
  'solana',
  'USDC',
  50.00,
  50.00,
  10.00,
  TRUE
);
```

**Example:**
```sql
INSERT INTO referral_funding_wallet (
  wallet_address,
  network,
  asset,
  initial_balance_usd,
  current_balance_usd,
  low_balance_threshold_usd,
  is_active
) VALUES (
  'GVvdFFSEPay1e9SsscP4Hxoa12YznVpgt3JoYfQ8hGu',  -- Example address
  'solana',
  'USDC',
  50.00,
  50.00,
  10.00,
  TRUE
);
```

### Step 4: Verify Setup

Run this query in Supabase to check the wallet status:

```sql
SELECT * FROM check_funding_wallet_balance();
```

You should see:
- `wallet_address`: Your wallet address
- `current_balance_usd`: 50.00
- `total_rewards_paid_usd`: 0.00
- `total_referrals_credited`: 0
- `low_balance_alert`: false
- `estimated_referrals_remaining`: 71 (50 / 0.70 = ~71 referrals)

## 💰 How It Works

1. **User refers a friend** → Friend signs up with referral code
2. **Friend completes KYC** → Trigger fires automatically
3. **System checks funding wallet** → Ensures $0.70 is available
4. **Deducts from funding wallet** → Updates balance: $50.00 → $49.30
5. **Credits referrer's NGN wallet** → Converts $0.70 to NGN (≈₦1,155) and credits

## 📊 Monitoring the Wallet

### Check Current Balance
```sql
SELECT * FROM check_funding_wallet_balance();
```

### View All Transactions
```sql
SELECT 
  wallet_address,
  current_balance_usd,
  total_rewards_paid_usd,
  total_referrals_credited,
  created_at,
  last_funded_at
FROM referral_funding_wallet
WHERE is_active = TRUE;
```

### Low Balance Alert
When balance drops below $10.00, the `low_balance_alert` will be `TRUE`:
```sql
SELECT 
  current_balance_usd,
  low_balance_alert,
  estimated_referrals_remaining
FROM check_funding_wallet_balance();
```

## 💵 Adding More Funds

When the wallet balance gets low, you can add more funds:

### Option 1: Send More USDC to the Wallet
1. Send USDC to the same wallet address
2. Update the database balance:
```sql
-- Add $50 more to the wallet
SELECT add_funds_to_wallet(50.00);
```

### Option 2: Manual Database Update
```sql
UPDATE referral_funding_wallet
SET 
  current_balance_usd = current_balance_usd + 50.00,
  updated_at = NOW(),
  last_funded_at = NOW()
WHERE is_active = TRUE;
```

## 🔒 Security Notes

1. **Never share the private key** of the funding wallet
2. **Keep the wallet address public** - it's safe to share
3. **Monitor the balance regularly** - Set up alerts when balance < $10
4. **Only one active wallet** - System enforces only one active funding wallet at a time

## 🚨 Troubleshooting

### Error: "No active referral funding wallet found"
**Solution**: Run the INSERT query from Step 3 to register your wallet

### Error: "Insufficient balance in referral funding wallet"
**Solution**: Add more funds using the steps in "Adding More Funds" section

### Balance not updating after adding funds
**Solution**: Make sure you ran `SELECT add_funds_to_wallet(AMOUNT);` after sending USDC

## 📈 Capacity Planning

With $50 initial funding:
- **Reward per referral**: $0.70
- **Total referrals possible**: ~71 referrals
- **Recommended refill**: When balance drops below $10 (≈14 referrals remaining)

## 🎯 Next Steps

1. ✅ Create/choose a Solana wallet
2. ✅ Fund it with $50 USDC on Solana network
3. ✅ Run the INSERT query in Supabase with your wallet address
4. ✅ Verify setup with `SELECT * FROM check_funding_wallet_balance();`
5. ✅ Test the referral system!

---

## Quick Reference Commands

```sql
-- Check wallet status
SELECT * FROM check_funding_wallet_balance();

-- Add $50 to wallet
SELECT add_funds_to_wallet(50.00);

-- View wallet details
SELECT * FROM referral_funding_wallet WHERE is_active = TRUE;

-- Check recent referral rewards
SELECT 
  r.id,
  r.referrer_id,
  r.reward_amount_usd,
  r.reward_credited,
  r.reward_credited_at,
  r.status
FROM referrals r
ORDER BY r.created_at DESC
LIMIT 10;
```

---

**Need Help?** Check the Supabase dashboard or contact support.

