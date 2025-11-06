# 🧪 Testing Your Fixed KYC System

## Quick Test Checklist

### ✅ Pre-Test Verification

1. **Check Sumsub Credentials in `.env`:**
   ```bash
   cd backend
   cat .env | grep SUMSUB
   ```
   
   Should show:
   ```
   SUMSUB_APP_TOKEN=prd:1Q955efaZbrzrrSZVMbIIk92.77H1IudZzFKJKP2mogYOzLBlBgmyLcx5
   SUMSUB_SECRET_KEY=GvgaKIxpCfkxkA8adxkZJFMjc6dfvN9t
   SUMSUB_BASE_URL=https://api.sumsub.com
   SUMSUB_LEVEL_NAME=General
   KYC_AUTO_APPROVE=false
   ```

2. **Verify Backend is Running:**
   ```bash
   cd backend
   npm run dev
   ```
   
   Look for:
   ```
   ✅ Server listening on port 3001
   ✅ Sumsub service initialized (or similar message)
   ```

3. **Verify Frontend is Running:**
   ```bash
   npm run dev
   ```

---

## 🎯 Test Scenario 1: New User KYC

### Step 1: Create/Login User
1. Open app in browser: `http://localhost:5173`
2. Create new account or login
3. Navigate to Profile/Settings

### Step 2: Start KYC
1. Look for KYC section showing "Tier 0 - Basic"
2. Click **"Upgrade to Tier 1"** button
3. **Expected:** Button shows "Initializing..."

### Step 3: Verify Sumsub SDK Loads
1. **Expected:** After 2-3 seconds, you should see:
   - Sumsub verification widget appears
   - Widget shows document selection screen
   - No error messages

2. **If you see error:**
   - Open browser console (F12)
   - Check for error messages
   - Verify Sumsub script loaded: Look for `snsWebSdk` in console

### Step 4: Complete Verification
1. **Select Document Type:**
   - Choose "Passport" or "ID Card"
   - Click Continue

2. **Upload Document:**
   - Click "Upload" or "Take Photo"
   - Select a clear photo of your ID
   - **For Testing:** You can use sample IDs from Sumsub docs

3. **Take Selfie:**
   - Follow on-screen instructions
   - Ensure good lighting
   - Look directly at camera
   - Complete liveness check

4. **Submit:**
   - Review your submission
   - Click "Submit" or "Confirm"

### Step 5: Verify Completion
1. **Expected:** After submission:
   - Screen shows "Verification Complete"
   - Shows Applicant ID
   - Status changes to "pending"
   - Success message appears

2. **Check Backend Logs:**
   ```
   Look for:
   ✅ Sumsub applicant created
   ✅ User updated with Sumsub applicant ID
   ```

---

## 🎯 Test Scenario 2: Check Sumsub Dashboard

### Step 1: Login to Sumsub
1. Go to: https://cockpit.sumsub.com
2. Login with your Sumsub account

### Step 2: Find Your Applicant
1. Click **"Applicants"** in sidebar
2. Look for your test user
3. **Expected:** You should see:
   - Applicant ID matches what's shown in app
   - Status: "pending" or "completed"
   - Documents uploaded

### Step 3: Review Documents
1. Click on the applicant
2. **Expected:** You should see:
   - Document images uploaded
   - Selfie photo
   - Verification checks (if completed)

---

## 🎯 Test Scenario 3: Webhook Testing (Optional)

### Step 1: Setup Webhook URL
1. In Sumsub dashboard, go to **Settings → Webhooks**
2. Add webhook URL: `https://your-backend-url.com/api/webhooks/sumsub`
3. Select events: `applicantReviewed`, `applicantPending`

### Step 2: Trigger Webhook
1. In Sumsub dashboard, manually approve/reject an applicant
2. **Expected:** Backend receives webhook

### Step 3: Check Backend Logs
```bash
cd backend
# Look for webhook logs
```

Expected:
```
✅ Sumsub webhook received
✅ Processing webhook: applicantReviewed
✅ User status updated
```

---

## 🐛 Common Issues & Fixes

### Issue 1: "KYC provider not configured"

**Symptoms:**
- Error message when clicking "Upgrade to Tier 1"
- No Sumsub widget appears

**Fix:**
```bash
# 1. Check .env file
cd backend
cat .env | grep SUMSUB

# 2. Verify credentials are set
# 3. Restart backend
npm run dev
```

### Issue 2: Sumsub SDK doesn't load

**Symptoms:**
- Blank screen after clicking upgrade
- Console error: "snsWebSdk is not defined"

**Fix:**
1. Check internet connection
2. Verify script URL is accessible:
   - Open: `https://static.sumsub.com/idensic/static/sns-websdk-builder.js`
3. Clear browser cache
4. Try different browser

### Issue 3: "Invalid access token"

**Symptoms:**
- Sumsub widget shows error
- Console error about token

**Fix:**
```bash
# 1. Check Sumsub credentials are correct
# 2. Verify SUMSUB_LEVEL_NAME matches your flow
cd backend
cat .env | grep SUMSUB_LEVEL_NAME

# 3. Check Sumsub dashboard for flow name
# 4. Update .env if needed
```

### Issue 4: Documents not uploading

**Symptoms:**
- Upload button doesn't work
- Files don't appear after selection

**Fix:**
1. Check file size (max 10MB)
2. Check file format (JPG, PNG, PDF)
3. Try different file
4. Check browser console for errors

---

## 📊 Success Criteria

Your KYC system is working correctly if:

- ✅ Sumsub SDK loads without errors
- ✅ Users can select document type
- ✅ Users can upload/capture documents
- ✅ Users can take selfie
- ✅ Submission completes successfully
- ✅ Status changes to "pending"
- ✅ Applicant appears in Sumsub dashboard
- ✅ Documents are visible in Sumsub dashboard
- ✅ No console errors
- ✅ Backend logs show successful initialization

---

## 🔍 Debugging Tips

### Check Frontend Console
```javascript
// Open browser console (F12) and run:
console.log(window.snsWebSdk); // Should show SDK object
```

### Check Backend Logs
```bash
cd backend
npm run dev

# Look for:
# - "Sumsub service initialized"
# - "Initializing KYC for user"
# - "Sumsub access token generated"
```

### Check Network Tab
1. Open browser DevTools (F12)
2. Go to Network tab
3. Filter by "XHR" or "Fetch"
4. Look for:
   - `/api/kyc/start` - Should return 200 with accessToken
   - Sumsub API calls - Should return 200

### Check Sumsub API Directly
```bash
# Test Sumsub API connection
curl -X GET https://api.sumsub.com/resources/applicants \
  -H "X-App-Token: YOUR_APP_TOKEN" \
  -H "X-App-Access-Sig: YOUR_SIGNATURE" \
  -H "X-App-Access-Ts: TIMESTAMP"
```

---

## 📝 Test Results Template

Use this to document your test:

```
## Test Date: [DATE]
## Tester: [YOUR NAME]

### Environment
- Frontend URL: http://localhost:5173
- Backend URL: http://localhost:3001
- Sumsub Mode: [Sandbox/Production]

### Test Results

#### Pre-Test Checks
- [ ] Sumsub credentials configured
- [ ] Backend running
- [ ] Frontend running
- [ ] No console errors on load

#### KYC Flow
- [ ] "Upgrade to Tier 1" button works
- [ ] Sumsub SDK loads
- [ ] Document selection works
- [ ] Document upload works
- [ ] Selfie capture works
- [ ] Submission completes
- [ ] Status changes to "pending"

#### Sumsub Dashboard
- [ ] Applicant appears in dashboard
- [ ] Documents visible
- [ ] Correct status shown

#### Issues Found
[List any issues here]

#### Notes
[Any additional notes]
```

---

## 🎉 Next Steps After Testing

Once testing is successful:

1. **Configure Production Credentials:**
   - Get production Sumsub credentials
   - Update `.env` file
   - Test with real documents

2. **Setup Webhooks:**
   - Configure webhook URL in Sumsub
   - Test webhook delivery
   - Verify status updates

3. **Monitor in Production:**
   - Check Sumsub dashboard regularly
   - Monitor backend logs
   - Track verification success rate

4. **User Communication:**
   - Add help text for users
   - Provide support contact
   - Document common issues

