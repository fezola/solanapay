# 🚨 Production Deployment Fix

## Issues Found

### 1. ❌ Balance Showing 0.00
**Problem:** Your deposit exists in the database (0.5 USDC confirmed) but the frontend shows 0.00

**Root Cause:** Production backend on Render doesn't have the latest code with the fixed balance API

### 2. ❌ Quote API Returning 400 Error
**Problem:** `POST /api/rates/quote` returns 400 Bad Request

**Root Cause:** Frontend is sending invalid data (amount as 0 or wrong format)

---

## ✅ Solution

### Step 1: Redeploy Backend to Render

Your backend on Render needs the latest code. Here's how:

#### Option A: Push to Git (Recommended)

```bash
cd backend

# Commit latest changes
git add .
git commit -m "Fix balance API and offramp execution"
git push origin main
```

Render will automatically redeploy when you push to main.

#### Option B: Manual Deploy in Render Dashboard

1. Go to https://dashboard.render.com
2. Find your backend service (`solanapay-xmli`)
3. Click **"Manual Deploy"** → **"Deploy latest commit"**
4. Wait 2-3 minutes for deployment

---

### Step 2: Verify Database Has Your Deposit

✅ **Already Verified!** Your deposit is in the database:

```sql
SELECT * FROM onchain_deposits 
WHERE user_id = '3a6f2eb9-4138-4f3b-9c47-3fa26cdee341';
```

**Result:**
- Amount: 0.5 USDC
- Status: confirmed
- Chain: solana
- TX: 2ujxPXAETcVsomMhHeXK7StiNi67w9bvXkavS3F2TYL556TQzPwjAdXygY8rnw3oLdDhzMEEcr3jg91jpfyKp3nT

---

### Step 3: Fix Frontend Quote Request

The quote API expects this format:

```typescript
// ✅ CORRECT
{
  "asset": "solana:usdc",
  "amount": 0.5,           // ← Must be NUMBER > 0
  "currency": "NGN"
}

// ❌ WRONG
{
  "asset": "solana:usdc",
  "amount": 0,             // ← Zero is invalid
  "currency": "NGN"
}

// ❌ WRONG
{
  "asset": "solana:usdc",
  "amount": "0.5",         // ← String is invalid
  "currency": "NGN"
}
```

**Check your frontend code** where you call the quote API. Make sure:
1. Amount is converted to a number: `parseFloat(amount)`
2. Amount is greater than 0
3. Asset format is correct: `"solana:usdc"` not `"USDC (Solana)"`

---

### Step 4: Test After Redeployment

#### Test Balance API

```bash
# Replace <your-token> with your actual auth token
curl https://solanapay-xmli.onrender.com/api/deposits/balances \
  -H "Authorization: Bearer <your-token>"
```

**Expected Response:**
```json
{
  "balances": {
    "usdcSolana": 0.5,
    "usdcBase": 0,
    "sol": 0,
    "usdtSolana": 0,
    "eth": 0
  }
}
```

#### Test Quote API

```bash
curl -X POST https://solanapay-xmli.onrender.com/api/rates/quote \
  -H "Content-Type: application/json" \
  -d '{
    "asset": "solana:usdc",
    "amount": 0.5,
    "currency": "NGN"
  }'
```

**Expected Response:**
```json
{
  "quote": {
    "asset": "solana:usdc",
    "crypto_amount": "0.5",
    "fiat_amount": "825.00",
    "rate": "1650.00",
    "fee": "8.25",
    "currency": "NGN"
  }
}
```

---

## 🔍 Debugging Steps

### Check Backend Logs on Render

1. Go to https://dashboard.render.com
2. Click on your backend service
3. Click **"Logs"** tab
4. Look for errors when you try to fetch balance or quote

### Check Frontend Console

Open browser console (F12) and look for:

```javascript
// Balance request
GET https://solanapay-xmli.onrender.com/api/deposits/balances

// Quote request
POST https://solanapay-xmli.onrender.com/api/rates/quote
```

Check the **Request Payload** to see what data is being sent.

---

## 🛠️ Frontend Code Fixes

### Fix Balance Display

Make sure your frontend is calling the correct endpoint:

```typescript
// src/services/api.ts or wherever you fetch balance
const fetchBalance = async (token: string) => {
  const response = await fetch(
    'https://solanapay-xmli.onrender.com/api/deposits/balances',
    {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }
  );
  
  const data = await response.json();
  
  // data.balances = {
  //   usdcSolana: 0.5,
  //   usdcBase: 0,
  //   sol: 0,
  //   usdtSolana: 0,
  //   eth: 0
  // }
  
  return data.balances;
};
```

### Fix Quote Request

Make sure amount is a number:

```typescript
// src/components/OfframpScreen.tsx
const getQuote = async (asset: string, amount: string) => {
  // Convert amount to number
  const numAmount = parseFloat(amount);
  
  // Validate
  if (isNaN(numAmount) || numAmount <= 0) {
    console.error('Invalid amount:', amount);
    return;
  }
  
  // Map asset to Bread format
  const assetMap: Record<string, string> = {
    'usdc-solana': 'solana:usdc',
    'usdc-base': 'base:usdc',
    'usdt-solana': 'solana:usdt',
    'sol': 'solana:sol',
  };
  
  const breadAsset = assetMap[asset];
  if (!breadAsset) {
    console.error('Unknown asset:', asset);
    return;
  }
  
  const response = await fetch(
    'https://solanapay-xmli.onrender.com/api/rates/quote',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        asset: breadAsset,      // ← "solana:usdc"
        amount: numAmount,      // ← 0.5 (number)
        currency: 'NGN'
      })
    }
  );
  
  if (!response.ok) {
    const error = await response.json();
    console.error('Quote error:', error);
    return;
  }
  
  const data = await response.json();
  return data.quote;
};
```

---

## 📋 Checklist

- [ ] Backend redeployed to Render with latest code
- [ ] Deployment successful (check Render dashboard)
- [ ] Backend logs show no errors
- [ ] Test balance API - returns 0.5 USDC
- [ ] Test quote API - returns valid quote
- [ ] Frontend updated to send correct quote format
- [ ] Frontend shows balance correctly
- [ ] Quote works without 400 error

---

## 🚀 Quick Fix Commands

```bash
# 1. Commit and push latest backend code
cd backend
git add .
git commit -m "Fix balance and quote APIs"
git push origin main

# 2. Wait 2-3 minutes for Render to redeploy

# 3. Test balance API
curl https://solanapay-xmli.onrender.com/api/deposits/balances \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"

# 4. Test quote API
curl -X POST https://solanapay-xmli.onrender.com/api/rates/quote \
  -H "Content-Type: application/json" \
  -d '{"asset":"solana:usdc","amount":0.5,"currency":"NGN"}'
```

---

## 💡 Common Issues

### Issue: Balance still shows 0 after redeployment

**Solution:** Clear browser cache or hard refresh (Ctrl+Shift+R)

### Issue: Quote still returns 400

**Solution:** Check browser console to see what data is being sent. Make sure:
- `amount` is a number, not string
- `amount` is greater than 0
- `asset` format is `"solana:usdc"` not `"USDC (Solana)"`

### Issue: "Unauthorized" error

**Solution:** Make sure you're sending the auth token in the Authorization header

---

## 📞 Need Help?

If issues persist after redeployment:

1. Check Render logs for backend errors
2. Check browser console for frontend errors
3. Share the exact error message
4. Share the request payload from browser Network tab


