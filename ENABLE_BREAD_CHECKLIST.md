# ✅ Enable Bread Africa - Checklist

Follow these steps to enable Bread Africa integration in your SolPay app.

## 📋 Pre-requisites

- [ ] You have received your Bread API key from Bread Africa
- [ ] You have access to Bread dashboard (https://dashboard.bread.africa or similar)
- [ ] Your backend server is running

---

## 🔧 Step 1: Configure Environment Variables

**File:** `backend/.env`

✅ **DONE** - I've already added the Bread configuration to your `.env` file!

Now you just need to update these values when you get your API key:

```env
BREAD_API_KEY=sk_test_your_bread_api_key_here    # ← Replace with your actual key
BREAD_WEBHOOK_SECRET=your_webhook_secret_here     # ← Replace with webhook secret
BREAD_ENABLED=false                                # ← Keep false until testing is done
```

---

## 🗄️ Step 2: Run Database Migration

Open terminal and run:

```bash
cd backend
npm run migrate:bread
```

**Expected output:**
```
✓ Executing migration statements
✓ Bread integration migration completed successfully
```

**What this does:**
- Adds `bread_identity_id` to `users` table
- Adds `bread_beneficiary_id` to `payout_beneficiaries` table
- Adds `bread_wallet_id` to `deposit_addresses` table
- Adds `bread_offramp_id` to `payouts` table
- Creates `bread_webhook_events` table
- Creates `bread_api_logs` table

---

## 🧪 Step 3: Test Integration

Once you have your API key, test it:

```bash
npm run test:bread
```

**Expected output:**
```
🍞 Testing Bread Africa Integration

1️⃣  Initializing Bread service...
✅ Bread service initialized

2️⃣  Testing API connectivity...
✅ Bread API is healthy

3️⃣  Testing identity creation...
✅ Identity created

4️⃣  Testing beneficiary creation...
✅ Beneficiary created

5️⃣  Testing wallet creation (Solana)...
✅ Solana wallet created

6️⃣  Testing wallet creation (Base)...
✅ Base wallet created

7️⃣  Testing rate fetching (USDC → NGN)...
✅ Rate fetched

8️⃣  Testing quote calculation...
✅ Quote calculated

🎉 All tests passed!
```

**If tests fail:**
- Check your API key is correct
- Check your internet connection
- Check Bread API status
- See troubleshooting section below

---

## 🌐 Step 4: Configure Webhook in Bread Dashboard

1. Log in to Bread dashboard
2. Go to Settings → Webhooks
3. Add webhook URL: `https://your-domain.com/api/webhooks/bread`
4. Copy the webhook secret
5. Update `BREAD_WEBHOOK_SECRET` in `.env`

**For local testing:**
- Use ngrok or similar: `ngrok http 3001`
- Use the ngrok URL: `https://abc123.ngrok.io/api/webhooks/bread`

---

## ✅ Step 5: Enable Bread

Once all tests pass, enable Bread:

**File:** `backend/.env`

```env
BREAD_ENABLED=true  # ← Change from false to true
```

---

## 🔄 Step 6: Restart Server

```bash
# Stop current server (Ctrl+C)
npm run dev
```

**Look for this in the logs:**
```
🚀 Server running on port 3001
📊 Environment: development
🔗 Solana Network: devnet
🔗 Base Chain ID: 8453
🍞 Bread Integration: ENABLED  ← Should say ENABLED
```

---

## 🎯 Step 7: Test with Real User

1. Create a new test user in your app
2. Complete KYC
3. Add bank account
4. Request deposit address
5. Send small amount of crypto (e.g., 1 USDC)
6. Check if payout arrives in bank account

**Monitor logs:**
```bash
tail -f logs/app.log | grep Bread
```

**Check database:**
```sql
-- Check if user synced with Bread
SELECT id, email, bread_identity_id, bread_identity_status 
FROM users 
WHERE bread_identity_id IS NOT NULL;

-- Check if wallet created
SELECT user_id, chain, asset, address, bread_wallet_id 
FROM deposit_addresses 
WHERE bread_wallet_id IS NOT NULL;
```

---

## 🎊 Done!

Your app is now using Bread Africa! 🎉

**What's changed:**
- ✅ Deposit addresses now come from Bread wallets
- ✅ Exchange rates come from Bread API
- ✅ Payouts go through Bread (not Paystack)
- ✅ Crypto auto-converts to fiat when received
- ✅ No more blockchain monitoring needed
- ✅ No more sweep logic needed

---

## 🔙 Rollback (If Needed)

To disable Bread and go back to legacy system:

1. Set `BREAD_ENABLED=false` in `.env`
2. Restart server
3. Done! Legacy system takes over

**Note:** Existing Bread wallets will remain in database but won't be used.

---

## 🐛 Troubleshooting

### "BREAD_API_KEY not configured"
→ Add your API key to `.env` file

### "Migration failed"
→ Check Supabase connection
→ Check if tables already exist (migration is idempotent)

### "Test failed: 401 Unauthorized"
→ API key is incorrect
→ Check for extra spaces in `.env`

### "Test failed: Network error"
→ Check internet connection
→ Check `BREAD_API_URL` is correct

### "Webhook not received"
→ Check webhook URL is publicly accessible
→ Check webhook secret matches
→ Check firewall settings

### "User not synced with Bread"
→ User needs to complete KYC first
→ Check `bread_identity_id` in database

### "No default beneficiary found"
→ User needs to add bank account first
→ Check `is_default` flag in `payout_beneficiaries`

---

## 📊 Monitoring

### Check Bread Status

```bash
# Check if Bread is enabled
grep BREAD_ENABLED backend/.env

# Check logs
tail -f logs/app.log | grep Bread

# Check webhook events
psql -c "SELECT * FROM bread_webhook_events ORDER BY created_at DESC LIMIT 10;"
```

### Database Queries

```sql
-- Users synced with Bread
SELECT COUNT(*) FROM users WHERE bread_identity_id IS NOT NULL;

-- Bread wallets
SELECT COUNT(*) FROM deposit_addresses WHERE bread_wallet_id IS NOT NULL;

-- Bread payouts
SELECT COUNT(*) FROM payouts WHERE bread_offramp_id IS NOT NULL;

-- Recent webhook events
SELECT event_type, processed, created_at 
FROM bread_webhook_events 
ORDER BY created_at DESC 
LIMIT 10;

-- Failed webhooks
SELECT * FROM bread_webhook_events 
WHERE processed = false 
ORDER BY created_at DESC;
```

---

## 📞 Support

- **Quick Start**: `BREAD_QUICK_START.md`
- **Full Guide**: `BREAD_INTEGRATION_GUIDE.md`
- **Service Docs**: `backend/src/services/bread/README.md`
- **Bread Docs**: https://docs.bread.africa

---

## ✅ Final Checklist

Before going to production:

- [ ] API key configured in `.env`
- [ ] Database migration completed
- [ ] Integration tests passing
- [ ] Webhook configured in Bread dashboard
- [ ] Webhook secret configured in `.env`
- [ ] Tested with test user
- [ ] Small test transaction successful
- [ ] Payout received in bank account
- [ ] Logs showing Bread events
- [ ] Database showing Bread records
- [ ] Monitoring set up
- [ ] Team trained on new system
- [ ] Rollback plan documented

---

**Ready to enable Bread!** 🚀

