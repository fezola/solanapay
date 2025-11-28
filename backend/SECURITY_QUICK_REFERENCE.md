# 🔐 SolPay Security Quick Reference

**Last Updated:** 2025-11-28  
**Status:** Post-Compromise Recovery

---

## 📋 Current Security Status

### ✅ Completed:
- [x] Removed compromised personal wallet from project
- [x] Deleted all documentation containing compromised wallet
- [x] Verified wallet was never committed to GitHub
- [x] Removed duplicate WALLET_ENCRYPTION_KEY from .env
- [x] Created security audit documentation
- [x] Created security hardening plan

### 🔴 URGENT - Do Immediately:
- [ ] Generate new gas sponsor wallets (script: `generate-gas-sponsor-wallets.js`)
- [ ] Scan computer for malware (Malwarebytes or Windows Defender)
- [ ] Change all crypto-related passwords
- [ ] Fund new gas sponsor wallets (Base: 0.01 ETH, Polygon: 10 MATIC)

### ⚠️ High Priority - Do This Week:
- [ ] Add gas sponsor env vars to Render
- [ ] Enable Render secret management
- [ ] Set up wallet balance monitoring
- [ ] Implement rate limiting on offramps

---

## 🔑 Encryption Keys Overview

| Key Name | Purpose | Algorithm | Location |
|----------|---------|-----------|----------|
| `ENCRYPTION_KEY` | User deposit wallets | AES-256-GCM + PBKDF2 | `.env` line 20 |
| `WALLET_ENCRYPTION_KEY` | Platform treasury | AES-256-GCM | `.env` line 26 |

**⚠️ NEVER commit these to GitHub!** (Already in `.gitignore`)

---

## 💰 Wallet Inventory

### Platform Treasury Wallets (Collect Fees)

**Solana:**
- Address: `CB7GgQd7nYJmXiVvHRRNsMX2bUYn6Z3roBgLg2DrZdGG`
- Storage: Database (`referral_funding_wallet` table, encrypted)
- Purpose: Collect platform fees from Solana offramps
- Current Balance: Check with script

**Base/Polygon:**
- Address: `0xca153EA8BA71453BfAf201F327deC616E5c4d49a`
- Storage: `.env` (⚠️ PLAINTEXT - needs to be moved to encrypted storage)
- Purpose: Collect platform fees from Base/Polygon offramps
- Current Balance: Check with script

### Gas Sponsor Wallets (Pay Gas Fees)

**Solana:**
- Address: `CmZzUSAux8ahGDrPfLEx8c3oJMKSisycMqUdx8ZSDRbW`
- Storage: `.env` (⚠️ PLAINTEXT - needs to be moved to encrypted storage)
- Purpose: Pay SOL gas fees for user transactions
- Required Balance: 0.5 SOL (~$115)

**Base:**
- Address: **NEEDS TO BE GENERATED**
- Storage: `.env` (will be added)
- Purpose: Pay ETH gas fees for Base offramps
- Required Balance: 0.01 ETH (~$35)

**Polygon:**
- Address: **NEEDS TO BE GENERATED**
- Storage: `.env` (will be added)
- Purpose: Pay MATIC gas fees for Polygon offramps
- Required Balance: 10 MATIC (~$8.50)

### User Deposit Wallets (Custodial)
- Storage: Database (`deposit_addresses` table, encrypted with `ENCRYPTION_KEY`)
- Purpose: Receive user deposits
- Count: One per user per asset per chain

---

## 🚀 Quick Commands

### Generate New Gas Sponsor Wallets
```bash
cd backend
node generate-gas-sponsor-wallets.js
```

### Check Wallet Balances
```bash
# Solana
solana balance CB7GgQd7nYJmXiVvHRRNsMX2bUYn6Z3roBgLg2DrZdGG

# Base (via Basescan)
https://basescan.org/address/0xca153EA8BA71453BfAf201F327deC616E5c4d49a

# Polygon (via Polygonscan)
https://polygonscan.com/address/0xca153EA8BA71453BfAf201F327deC616E5c4d49a
```

### Scan for Malware
```powershell
# Windows Defender
Start-MpScan -ScanType FullScan

# Or download Malwarebytes
# https://www.malwarebytes.com/
```

### Rotate Encryption Keys (Advanced)
```bash
# Generate new key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Then manually re-encrypt all data with new key
# See SECURITY_HARDENING_PLAN.md for full procedure
```

---

## 🔒 Security Best Practices

### DO:
✅ Use dedicated wallets for each purpose (treasury, gas sponsor, user deposits)  
✅ Keep encryption keys in `.env` (never commit to GitHub)  
✅ Use hardware wallets for large amounts  
✅ Enable 2FA on all accounts  
✅ Monitor wallet balances regularly  
✅ Implement rate limiting  
✅ Log all sensitive operations  
✅ Test disaster recovery procedures  

### DON'T:
❌ Use personal wallets for project infrastructure  
❌ Store private keys in plaintext (except in `.env`)  
❌ Commit `.env` to GitHub  
❌ Share private keys via email/Slack/Discord  
❌ Take screenshots of private keys  
❌ Store keys in cloud (Google Drive, Dropbox, iCloud)  
❌ Reuse wallets across projects  
❌ Ignore security alerts  

---

## 📞 Emergency Contacts

### If Wallet is Compromised:
1. **Immediately transfer funds** to a new secure wallet
2. **Disable the compromised wallet** in the system
3. **Generate new wallet** using provided scripts
4. **Update environment variables** in `.env` and Render
5. **Investigate how compromise occurred** (malware scan, password change)
6. **Document incident** for future reference

### If Database is Compromised:
1. **Immediately rotate all encryption keys**
2. **Force logout all users**
3. **Disable all API endpoints** temporarily
4. **Investigate breach** (check logs, access patterns)
5. **Notify affected users** (if required by law)
6. **Restore from backup** if necessary

### If API Keys are Leaked:
1. **Immediately rotate all API keys** (Bread, Sumsub, Supabase)
2. **Check for unauthorized usage** (API logs)
3. **Update keys in `.env` and Render**
4. **Monitor for suspicious activity**
5. **Document incident**

---

## 📚 Documentation Index

- **SECURITY_AUDIT.md** - Complete audit of all encryption keys and wallets
- **SECURITY_HARDENING_PLAN.md** - Step-by-step security improvements (4 phases)
- **SECURITY_WALLET_COMPROMISED.md** - Response to wallet compromise incident
- **generate-gas-sponsor-wallets.js** - Script to generate new gas sponsor wallets

---

## 🎯 Next Steps

1. **Today:** Generate new gas sponsor wallets and fund them
2. **This Week:** Enable Render secrets, add monitoring
3. **This Month:** Implement AWS KMS, multisig wallets
4. **This Quarter:** Security audit, bug bounty program

**Remember:** Security is an ongoing process, not a one-time task!

