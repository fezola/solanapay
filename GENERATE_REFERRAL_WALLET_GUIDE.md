# Generate Referral Funding Wallet - Complete Guide

## Overview

This guide will help you generate a new Solana wallet specifically for funding referral rewards. The wallet will be:
- ✅ **Automatically generated** with a secure mnemonic phrase
- ✅ **Encrypted and stored** in the database
- ✅ **Backed up** to a secure file
- ✅ **Ready to receive** $50 USDC for referral payments

---

## 🚀 Quick Start

### Step 1: Generate the Wallet

Run this command in the `backend` directory:

```bash
cd backend
npm run generate-referral-wallet
```

### Step 2: Save the Output

The script will output:
1. **Public Address** - The Solana wallet address (safe to share)
2. **Mnemonic Phrase** - 12 words to recover the wallet (KEEP SECRET!)
3. **Encryption Key** - Used to encrypt the private key (KEEP SECRET!)

**Example Output:**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📍 PUBLIC ADDRESS (Solana):
   GVvdFFSEPay1e9SsscP4Hxoa12YznVpgt3JoYfQ8hGu
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔑 MNEMONIC PHRASE (12 words):
   abandon ability able about above absent absorb abstract absurd abuse access accident

⚠️  IMPORTANT: Save this mnemonic phrase in a secure location!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔐 ENCRYPTION KEY (Add this to your .env file):
   WALLET_ENCRYPTION_KEY=a1b2c3d4e5f6...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Step 3: Add Encryption Key to .env

Add the encryption key to your `backend/.env` file:

```bash
# Referral Wallet Encryption
WALLET_ENCRYPTION_KEY=a1b2c3d4e5f6...  # Use the key from the output
```

### Step 4: Fund the Wallet

Send **$50 USDC** to the public address on the **Solana network**:

**Where to buy USDC:**
- Coinbase
- Binance
- Kraken
- Any major crypto exchange

**Important:**
- ✅ Use **Solana network** (not Ethereum, Base, or other chains)
- ✅ Send **USDC** (not SOL or other tokens)
- ✅ Send to the **public address** shown in the output

### Step 5: Update Database Balance

After funding the wallet, update the balance in Supabase:

```sql
-- Update balance to $50
SELECT add_funds_to_wallet(50.00);
```

### Step 6: Verify Setup

Check that everything is working:

```sql
SELECT * FROM check_funding_wallet_balance();
```

You should see:
```
wallet_address: GVvdFFSEPay1e9SsscP4Hxoa12YznVpgt3JoYfQ8hGu
current_balance_usd: 50.00
total_rewards_paid_usd: 0.00
total_referrals_credited: 0
low_balance_alert: false
estimated_referrals_remaining: 71
```

---

## 🔐 Security Best Practices

### 1. **Save the Mnemonic Phrase**
- ✅ Store in a password manager (1Password, LastPass, Bitwarden)
- ✅ Write it down and keep in a safe place
- ❌ NEVER share it with anyone
- ❌ NEVER commit it to version control
- ❌ NEVER store it in plain text files

### 2. **Protect the Encryption Key**
- ✅ Add to `.env` file (already in .gitignore)
- ✅ Store in environment variables on Render
- ❌ NEVER commit to version control
- ❌ NEVER share publicly

### 3. **Backup File**
- ✅ Wallet backup is saved to `backend/wallet-backups/`
- ✅ This directory is in .gitignore
- ✅ Keep the backup file secure
- ❌ NEVER commit wallet backups to Git

---

## 📊 How It Works

### Wallet Generation
1. Script generates a 12-word mnemonic phrase
2. Derives a Solana keypair from the mnemonic
3. Encrypts the private key using AES-256-GCM
4. Stores encrypted key in database
5. Saves backup to `backend/wallet-backups/`

### Encryption
- **Algorithm**: AES-256-GCM (industry standard)
- **Key**: 256-bit random key (stored in .env)
- **IV**: Random initialization vector per encryption
- **Tag**: Authentication tag for integrity

### Database Storage
```sql
referral_funding_wallet:
  - wallet_address: Public Solana address
  - encrypted_private_key: Encrypted private key
  - encryption_iv: Initialization vector
  - encryption_tag: Authentication tag
  - current_balance_usd: Current balance
  - is_active: Whether wallet is active
```

---

## 💰 Funding the Wallet

### Option 1: Buy USDC on Exchange
1. Create account on Coinbase/Binance/Kraken
2. Buy USDC
3. Withdraw to Solana network
4. Use the public address from the script

### Option 2: Convert from Other Crypto
1. Use a DEX like Jupiter (jup.ag)
2. Swap SOL/USDT/other tokens to USDC
3. Send to the public address

### Option 3: Transfer from Existing Wallet
1. Open your existing Solana wallet
2. Send $50 USDC to the public address
3. Confirm on Solana network

---

## 🔄 Adding More Funds Later

When the balance gets low (< $10), add more funds:

### Step 1: Send USDC to the Wallet
Send more USDC to the same public address

### Step 2: Update Database
```sql
-- Add $50 more
SELECT add_funds_to_wallet(50.00);
```

### Step 3: Verify
```sql
SELECT * FROM check_funding_wallet_balance();
```

---

## 🚨 Troubleshooting

### Error: "WALLET_ENCRYPTION_KEY not found"
**Solution**: Add the encryption key to your `.env` file

### Error: "Failed to store wallet in database"
**Solution**: Make sure you ran the database migration to create the `referral_funding_wallet` table

### Wallet backup file not created
**Solution**: Check that `backend/wallet-backups/` directory exists and has write permissions

### Can't find the public address
**Solution**: Check the wallet backup file in `backend/wallet-backups/referral-wallet-*.json`

---

## 📋 Checklist

Before going live, make sure:

- [ ] Wallet generated successfully
- [ ] Mnemonic phrase saved in password manager
- [ ] Encryption key added to `.env` file
- [ ] Encryption key added to Render environment variables
- [ ] Wallet funded with $50 USDC on Solana
- [ ] Database balance updated to $50
- [ ] Verified with `check_funding_wallet_balance()`
- [ ] Wallet backup file saved securely
- [ ] `.gitignore` includes `wallet-backups/`

---

## 🎯 What Happens Next

Once the wallet is set up and funded:

1. **User refers a friend** → Friend signs up with referral code
2. **Friend completes KYC** → Automatic trigger fires
3. **System checks wallet balance** → Ensures $0.70 is available
4. **Deducts from wallet** → Balance: $50.00 → $49.30
5. **Credits referrer** → ₦1,155 (≈$0.70) added to their NGN wallet

---

## 📞 Support

If you encounter any issues:
1. Check the troubleshooting section above
2. Review the wallet backup file
3. Check Supabase logs for errors
4. Verify the encryption key is correct

---

## ⚠️ IMPORTANT REMINDERS

- 🔐 **NEVER** share your mnemonic phrase
- 🔐 **NEVER** commit wallet backups to Git
- 🔐 **NEVER** share the encryption key
- 💰 Monitor the wallet balance regularly
- 💰 Refill when balance drops below $10
- 📊 Check `check_funding_wallet_balance()` weekly

---

**Ready to generate your wallet?**

```bash
cd backend
npm run generate-referral-wallet
```

