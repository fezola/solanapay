# 🛡️ SolPay Security Hardening Plan

**Priority:** CRITICAL  
**Timeline:** Immediate to 3 months  
**Goal:** Secure all wallets, keys, and user funds

---

## 🚨 PHASE 1: IMMEDIATE (Do Today)

### 1.1 Fix Duplicate Encryption Key
**Time:** 2 minutes  
**Risk:** Low  
**Action:** Remove duplicate `WALLET_ENCRYPTION_KEY` from `.env`

```bash
# Edit backend/.env
# Remove line 141 (duplicate WALLET_ENCRYPTION_KEY)
```

### 1.2 Generate New Gas Sponsor Wallets
**Time:** 5 minutes  
**Risk:** High (offramps currently broken)  
**Action:** Run wallet generation script

```bash
cd backend
node generate-gas-sponsor-wallets.js
```

**Then:**
1. Copy output to `.env`
2. Add to Render environment variables
3. Fund wallets:
   - Base: 0.01 ETH (~$35)
   - Polygon: 10 MATIC (~$8.50)

### 1.3 Scan for Malware
**Time:** 30 minutes  
**Risk:** Critical (wallet was compromised)  
**Action:** Run full system scan

**Windows:**
```powershell
# Use Windows Defender
Start-MpScan -ScanType FullScan

# Or download Malwarebytes (free)
# https://www.malwarebytes.com/
```

**Mac:**
```bash
# Download Malwarebytes for Mac
# https://www.malwarebytes.com/mac
```

### 1.4 Change All Passwords
**Time:** 15 minutes  
**Risk:** High  
**Action:** Change passwords for:
- [ ] Coinbase/Binance (crypto exchanges)
- [ ] GitHub account
- [ ] Render account
- [ ] Supabase account
- [ ] Email account
- [ ] Any other crypto-related services

**Use a password manager:** 1Password, Bitwarden, or LastPass

---

## 🔧 PHASE 2: THIS WEEK (1-7 Days)

### 2.1 Enable Render Environment Variable Encryption
**Time:** 10 minutes  
**Risk:** Medium  
**Action:** Use Render's secret management

1. Go to Render Dashboard → Your Service → Environment
2. Mark sensitive variables as "Secret":
   - `ENCRYPTION_KEY`
   - `WALLET_ENCRYPTION_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `BREAD_API_KEY`
   - `SUMSUB_SECRET_KEY`
   - All private keys

### 2.2 Move Treasury Private Keys to Database
**Time:** 2 hours  
**Risk:** High  
**Action:** Encrypt and store in database instead of .env

**Benefits:**
- Encrypted at rest
- Can rotate without redeploying
- Audit trail of access
- Backup/recovery easier

**Implementation:** See script below

### 2.3 Add Wallet Balance Monitoring
**Time:** 1 hour  
**Risk:** Medium  
**Action:** Create monitoring script

**Features:**
- Check balances every hour
- Alert if below threshold
- Email/SMS notifications
- Log to database

### 2.4 Implement Rate Limiting
**Time:** 2 hours  
**Risk:** Medium  
**Action:** Prevent rapid fund draining

**Limits:**
- Max 5 offramps per user per day
- Max $500 per user per day
- Max $5,000 per user per month
- Alert on suspicious patterns

---

## 🏗️ PHASE 3: THIS MONTH (1-4 Weeks)

### 3.1 Implement AWS KMS or Google Cloud KMS
**Time:** 4 hours  
**Cost:** ~$1/month  
**Risk:** High  
**Action:** Use cloud HSM for key management

**AWS KMS Setup:**
```bash
# Install AWS CLI
npm install -g aws-cli

# Create KMS key
aws kms create-key --description "SolPay Treasury Encryption"

# Encrypt private key
aws kms encrypt --key-id <key-id> --plaintext "0xe0afbaf2..."
```

**Benefits:**
- Keys never leave AWS
- Automatic rotation
- Audit logs
- FIPS 140-2 compliant

### 3.2 Add Multi-Signature Wallets
**Time:** 8 hours  
**Cost:** Free (gas fees only)  
**Risk:** Critical  
**Action:** Require multiple signatures for treasury withdrawals

**Solana:** Use Squads Protocol
- https://squads.so/
- 2-of-3 multisig
- Free to set up

**Base/Polygon:** Use Gnosis Safe
- https://safe.global/
- 2-of-3 multisig
- Free to set up

### 3.3 Implement Transaction Approval Workflow
**Time:** 6 hours  
**Risk:** High  
**Action:** Manual approval for large transactions

**Rules:**
- Transactions > $100 require admin approval
- Transactions > $1,000 require 2 admin approvals
- Automatic approval for < $100

### 3.4 Add Comprehensive Logging
**Time:** 4 hours  
**Risk:** Medium  
**Action:** Log all sensitive operations

**Log:**
- All offramp transactions
- All treasury withdrawals
- All admin actions
- All failed authentication attempts
- All API errors

**Tools:**
- Sentry (errors)
- LogRocket (user sessions)
- CloudWatch (AWS logs)

---

## 🔬 PHASE 4: THIS QUARTER (1-3 Months)

### 4.1 Professional Security Audit
**Time:** 2-4 weeks  
**Cost:** $5,000 - $20,000  
**Risk:** Critical  
**Action:** Hire security firm

**Recommended Firms:**
- Trail of Bits (https://www.trailofbits.com/)
- OpenZeppelin (https://openzeppelin.com/security-audits/)
- Halborn (https://halborn.com/)
- Quantstamp (https://quantstamp.com/)

**Scope:**
- Smart contract audit (if any)
- Backend API security
- Database security
- Wallet management
- Authentication/authorization
- Penetration testing

### 4.2 Bug Bounty Program
**Time:** 1 week setup  
**Cost:** $1,000 - $10,000 per bug  
**Risk:** Medium  
**Action:** Reward security researchers

**Platforms:**
- Immunefi (https://immunefi.com/) - Crypto-focused
- HackerOne (https://www.hackerone.com/)
- Bugcrowd (https://www.bugcrowd.com/)

**Rewards:**
- Critical: $5,000 - $10,000
- High: $1,000 - $5,000
- Medium: $500 - $1,000
- Low: $100 - $500

### 4.3 Implement Cold Storage
**Time:** 2 hours  
**Cost:** $79 (Ledger Nano S Plus)  
**Risk:** High  
**Action:** Move majority of funds offline

**Strategy:**
- Hot wallet: $500 (for daily operations)
- Warm wallet: $5,000 (for weekly operations)
- Cold wallet: Everything else (offline storage)

**Hardware Wallets:**
- Ledger Nano S Plus ($79)
- Trezor Model T ($219)
- Ledger Nano X ($149)

### 4.4 Disaster Recovery Plan
**Time:** 4 hours  
**Risk:** Critical  
**Action:** Document recovery procedures

**Scenarios:**
- Database compromised
- Private keys leaked
- Server hacked
- DDoS attack
- Insider threat

**For each scenario:**
1. Detection method
2. Immediate response
3. Recovery steps
4. Prevention measures

---

## 📊 Cost Summary

| Phase | Item | Cost | Priority |
|-------|------|------|----------|
| 1 | Malware scan | Free | Critical |
| 1 | Password manager | $0-$5/mo | Critical |
| 2 | Render secrets | Free | High |
| 3 | AWS KMS | $1/mo | High |
| 3 | Multisig wallets | Gas fees only | High |
| 4 | Security audit | $5k-$20k | Critical |
| 4 | Bug bounty | $1k-$10k | Medium |
| 4 | Hardware wallet | $79-$219 | High |
| **TOTAL** | **First Month** | **~$100** | - |
| **TOTAL** | **First Quarter** | **~$6,000-$30,000** | - |

---

## ✅ Implementation Checklist

### Week 1:
- [ ] Remove duplicate encryption key
- [ ] Generate new gas sponsor wallets
- [ ] Scan for malware
- [ ] Change all passwords
- [ ] Enable Render secret management

### Week 2:
- [ ] Move treasury keys to database
- [ ] Add balance monitoring
- [ ] Implement rate limiting
- [ ] Set up logging

### Month 1:
- [ ] Set up AWS KMS
- [ ] Create multisig wallets
- [ ] Implement approval workflow
- [ ] Buy hardware wallet

### Quarter 1:
- [ ] Complete security audit
- [ ] Launch bug bounty
- [ ] Implement cold storage
- [ ] Document disaster recovery

---

**Next:** See implementation scripts in `backend/security-scripts/`

