# 🔧 KYC 400 Bad Request Fix

## 🎉 Progress!

You went from **401 Unauthorized** → **400 Bad Request**

This means **authentication is now working!** ✅

The 400 error means the backend is receiving your request but something is failing in the KYC initialization process.

---

## 🔍 What I Fixed

### 1. **Added Error Handling & Logging**

**File: `backend/src/routes/kyc.ts`**

Added comprehensive error handling and logging to the `/api/kyc/start` endpoint:

```typescript
fastify.post('/start', async (request, reply) => {
  const userId = request.userId!;

  console.log('🔵 KYC START ENDPOINT CALLED', { userId });

  if (sumsubService) {
    try {
      // Get user data
      const { data: user, error: userError } = await supabaseAdmin
        .from('users')
        .select('email, phone_number, kyc_tier, kyc_status')
        .eq('id', userId)
        .single();

      console.log('📊 User data fetched:', { 
        userId, 
        email: user?.email, 
        hasPhone: !!user?.phone_number,
        error: userError 
      });

      if (userError || !user) {
        console.error('❌ User not found:', userError);
        return reply.status(404).send({ error: 'User not found' });
      }

      // Initialize KYC with Sumsub
      console.log('🔄 Initializing Sumsub KYC...', { 
        userId, 
        email: user.email,
        phone: user.phone_number 
      });

      const result = await sumsubService.initializeKYC(
        userId,
        user.email,
        user.phone_number
      );

      console.log('✅ Sumsub KYC initialized:', { 
        applicantId: result.applicantId,
        hasAccessToken: !!result.accessToken 
      });

      return {
        provider: 'sumsub',
        applicantId: result.applicantId,
        accessToken: result.accessToken,
        message: 'KYC initialized. Use the access token with Sumsub Web SDK.',
      };
    } catch (error: any) {
      console.error('❌ Sumsub initialization error:', {
        error: error.message,
        stack: error.stack,
        response: error.response?.data,
      });

      return reply.status(400).send({
        error: 'Failed to initialize KYC',
        message: error.message,
        details: error.response?.data || error.toString(),
      });
    }
  }
  // ... rest of code
});
```

### 2. **Fixed Column Name**

Changed `phone` to `phone_number` (line 69) to match your actual database schema.

**Before:**
```typescript
.select('email, phone, kyc_tier, kyc_status')
```

**After:**
```typescript
.select('email, phone_number, kyc_tier, kyc_status')
```

---

## 🚀 Next Steps

### **Step 1: Deploy to Render**

Your backend code has been updated locally, but you need to deploy it to Render:

#### **Option A: Auto-Deploy (if enabled)**

If you have auto-deploy enabled on Render:

```bash
# Commit and push changes
git add .
git commit -m "Fix KYC endpoint error handling and phone column name"
git push origin main
```

Render will automatically redeploy.

#### **Option B: Manual Deploy**

1. Go to https://dashboard.render.com
2. Find your backend service
3. Click **"Manual Deploy"** → **"Deploy latest commit"**

### **Step 2: Check Render Logs**

Once deployed, check the logs on Render:

1. Go to your backend service on Render
2. Click **"Logs"** tab
3. Try to start KYC from your app
4. You should see detailed logs:
   ```
   🔵 KYC START ENDPOINT CALLED { userId: '...' }
   📊 User data fetched: { userId: '...', email: '...', hasPhone: true/false }
   🔄 Initializing Sumsub KYC...
   ```

If there's an error, you'll see:
```
❌ Sumsub initialization error: { error: '...', response: {...} }
```

This will tell us exactly what's wrong!

### **Step 3: Test Again**

After deployment:

1. Open your app
2. Log in
3. Navigate to KYC screen
4. Click "Upgrade to Tier 1"
5. Check browser console for the error response
6. Check Render logs for backend error details

---

## 🔍 Possible Causes of 400 Error

Based on the code, here are the most likely causes:

### 1. **Sumsub API Credentials Invalid**

Your `.env` has:
```
SUMSUB_APP_TOKEN=prd:1Q955efaZbrzrrSZVMbIIk92.77H1IudZzFKJKP2mogYOzLBlBgmyLcx5
SUMSUB_SECRET_KEY=GvgaKIxpCfkxkA8adxkZJFMjc6dfvN9t
SUMSUB_LEVEL_NAME=General
```

**Check:**
- Are these credentials correct?
- Is the level name "General" correct in your Sumsub dashboard?
- Are the credentials active (not expired)?

**How to verify:**
1. Go to https://cockpit.sumsub.com
2. Settings → App Tokens
3. Verify your token and secret key
4. Check that the level name matches exactly (case-sensitive!)

### 2. **Sumsub Level Name Mismatch**

The `SUMSUB_LEVEL_NAME=General` must match exactly what's in your Sumsub dashboard.

**How to check:**
1. Go to https://cockpit.sumsub.com
2. Settings → Levels
3. Copy the exact level name (case-sensitive!)
4. Update `.env` if different

### 3. **User Email Missing**

If the user doesn't have an email in the database, Sumsub might reject the request.

**How to check:**
Look at the Render logs after trying KYC. You should see:
```
📊 User data fetched: { userId: '...', email: 'user@example.com', hasPhone: false }
```

If `email` is null or undefined, that's the problem.

### 4. **Sumsub API Error**

Sumsub might be returning an error. The new error handling will show this in the logs:

```
❌ Sumsub initialization error: {
  error: 'Request failed with status code 400',
  response: {
    description: 'Invalid level name',
    code: 'INVALID_LEVEL'
  }
}
```

---

## 🧪 Testing Locally (Optional)

If you want to test locally before deploying to Render:

### 1. **Start Local Backend**

```bash
cd backend
npm run dev
```

### 2. **Update Frontend to Use Local Backend**

In your frontend `.env` or `vite.config.ts`:

```
VITE_API_URL=http://localhost:3001
```

### 3. **Test KYC Flow**

1. Open your app (should connect to local backend)
2. Log in
3. Try KYC
4. Check terminal logs for detailed error

### 4. **Switch Back to Render**

After testing, change back to:
```
VITE_API_URL=https://solanapay-xmli.onrender.com
```

---

## 📊 What the Logs Will Tell Us

After you deploy and try KYC again, the logs will show one of these scenarios:

### **Scenario 1: User Not Found**
```
🔵 KYC START ENDPOINT CALLED { userId: '...' }
❌ User not found: { error: '...' }
```
**Fix:** Check if user exists in database

### **Scenario 2: Sumsub Credentials Invalid**
```
🔵 KYC START ENDPOINT CALLED { userId: '...' }
📊 User data fetched: { ... }
🔄 Initializing Sumsub KYC...
❌ Sumsub initialization error: {
  error: 'Request failed with status code 401',
  response: { description: 'Invalid credentials' }
}
```
**Fix:** Update Sumsub credentials in Render environment variables

### **Scenario 3: Invalid Level Name**
```
🔵 KYC START ENDPOINT CALLED { userId: '...' }
📊 User data fetched: { ... }
🔄 Initializing Sumsub KYC...
❌ Sumsub initialization error: {
  error: 'Request failed with status code 400',
  response: { description: 'Level not found', code: 'LEVEL_NOT_FOUND' }
}
```
**Fix:** Update `SUMSUB_LEVEL_NAME` in Render environment variables

### **Scenario 4: Success!**
```
🔵 KYC START ENDPOINT CALLED { userId: '...' }
📊 User data fetched: { userId: '...', email: '...', hasPhone: false }
🔄 Initializing Sumsub KYC...
✅ Sumsub KYC initialized: { applicantId: '...', hasAccessToken: true }
```
**Result:** KYC works! 🎉

---

## 📝 Files Modified

✅ `backend/src/routes/kyc.ts` - Added error handling and logging  
✅ `backend/dist/routes/kyc.js` - Compiled output  

---

## 🎯 Summary

**What we fixed:**
1. ✅ Added comprehensive error handling to KYC endpoint
2. ✅ Added detailed logging to track the flow
3. ✅ Fixed column name from `phone` to `phone_number`
4. ✅ Backend now returns detailed error messages

**What you need to do:**
1. 🚀 Deploy updated backend to Render
2. 📊 Check Render logs when you try KYC
3. 📝 Share the error logs with me so I can help fix the specific issue

**The logs will tell us exactly what's wrong!** 🔍

---

## 🆘 If You Need Help

After deploying and testing, if you still get 400 error:

1. **Copy the error from browser console**
2. **Copy the logs from Render** (especially the lines with 🔵 📊 🔄 ❌ ✅)
3. **Share them with me**

I'll be able to tell you exactly what's wrong and how to fix it!

---

## 🎉 Expected Result

After deploying and fixing any Sumsub configuration issues, you should see:

✅ **No more 400 errors**  
✅ **Sumsub SDK loads in the frontend**  
✅ **Users can upload documents**  
✅ **Real KYC verification works**  

**We're almost there!** 🚀

