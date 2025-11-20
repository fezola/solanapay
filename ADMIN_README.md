# 🔐 SolPay Admin Dashboard

> Complete admin system for monitoring all platform transactions, USDC volumes, and offramp progress.

---

## 🎯 What This Does

This admin dashboard gives you **complete visibility** into your SolPay platform:

- ✅ **Track all transactions** - Every deposit and offramp across all users
- ✅ **Monitor USDC volumes** - Total deposited, offramped, and current balance
- ✅ **View NGN payouts** - Total amount paid out to user bank accounts
- ✅ **Calculate revenue** - Platform fees and transaction volumes
- ✅ **User analytics** - Total users, active users, KYC status
- ✅ **Real-time updates** - Auto-refreshing dashboard

---

## 🚀 Quick Start (3 Steps)

### 1. Set Admin Email
```bash
# Edit backend/.env
ADMIN_EMAIL=your-email@example.com
```

### 2. Restart Backend
```bash
cd backend
npm run dev
```

### 3. Open Dashboard
```bash
# Open admin-dashboard.html in your browser
# Sign up with your admin email
# Paste your JWT token
# Done! 🎉
```

---

## 📊 What You Can See

### Platform Overview
- Total users (registered vs active)
- Total deposits and offramps
- KYC approval statistics

### USDC Tracking
- **Total USDC Deposited**: All USDC received from users
- **Total USDC Offramped**: USDC converted to NGN
- **USDC Balance**: Platform liquidity (deposits - offramps)

### Financial Metrics
- **NGN Paid Out**: Total fiat sent to user bank accounts
- **Platform Revenue**: Total fees collected
- **Average Fee %**: Fee percentage across all transactions

### Transaction Details
- Every deposit with blockchain hash
- Every offramp with bank details
- User information for each transaction
- Status tracking and timestamps

---

## 📁 Files Included

### 🌐 Web Dashboard
- **`admin-dashboard.html`** - Beautiful web UI (just open in browser)

### 💻 Command Line Tools
- **`admin-api-example.js`** - Node.js script for terminal access
- **`test-admin-endpoints.ps1`** - PowerShell test script (Windows)
- **`test-admin-endpoints.sh`** - Bash test script (Mac/Linux)

### 📖 Documentation
- **`ADMIN_SETUP_QUICK_START.md`** - Setup instructions
- **`ADMIN_DASHBOARD_GUIDE.md`** - Complete API documentation
- **`ADMIN_IMPLEMENTATION_SUMMARY.md`** - Feature overview
- **`ADMIN_ARCHITECTURE.md`** - Technical architecture
- **`ADMIN_README.md`** - This file

---

## 🔌 API Endpoints

All endpoints require JWT authentication:
```
Authorization: Bearer YOUR_JWT_TOKEN
```

### Core Analytics
```
GET /api/admin/analytics/transactions
GET /api/admin/analytics/all-transactions
GET /api/admin/analytics/revenue
GET /api/admin/stats
```

### Management
```
GET /api/admin/users
GET /api/admin/users/:id
GET /api/admin/payouts
PATCH /api/admin/users/:id/status
```

---

## 💡 Usage Examples

### Web Dashboard
1. Open `admin-dashboard.html`
2. Enter your JWT token
3. Click "Connect"
4. View real-time analytics!

### Command Line
```bash
# Get all analytics
node admin-api-example.js YOUR_JWT_TOKEN

# Test all endpoints
./test-admin-endpoints.sh YOUR_JWT_TOKEN
# or on Windows:
.\test-admin-endpoints.ps1 YOUR_JWT_TOKEN
```

### Direct API
```bash
# Get transaction analytics
curl -X GET "http://localhost:3001/api/admin/analytics/transactions" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Get recent transactions
curl -X GET "http://localhost:3001/api/admin/analytics/all-transactions?limit=20" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Get revenue stats
curl -X GET "http://localhost:3001/api/admin/analytics/revenue" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## 🔒 Security

- ✅ **Admin-only access** - Only email in `ADMIN_EMAIL` can access
- ✅ **JWT authentication** - All requests require valid token
- ✅ **Read-only** - Admin endpoints don't modify data
- ✅ **Environment-based** - Admin email configured via .env
- ✅ **Audit trail** - All admin API calls are logged

---

## 📈 Common Use Cases

### Daily Progress Check
```bash
curl "http://localhost:3001/api/admin/analytics/transactions?start_date=2024-01-15" \
  -H "Authorization: Bearer TOKEN"
```

### Monthly Revenue Report
```bash
curl "http://localhost:3001/api/admin/analytics/revenue?start_date=2024-01-01&end_date=2024-01-31" \
  -H "Authorization: Bearer TOKEN"
```

### Investigate User
```bash
curl "http://localhost:3001/api/admin/analytics/all-transactions?user_id=USER_UUID" \
  -H "Authorization: Bearer TOKEN"
```

### Review Failed Transactions
```bash
curl "http://localhost:3001/api/admin/analytics/all-transactions?type=offramp&status=failed" \
  -H "Authorization: Bearer TOKEN"
```

---

## 🎨 Dashboard Features

The web dashboard (`admin-dashboard.html`) includes:

- 📊 **6 Key Metrics Cards**
  - Total Users (with active count)
  - USDC Deposited
  - USDC Offramped
  - NGN Paid Out
  - USDC Balance
  - Total Revenue

- 📋 **Recent Transactions Feed**
  - Last 20 transactions
  - Color-coded by type
  - Status indicators
  - User information

- 🔄 **Auto-Refresh**
  - Updates every 30 seconds
  - Always shows latest data

---

## ❓ Troubleshooting

### "Admin access required" error
- Check `ADMIN_EMAIL` in `.env` matches your signup email exactly
- Restart backend after changing `.env`
- Verify you're using a valid JWT token

### "Invalid or expired token" error
- JWT token may have expired
- Log in again to get a fresh token

### "Failed to fetch analytics" error
- Check backend server is running
- Verify database connection
- Check backend logs for details

---

## 📚 Documentation

- **Quick Start**: `ADMIN_SETUP_QUICK_START.md`
- **API Reference**: `ADMIN_DASHBOARD_GUIDE.md`
- **Implementation**: `ADMIN_IMPLEMENTATION_SUMMARY.md`
- **Architecture**: `ADMIN_ARCHITECTURE.md`

---

## 🎯 What's Next?

You can now:
- ✅ Monitor all platform activity in real-time
- ✅ Track USDC deposits and offramps
- ✅ Calculate platform revenue
- ✅ Generate reports for any time period
- ✅ Investigate specific users or transactions
- ✅ Build custom integrations using the API

---

## 💬 Support

Need help? Check the documentation files or review the backend logs for detailed error messages.

---

**Built with ❤️ for SolPay**

Your admin dashboard is ready to use! 🚀

