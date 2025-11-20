# 🚀 Admin Dashboard Quick Start

## Step 1: Set Your Admin Email

Open `backend/.env` and add your admin email:

```env
ADMIN_EMAIL=your-email@example.com
```

**Important:** Use the email address you want to have admin access.

---

## Step 2: Restart Backend Server

If the backend is running, restart it to load the new environment variable:

```bash
cd backend
npm run dev
```

---

## Step 3: Sign Up with Admin Email

1. Open your SolPay app
2. Sign up with the **exact same email** you set in `ADMIN_EMAIL`
3. Complete the signup process

---

## Step 4: Get Your JWT Token

After logging in, your JWT token is stored in the app. You can get it from:

**Option A: Browser DevTools (Web App)**
1. Open DevTools (F12)
2. Go to Application → Local Storage
3. Find the auth token

**Option B: From Login Response**
The login API returns a JWT token in the response.

---

## Step 5: Test Admin Access

Use the example script to test your admin access:

```bash
node admin-api-example.js YOUR_JWT_TOKEN
```

Or use curl:

```bash
curl -X GET "http://localhost:3001/api/admin/stats" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## 📊 Available Admin Endpoints

### 1. Dashboard Stats
```
GET /api/admin/stats
```
Returns: Total users, deposits, payouts, KYC stats

### 2. Transaction Analytics
```
GET /api/admin/analytics/transactions
```
Returns: USDC volumes, deposits by asset, offramps by status

### 3. All Transactions
```
GET /api/admin/analytics/all-transactions?limit=100
```
Returns: Detailed list of all deposits and offramps

### 4. Revenue Analytics
```
GET /api/admin/analytics/revenue
```
Returns: Total fees, volume, average fee percentage

### 5. User Management
```
GET /api/admin/users
GET /api/admin/users/:userId
PATCH /api/admin/users/:userId/status
```

### 6. Payout Management
```
GET /api/admin/payouts?status=success
```

---

## 🔍 Example: Check Platform Progress

```bash
# Get transaction analytics
curl -X GET "http://localhost:3001/api/admin/analytics/transactions" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" | jq

# Output shows:
# - Total USDC deposited
# - Total USDC offramped
# - Total NGN paid out
# - USDC balance (deposits - offramps)
# - Breakdown by asset and status
```

---

## 💡 Quick Tips

1. **Save your JWT token** - It's valid until you log out
2. **Use jq** for pretty JSON output: `curl ... | jq`
3. **Filter by date** - Add `?start_date=2024-01-01` to analytics endpoints
4. **Export data** - Save responses to files for reporting
5. **Monitor in real-time** - Set up a cron job to fetch stats periodically

---

## 🔒 Security Reminders

- ✅ Only the email in `ADMIN_EMAIL` has admin access
- ✅ All endpoints require valid JWT authentication
- ✅ Never commit `.env` file to git
- ✅ Use HTTPS in production
- ✅ Rotate admin credentials regularly

---

## 📖 Full Documentation

See `ADMIN_DASHBOARD_GUIDE.md` for complete API documentation and examples.

---

## ❓ Troubleshooting

### "Admin access required" error
- Check that `ADMIN_EMAIL` in `.env` matches your signup email exactly
- Restart the backend server after changing `.env`
- Make sure you're using a valid JWT token

### "Invalid or expired token" error
- Your JWT token may have expired
- Log in again to get a fresh token

### "Failed to fetch analytics" error
- Check that the backend server is running
- Verify the database connection is working
- Check backend logs for detailed error messages

---

## 🎯 Next Steps

1. ✅ Set `ADMIN_EMAIL` in `backend/.env`
2. ✅ Restart backend server
3. ✅ Sign up with admin email
4. ✅ Get JWT token
5. ✅ Test admin endpoints
6. 🚀 Build custom admin dashboard UI (optional)

---

**You're all set!** 🎉

You now have full admin access to monitor all transactions, USDC volumes, offramps, and platform progress.

