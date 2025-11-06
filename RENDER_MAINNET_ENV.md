# 🔧 Render Environment Variables for Mainnet

Copy these environment variables to your Render dashboard.

**Dashboard:** https://dashboard.render.com → **solanapay-backend** → **Environment**

---

## ✅ Required Changes for Mainnet

### 1. Solana Network Configuration

```env
# Change this from 'devnet' to 'mainnet-beta'
SOLANA_NETWORK=mainnet-beta
```

### 2. Solana RPC URL

**Option A: Free Solana RPC (Not Recommended for Production)**
```env
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
```

**Option B: Helius (Recommended - Free Tier Available)** ⭐
```env
SOLANA_RPC_URL=https://mainnet.helius-rpc.com/?api-key=YOUR_API_KEY
```

**Option C: QuickNode**
```env
SOLANA_RPC_URL=https://YOUR_ENDPOINT.solana-mainnet.quiknode.pro/YOUR_API_KEY/
```

**Option D: Alchemy**
```env
SOLANA_RPC_URL=https://solana-mainnet.g.alchemy.com/v2/YOUR_API_KEY
```

### 3. Token Mint Addresses (Already Correct)

These should already be set correctly, but verify:

```env
# Mainnet USDC
USDC_SOL_MINT=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v

# Mainnet USDT
USDT_SOL_MINT=Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB
```

### 4. Treasury Wallet (CRITICAL!)

⚠️ **You MUST set these for mainnet to work:**

```env
# Your Solana mainnet wallet address (public key)
SOLANA_TREASURY_ADDRESS=YOUR_WALLET_ADDRESS_HERE

# Your wallet's private key (JSON array format)
SOLANA_TREASURY_PRIVATE_KEY=[1,2,3,4,5,...]
```

**How to generate:**
```bash
# Install Solana CLI
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"

# Generate keypair
solana-keygen new --outfile ~/solpay-treasury.json

# Get public address
solana-keygen pubkey ~/solpay-treasury.json

# Get private key (copy the entire JSON array)
cat ~/solpay-treasury.json
```

**⚠️ SECURITY:**
- Fund this wallet with at least **0.1 SOL** for gas fees
- **NEVER** commit the private key to Git
- Store it ONLY in Render's environment variables

---

## 📋 Complete Environment Variables List

Here's the complete list of environment variables you should have on Render:

```env
# ============================================================================
# ENVIRONMENT
# ============================================================================
NODE_ENV=production
PORT=3000
CORS_ORIGIN=https://your-frontend-domain.com

# ============================================================================
# SUPABASE
# ============================================================================
SUPABASE_URL=https://xojmrgsyshjoddylwxti.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# ============================================================================
# SECURITY
# ============================================================================
ENCRYPTION_KEY=your-32-byte-hex-key

# ============================================================================
# SOLANA (MAINNET) ⭐ UPDATED FOR MAINNET
# ============================================================================
SOLANA_RPC_URL=https://mainnet.helius-rpc.com/?api-key=YOUR_API_KEY
SOLANA_NETWORK=mainnet-beta
SOLANA_TREASURY_ADDRESS=YOUR_WALLET_ADDRESS
SOLANA_TREASURY_PRIVATE_KEY=[1,2,3,4,5,...]
USDC_SOL_MINT=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v
USDT_SOL_MINT=Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB

# ============================================================================
# BASE (Already Mainnet)
# ============================================================================
BASE_RPC_URL=https://base-mainnet.g.alchemy.com/v2/YOUR_API_KEY
BASE_CHAIN_ID=8453
BASE_TREASURY_ADDRESS=YOUR_ETH_WALLET_ADDRESS
BASE_TREASURY_PRIVATE_KEY=YOUR_ETH_PRIVATE_KEY
BASE_USDC_CONTRACT=0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913

# ============================================================================
# BREAD AFRICA (Offramp)
# ============================================================================
BREAD_API_KEY=your-bread-api-key
BREAD_API_URL=https://processor-prod.up.railway.app
BREAD_ENABLED=true

# ============================================================================
# SUMSUB (KYC)
# ============================================================================
SUMSUB_APP_TOKEN=your-sumsub-app-token
SUMSUB_SECRET_KEY=your-sumsub-secret-key
SUMSUB_BASE_URL=https://api.sumsub.com
SUMSUB_LEVEL_NAME=General
KYC_AUTO_APPROVE=false

# ============================================================================
# PRICE FEEDS
# ============================================================================
PYTH_PRICE_SERVICE_URL=https://hermes.pyth.network

# ============================================================================
# LOGGING
# ============================================================================
LOG_LEVEL=info

# ============================================================================
# FEES & LIMITS
# ============================================================================
DEFAULT_SPREAD_BPS=50
FLAT_FEE_NGN=100
VARIABLE_FEE_BPS=100
QUOTE_LOCK_SECONDS=120
MIN_CONFIRMATIONS_SOLANA=1
MIN_CONFIRMATIONS_BASE=12
SWEEP_THRESHOLD_SOL=0.1
SWEEP_THRESHOLD_USDC=10
SWEEP_THRESHOLD_USDT=10
```

---

## 🚀 Deployment Steps

1. **Go to Render Dashboard:**
   - https://dashboard.render.com
   - Click on **solanapay-backend**
   - Go to **Environment** tab

2. **Update These Variables:**
   - `SOLANA_NETWORK` → `mainnet-beta`
   - `SOLANA_RPC_URL` → Your mainnet RPC URL
   - `SOLANA_TREASURY_ADDRESS` → Your wallet address
   - `SOLANA_TREASURY_PRIVATE_KEY` → Your wallet private key

3. **Click "Save Changes"**
   - Render will automatically redeploy (takes 2-3 minutes)

4. **Verify Deployment:**
   - Check logs for: `✅ Connected to Solana mainnet-beta`
   - Check logs for: `✅ Treasury address: YOUR_ADDRESS`

---

## ✅ Verification Checklist

After updating environment variables:

- [ ] `SOLANA_NETWORK=mainnet-beta` (not devnet)
- [ ] `SOLANA_RPC_URL` points to mainnet
- [ ] `SOLANA_TREASURY_ADDRESS` is set
- [ ] `SOLANA_TREASURY_PRIVATE_KEY` is set
- [ ] Treasury wallet has at least 0.1 SOL
- [ ] Backend redeployed successfully
- [ ] Logs show "Connected to Solana mainnet-beta"
- [ ] Test deposit with small amount ($1 USDC)

---

## 🔍 How to Check if Mainnet is Active

### Method 1: Check Render Logs

After deployment, look for:
```
✅ Connected to Solana mainnet-beta
✅ Treasury address: 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU
```

### Method 2: Test API Endpoint

```bash
curl https://solanapay-xmli.onrender.com/health
```

Should return:
```json
{
  "status": "ok",
  "network": "mainnet-beta",
  "timestamp": "2025-01-06T..."
}
```

### Method 3: Check Deposit Address

1. Log into your app
2. Go to Deposit → USDC → Solana
3. Copy the deposit address
4. Check it on Solana Explorer: https://explorer.solana.com
5. Make sure it shows **Mainnet** (not Devnet)

---

## 🆘 Troubleshooting

### Error: "Insufficient funds for transaction"
**Solution:** Send at least 0.1 SOL to your treasury address

### Error: "Invalid mint address"
**Solution:** Make sure you're using mainnet USDC/USDT addresses (see above)

### Error: "RPC rate limit exceeded"
**Solution:** Switch from free Solana RPC to Helius/QuickNode/Alchemy

### Error: "Transaction not found"
**Solution:** Verify `SOLANA_NETWORK=mainnet-beta` (not devnet)

---

## 📞 Get RPC Provider API Keys

### Helius (Recommended)
1. Sign up: https://dev.helius.xyz
2. Create project
3. Copy API key
4. RPC URL: `https://mainnet.helius-rpc.com/?api-key=YOUR_KEY`

### QuickNode
1. Sign up: https://quicknode.com
2. Create Solana Mainnet endpoint
3. Copy endpoint URL

### Alchemy
1. Sign up: https://alchemy.com
2. Create Solana Mainnet app
3. Copy API key
4. RPC URL: `https://solana-mainnet.g.alchemy.com/v2/YOUR_KEY`

---

**After updating these variables, your app will be running on Solana mainnet! 🚀**

