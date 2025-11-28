# 🔐 SolPay Security Audit & Encryption Keys

**Generated:** 2025-11-28  
**Status:** CRITICAL - Action Required

---

## 📊 Current Encryption Keys in Project

### 1. **ENCRYPTION_KEY** (User Deposit Wallets)
```
Location: backend/.env line 20
Value: 33eae7789eb414024b6b5d4210ed61cfea6d7155fde8191964fc41c3f3e2d254
Purpose: Encrypt user deposit wallet private keys
Algorithm: AES-256-GCM with PBKDF2 (100,000 iterations)
Used by: backend/src/utils/encryption.ts
Storage: deposit_addresses.private_key_encrypted (base64)
```

**Security Status:** ✅ **SECURE**
- Uses PBKDF2 key derivation (100,000 iterations)
- Unique salt and IV per encryption
- Authentication tag for integrity
- Never committed to GitHub (in `.gitignore`)

---

### 2. **WALLET_ENCRYPTION_KEY** (Platform Treasury & Referral Wallets)
```
Location: backend/.env line 26 and 141 (duplicate!)
Value: d3bd8bf5be806825fefa3077b0fa8b72ff0c49869636668189a25b8e22c7d064
Purpose: Encrypt platform treasury and referral wallet private keys
Algorithm: AES-256-GCM (simple, no PBKDF2)
Used by: backend/src/scripts/generate-referral-wallet.ts
Storage: referral_funding_wallet table (encrypted_private_key, encryption_iv, encryption_tag)
```

**Security Status:** ⚠️ **MODERATE**
- Uses AES-256-GCM (good)
- NO key derivation (less secure than ENCRYPTION_KEY)
- Separate IV and tag fields (good)
- Never committed to GitHub (in `.gitignore`)

**⚠️ WARNING:** This key appears TWICE in .env (lines 26 and 141) - remove duplicate!

---

### 3. **Hardcoded Private Keys in .env**

#### Solana Treasury (Gas Sponsor)
```
Location: backend/.env line 48
Address: CmZzUSAux8ahGDrPfLEx8c3oJMKSisycMqUdx8ZSDRbW
Private Key: [109,131,174,218,148,153,156,204,216,97,201,172,3,142,235,64,...]
Purpose: Pay gas fees for Solana transactions
```

**Security Status:** ⚠️ **EXPOSED IN PLAINTEXT**
- Private key stored as JSON array (unencrypted!)
- Anyone with access to .env can drain this wallet
- Currently has ~0.13 SOL (~$30)

#### Base/Polygon Treasury
```
Location: backend/.env lines 59, 74
Address: 0xca153EA8BA71453BfAf201F327deC616E5c4d49a
Private Key: 0xe0afbaf2b2b0baa40d2b218380dc5943ce4b7abeb3117a54409cc55ff9fcb640
Purpose: Collect platform fees (NOT for gas - that's separate)
```

**Security Status:** ⚠️ **EXPOSED IN PLAINTEXT**
- Private key stored as hex string (unencrypted!)
- Anyone with access to .env can drain this wallet
- Currently has platform fees collected

---

## 🚨 CRITICAL SECURITY ISSUES

### Issue #1: Duplicate WALLET_ENCRYPTION_KEY
**Severity:** LOW  
**Impact:** Confusing, could lead to errors  
**Fix:** Remove duplicate on line 141

### Issue #2: Plaintext Private Keys in .env
**Severity:** HIGH  
**Impact:** If .env is compromised, wallets are drained  
**Affected:**
- Solana treasury: `CmZzUSAux8ahGDrPfLEx8c3oJMKSisycMqUdx8ZSDRbW`
- Base/Polygon treasury: `0xca153EA8BA71453BfAf201F327deC616E5c4d49a`

**Fix:** Move to encrypted database storage or use environment variable encryption

### Issue #3: Missing Gas Sponsor Wallets
**Severity:** CRITICAL  
**Impact:** Offramps on Base/Polygon will FAIL  
**Fix:** Generate new gas sponsor wallets (script provided)

### Issue #4: No Secrets Rotation Policy
**Severity:** MEDIUM  
**Impact:** Compromised keys stay compromised forever  
**Fix:** Implement quarterly key rotation

---

## 🛡️ SECURITY RECOMMENDATIONS

### Immediate Actions (Do This Week):

1. **✅ DONE: Remove compromised personal wallet**
2. **🔴 TODO: Remove duplicate WALLET_ENCRYPTION_KEY** (line 141)
3. **🔴 TODO: Generate new gas sponsor wallets**
4. **🔴 TODO: Move treasury private keys to encrypted storage**
5. **🔴 TODO: Enable Render environment variable encryption**

### Short-term (Do This Month):

1. **Implement Hardware Security Module (HSM)**
   - Use AWS KMS or Google Cloud KMS
   - Store treasury private keys in HSM
   - Cost: ~$1/month

2. **Add Secrets Management**
   - Use AWS Secrets Manager or HashiCorp Vault
   - Rotate keys automatically
   - Audit access logs

3. **Enable Multi-Signature Wallets**
   - Require 2-of-3 signatures for treasury withdrawals
   - Use Gnosis Safe (Ethereum) or Squads (Solana)
   - Prevents single point of failure

4. **Implement Rate Limiting**
   - Limit offramp transactions per user per day
   - Prevent rapid draining of funds
   - Alert on suspicious patterns

5. **Add Monitoring & Alerts**
   - Alert when treasury balance drops below threshold
   - Alert on large transactions (>$100)
   - Daily balance reports via email

### Long-term (Do This Quarter):

1. **Security Audit by Professional Firm**
   - Cost: $5,000 - $20,000
   - Recommended: Trail of Bits, OpenZeppelin, Halborn

2. **Bug Bounty Program**
   - Reward security researchers for finding bugs
   - Use Immunefi or HackerOne
   - Budget: $1,000 - $10,000 per critical bug

3. **Penetration Testing**
   - Simulate real attacks
   - Test all endpoints and wallets
   - Quarterly testing recommended

---

## 📋 Encryption Key Usage Map

| Key | Used By | Encrypts | Storage Location |
|-----|---------|----------|------------------|
| `ENCRYPTION_KEY` | `utils/encryption.ts` | User deposit wallet private keys | `deposit_addresses.private_key_encrypted` |
| `WALLET_ENCRYPTION_KEY` | `scripts/generate-referral-wallet.ts` | Platform treasury private keys | `referral_funding_wallet` table |
| None (plaintext) | Direct usage | Solana gas sponsor | `.env` line 48 |
| None (plaintext) | Direct usage | Base/Polygon treasury | `.env` lines 59, 74 |

---

## 🔄 Key Rotation Plan

### User Deposit Wallets (ENCRYPTION_KEY)
**Frequency:** Annually  
**Process:**
1. Generate new ENCRYPTION_KEY
2. Re-encrypt all deposit_addresses.private_key_encrypted with new key
3. Update .env and Render
4. Test decryption
5. Archive old key securely

### Platform Treasury (WALLET_ENCRYPTION_KEY)
**Frequency:** Quarterly  
**Process:**
1. Generate new WALLET_ENCRYPTION_KEY
2. Re-encrypt referral_funding_wallet table
3. Update .env and Render
4. Test decryption
5. Archive old key securely

### Gas Sponsor Wallets
**Frequency:** As needed (after compromise)  
**Process:**
1. Generate new wallet
2. Transfer remaining funds to new wallet
3. Update .env and Render
4. Disable old wallet

---

## ✅ Security Checklist

- [ ] Remove duplicate WALLET_ENCRYPTION_KEY from .env
- [ ] Generate new gas sponsor wallets for Base and Polygon
- [ ] Move treasury private keys to encrypted storage
- [ ] Enable Render environment variable encryption
- [ ] Set up monitoring alerts for wallet balances
- [ ] Implement rate limiting on offramp endpoints
- [ ] Add 2FA for admin dashboard access
- [ ] Schedule quarterly security audits
- [ ] Create incident response plan
- [ ] Document key rotation procedures
- [ ] Set up automated backups of encrypted keys
- [ ] Test disaster recovery procedures

---

**Next Steps:** See `SECURITY_HARDENING_PLAN.md` for detailed implementation guide.

