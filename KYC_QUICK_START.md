# 🔐 KYC Integration - Quick Start

## ⚡ Get Started in 30 Minutes

### **Step 1: Sign Up for Smile ID** (5 min)

1. Go to https://usesmileid.com
2. Click "Get Started"
3. Fill out form:
   - Company: SolPay
   - Use case: Crypto offramp
   - Country: Nigeria
4. Get sandbox credentials via email

---

### **Step 2: Install Dependencies** (2 min)

```bash
cd backend
npm install @smile_identity/smile-identity-core multer sharp uuid
```

---

### **Step 3: Add Environment Variables** (2 min)

Add to `backend/.env`:

```env
# KYC VERIFICATION (Smile Identity)
SMILE_ID_PARTNER_ID=your_partner_id_here
SMILE_ID_API_KEY=your_api_key_here
SMILE_ID_CALLBACK_URL=https://your-domain.com/api/webhooks/smile-id
SMILE_ID_SANDBOX=true

# Disable mock KYC
KYC_AUTO_APPROVE=false
```

---

### **Step 4: Run Database Migration** (3 min)

Create `backend/src/db/migrations/003_add_kyc_fields.sql`:

```sql
-- Add KYC fields to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS kyc_status VARCHAR(50) DEFAULT 'pending';
ALTER TABLE users ADD COLUMN IF NOT EXISTS kyc_provider VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS kyc_reference_id VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS kyc_verified_at TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS kyc_rejection_reason TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS kyc_document_type VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS kyc_document_number VARCHAR(100);

-- Create KYC verification logs table
CREATE TABLE IF NOT EXISTS kyc_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider VARCHAR(50) NOT NULL,
  reference_id VARCHAR(255) NOT NULL UNIQUE,
  document_type VARCHAR(50) NOT NULL,
  status VARCHAR(50) NOT NULL,
  confidence_score DECIMAL(5,2),
  verification_data JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_kyc_verifications_user_id ON kyc_verifications(user_id);
```

Run migration:
```bash
npm run migrate:kyc
```

---

### **Step 5: Test Integration** (5 min)

Create test script `backend/src/scripts/test-smile-id.ts`:

```typescript
import { SmileIDClient } from '../services/kyc/smile-id-client.js';
import { env } from '../config/env.js';

const client = new SmileIDClient({
  partnerId: env.SMILE_ID_PARTNER_ID!,
  apiKey: env.SMILE_ID_API_KEY!,
  sandbox: env.SMILE_ID_SANDBOX,
});

// Test BVN verification
const result = await client.verifyBVN(
  'test-user-123',
  'test-job-123',
  '22222222222', // Test BVN in sandbox
  {
    firstName: 'Test',
    lastName: 'User',
    dateOfBirth: '1990-01-01',
  }
);

console.log('✅ Smile ID working!', result);
```

Run test:
```bash
npx tsx src/scripts/test-smile-id.ts
```

---

## 🎯 What's Next?

### **Complete Implementation** (1-2 days)

1. **Create KYC service** - `backend/src/services/kyc/smile-id-service.ts`
2. **Update KYC routes** - `backend/src/routes/kyc.ts`
3. **Create webhook handler** - `backend/src/routes/smile-id-webhooks.ts`
4. **Update frontend** - Add document upload UI
5. **Integrate with Bread** - Only create identity after KYC verified

---

## 📚 Documentation

- **Full Guide**: `KYC_INTEGRATION_GUIDE.md`
- **Implementation Summary**: `KYC_IMPLEMENTATION_SUMMARY.md`
- **Smile ID Docs**: https://docs.usesmileid.com

---

## 💰 Pricing

### **Recommended: BVN Verification**
- **Cost**: ₦200 per verification (~$0.25)
- **Speed**: 2-5 seconds
- **Accuracy**: 99%+
- **Best for**: Fast, cheap verification

### **Optional: Biometric KYC**
- **Cost**: ₦800 per verification (~$1.00)
- **Speed**: 10-30 seconds
- **Accuracy**: 99.9%+
- **Best for**: High-value users, fraud prevention

---

## 🔐 Supported Nigerian IDs

- ✅ **BVN** (Bank Verification Number) - Recommended
- ✅ **NIN** (National Identity Number)
- ✅ **Driver's License**
- ✅ **Voter's Card**
- ✅ **International Passport**
- ✅ **National ID Card**

---

## 🚀 Go Live Checklist

- [ ] Smile ID account created
- [ ] Sandbox credentials working
- [ ] Database migration completed
- [ ] Test script passing
- [ ] KYC service implemented
- [ ] Routes updated
- [ ] Frontend updated
- [ ] Bread integration synced
- [ ] Production credentials obtained
- [ ] Webhook configured
- [ ] Go live! 🎉

---

## 🆘 Need Help?

- **Smile ID Support**: support@usesmileid.com
- **Smile ID Docs**: https://docs.usesmileid.com
- **Smile ID Slack**: Community support

---

**Ready to implement proper KYC!** 🔐

