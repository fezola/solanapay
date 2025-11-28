# Gas Sponsor Wallet Setup for Base & Polygon

## ✅ What Was Changed

### 1. Environment Variables Added

**Local (.env):**
```bash
# Base Gas Sponsor
BASE_GAS_SPONSOR_ADDRESS=0xF46Cf0ac9aEaF01A31A05b9e548187e4AC6f1B8f
BASE_GAS_SPONSOR_PRIVATE_KEY=0x110a787fb338aa084fa9760656f4abdde36f9e88938f74cd68aa25dd3e578ace

# Polygon Gas Sponsor
POLYGON_GAS_SPONSOR_ADDRESS=0xF46Cf0ac9aEaF01A31A05b9e548187e4AC6f1B8f
POLYGON_GAS_SPONSOR_PRIVATE_KEY=0x110a787fb338aa084fa9760656f4abdde36f9e88938f74cd68aa25dd3e578ace
```

**Production (Render):**
You must manually add these 4 environment variables to your Render dashboard.

---

## 🔐 Security

✅ **Private key is stored in `.env`** (already in `.gitignore`)  
✅ **Will NOT be committed to GitHub**  
⚠️ **You must manually add to Render environment variables**

---

## 💰 Current Balances

**Gas Sponsor Wallet:** `0xF46Cf0ac9aEaF01A31A05b9e548187e4AC6f1B8f`

| Network | Current Balance | Required | Status |
|---------|----------------|----------|--------|
| Base | 0.00086 ETH (~$3) | 0.01 ETH (~$35) | ❌ Need $32 more |
| Polygon | 3.5 MATIC (~$3) | 10 MATIC (~$8.50) | ❌ Need $5.50 more |

---

## 📝 Code Changes

### 1. `backend/src/config/env.ts`
Added gas sponsor environment variables:
- `BASE_GAS_SPONSOR_ADDRESS`
- `BASE_GAS_SPONSOR_PRIVATE_KEY`
- `POLYGON_GAS_SPONSOR_ADDRESS`
- `POLYGON_GAS_SPONSOR_PRIVATE_KEY`

### 2. `backend/src/services/transfer.ts`
**Changed:** EVM offramp transactions now use gas sponsor wallet instead of treasury wallet

**Before:**
```typescript
const treasuryWallet = new ethers.Wallet(treasuryPrivateKey, provider);
const gasTx = await treasuryWallet.sendTransaction({ to: userWallet.address, value: gasToSend });
```

**After:**
```typescript
const gasSponsorWallet = new ethers.Wallet(gasSponsorPrivateKey, provider);
const gasTx = await gasSponsorWallet.sendTransaction({ to: userWallet.address, value: gasToSend });
```

---

## 🔄 How It Works

### Offramp Flow (Base/Polygon):

1. **User initiates offramp** (e.g., $10 USDC → NGN)
2. **Platform collects fee** (e.g., 0.5 USDC) → Platform Treasury
3. **Gas sponsor sends ETH/MATIC** to user's deposit wallet (for gas)
4. **User wallet sends USDC** to Bread Africa wallet
5. **Bread Africa converts** USDC → NGN → User's bank account

**Key Point:** Gas sponsor wallet pays for ALL gas fees, not the treasury wallet.

---

## 🚀 Next Steps

### 1. Fund Gas Sponsor Wallets

**For Base:**
- Buy 0.01 ETH (~$35) on Coinbase/Binance
- Withdraw to Base network
- Send to: `0xF46Cf0ac9aEaF01A31A05b9e548187e4AC6f1B8f`

**For Polygon:**
- Buy 10 MATIC (~$8.50) on Coinbase/Binance
- Withdraw to Polygon network
- Send to: `0xF46Cf0ac9aEaF01A31A05b9e548187e4AC6f1B8f`

### 2. Add to Render

Go to Render dashboard → Environment → Add these 4 variables:
```
BASE_GAS_SPONSOR_ADDRESS=0xF46Cf0ac9aEaF01A31A05b9e548187e4AC6f1B8f
BASE_GAS_SPONSOR_PRIVATE_KEY=0x110a787fb338aa084fa9760656f4abdde36f9e88938f74cd68aa25dd3e578ace
POLYGON_GAS_SPONSOR_ADDRESS=0xF46Cf0ac9aEaF01A31A05b9e548187e4AC6f1B8f
POLYGON_GAS_SPONSOR_PRIVATE_KEY=0x110a787fb338aa084fa9760656f4abdde36f9e88938f74cd68aa25dd3e578ace
```

### 3. Test Offramp

After funding and deploying:
1. Test Base offramp with small amount ($1 USDC)
2. Test Polygon offramp with small amount ($1 USDC)
3. Verify gas fees are deducted from gas sponsor wallet

---

## 📊 Monitoring

Check gas sponsor balance regularly:
```bash
node backend/check-gas-sponsor-balances.js
```

**Recommended minimum balances:**
- Base: 0.01 ETH (~$35) - covers ~100 transactions
- Polygon: 10 MATIC (~$8.50) - covers ~500 transactions

---

## ⚠️ Important Notes

1. **Treasury wallets** still collect platform fees (USDC/USDT)
2. **Gas sponsor wallets** only pay for gas (ETH/MATIC)
3. **Never commit private keys** to GitHub
4. **Monitor balances** to avoid failed transactions
5. **Top up before running out** to maintain service availability

