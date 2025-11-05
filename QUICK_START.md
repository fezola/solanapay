# Quick Start Guide

## ✅ Step 1: Backend Dependencies Installed!

The backend dependencies have been successfully installed. Here's what's been set up:

- ✅ All npm packages installed (455 packages)
- ✅ `.env` file created from template
- ✅ Encryption key generated automatically

## 🔧 Step 2: Configure Your Environment

You need to add your API keys to `backend/.env`. Here are the **required** variables:

### Required Configuration

Open `backend/.env` and update these values:

```bash
# 1. Supabase (Get from https://supabase.com/dashboard)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# 2. Solana RPC (Get free from https://www.helius.dev/ or use public)
SOLANA_RPC_URL=https://api.devnet.solana.com

# 3. Base RPC (Get free from https://www.alchemy.com/)
BASE_RPC_URL=https://base-mainnet.g.alchemy.com/v2/your-api-key

# 4. Paystack (Get from https://dashboard.paystack.com/)
PAYSTACK_SECRET_KEY=sk_test_your-secret-key
```

### Optional Configuration

These are already set with defaults, but you can customize:

```bash
# Already configured with sensible defaults:
- ENCRYPTION_KEY (✅ Already generated)
- PORT (3001)
- CORS_ORIGIN (http://localhost:5173)
- Token addresses (USDC, USDT)
- Fees and limits
```

## 🗄️ Step 3: Set Up Database

### Option A: Using Supabase (Recommended)

1. Go to https://supabase.com/dashboard
2. Create a new project
3. Go to SQL Editor
4. Copy and paste the contents of `backend/src/db/schema.sql`
5. Run the SQL

### Option B: Using Local PostgreSQL

```bash
psql -U postgres -d your_database -f backend/src/db/schema.sql
```

## 🚀 Step 4: Start the Backend

```bash
cd backend
npm run dev
```

You should see:
```
Server listening on http://localhost:3001
✓ Solana monitor started
✓ Base monitor started
```

## 🎨 Step 5: Start the Frontend

In a new terminal:

```bash
# From the project root
npm install
npm run dev
```

The frontend will be available at `http://localhost:5173`

## 🧪 Step 6: Test the API

### Test Health Endpoint

```bash
curl http://localhost:3001/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2024-..."
}
```

### Test Signup

```bash
curl -X POST http://localhost:3001/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

## 📝 What You Need to Get Started

### Minimum Requirements (Free Tier Available)

1. **Supabase Account** (Free)
   - Sign up at https://supabase.com
   - Create a project
   - Get your URL and Service Role Key from Settings > API

2. **Solana RPC** (Free)
   - Use public devnet: `https://api.devnet.solana.com`
   - Or get free tier from Helius: https://www.helius.dev/

3. **Base RPC** (Free)
   - Sign up at Alchemy: https://www.alchemy.com/
   - Create a Base app
   - Get your API key

4. **Paystack Account** (Free Test Mode)
   - Sign up at https://paystack.com
   - Get test keys from Settings > API Keys & Webhooks

## 🎯 Next Steps After Setup

1. **Test the Complete Flow**
   - Sign up a user
   - Get deposit addresses
   - Create a quote
   - Add a bank account (use Paystack test account numbers)
   - Execute a payout

2. **Integrate Frontend**
   - The API client is already created at `src/services/api.ts`
   - Follow `INTEGRATION_GUIDE.md` to connect your UI components

3. **Customize**
   - Adjust fees in `.env` (DEFAULT_SPREAD_BPS, FLAT_FEE_NGN)
   - Modify limits in the database
   - Add your branding

## 🐛 Troubleshooting

### "Cannot connect to Supabase"
- Check your `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`
- Make sure you're using the Service Role Key, not the Anon Key

### "RPC endpoint error"
- Check your RPC URLs are correct
- For Solana devnet, use: `https://api.devnet.solana.com`
- For Base, make sure you have a valid Alchemy API key

### "Port 3001 already in use"
- Change `PORT=3002` in your `.env` file
- Update frontend API URL to match

### "Database schema not found"
- Make sure you ran the SQL from `backend/src/db/schema.sql`
- Check Supabase dashboard > Table Editor to verify tables exist

## 📚 Documentation

- **PROJECT_SUMMARY.md** - Complete project overview
- **INTEGRATION_GUIDE.md** - How to connect frontend to backend
- **DEPLOYMENT_CHECKLIST.md** - Production deployment guide
- **backend/README.md** - Detailed API documentation

## 🎉 You're Ready!

Once you've completed steps 1-5, you'll have:
- ✅ Backend API running on http://localhost:3001
- ✅ Frontend UI running on http://localhost:5173
- ✅ Database set up with all tables
- ✅ Ready to test end-to-end flows

## 💡 Quick Test Checklist

- [ ] Backend starts without errors
- [ ] Frontend loads in browser
- [ ] Can sign up a new user
- [ ] Can log in
- [ ] Can see deposit addresses
- [ ] Can create a quote
- [ ] Can add a bank account
- [ ] Can view transactions

---

**Need Help?** Check the troubleshooting section above or review the detailed documentation files.

