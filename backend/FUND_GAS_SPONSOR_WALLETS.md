# 💰 Fund Gas Sponsor Wallets Guide

**Generated:** 2025-11-28  
**Status:** NEW WALLETS CREATED - NEED FUNDING

---

## 🎯 Your New Gas Sponsor Wallets

### Base Gas Sponsor Wallet
```
Address: 0x08B89F3406A247EA91139A7B508491eEDF51aF8E
Required: 0.01 ETH (~$35)
Purpose: Pay gas fees for Base offramp transactions
```

### Polygon Gas Sponsor Wallet
```
Address: 0xF2e2367461dbD22C47eEB8D111fa2ccEd03cea14
Required: 10 MATIC (~$8.50)
Purpose: Pay gas fees for Polygon offramp transactions
```

**Total Cost:** ~$43.50

---

## 📝 How to Fund These Wallets

### Option 1: Buy on Coinbase (Recommended)

#### For Base ETH:

1. **Go to Coinbase** (https://www.coinbase.com/)
2. **Buy ETH** (at least $35 worth)
3. **Withdraw to Base network:**
   - Click "Send & Receive"
   - Select "ETH"
   - **IMPORTANT:** Select "Base" network (NOT Ethereum mainnet!)
   - Paste address: `0x08B89F3406A247EA91139A7B508491eEDF51aF8E`
   - Amount: 0.01 ETH
   - Confirm and send

**⚠️ CRITICAL:** Make sure you select **Base network**, not Ethereum mainnet!

#### For Polygon MATIC:

1. **Go to Coinbase** (https://www.coinbase.com/)
2. **Buy MATIC** (at least $10 worth)
3. **Withdraw to Polygon network:**
   - Click "Send & Receive"
   - Select "MATIC"
   - **IMPORTANT:** Select "Polygon" network
   - Paste address: `0xF2e2367461dbD22C47eEB8D111fa2ccEd03cea14`
   - Amount: 10 MATIC
   - Confirm and send

---

### Option 2: Buy on Binance

#### For Base ETH:

1. **Go to Binance** (https://www.binance.com/)
2. **Buy ETH** (at least $35 worth)
3. **Withdraw:**
   - Go to Wallet → Fiat and Spot → Withdraw
   - Select "ETH"
   - **Network:** Select "Base" (or "ETH Base")
   - Address: `0x08B89F3406A247EA91139A7B508491eEDF51aF8E`
   - Amount: 0.01 ETH
   - Complete 2FA and confirm

#### For Polygon MATIC:

1. **Go to Binance** (https://www.binance.com/)
2. **Buy MATIC** (at least $10 worth)
3. **Withdraw:**
   - Go to Wallet → Fiat and Spot → Withdraw
   - Select "MATIC"
   - **Network:** Select "Polygon" (or "MATIC Polygon")
   - Address: `0xF2e2367461dbD22C47eEB8D111fa2ccEd03cea14`
   - Amount: 10 MATIC
   - Complete 2FA and confirm

---

### Option 3: Bridge from Existing Wallet

If you already have ETH or MATIC on other networks, you can bridge:

#### Bridge to Base:
- **Portal Bridge** (https://portalbridge.com/)
- **Stargate** (https://stargate.finance/)
- **Across** (https://across.to/)

#### Bridge to Polygon:
- **Polygon Bridge** (https://wallet.polygon.technology/bridge)
- **Stargate** (https://stargate.finance/)

---

## ✅ Verify Funding

After sending, verify the funds arrived:

### Check Base Balance:
```
https://basescan.org/address/0x08B89F3406A247EA91139A7B508491eEDF51aF8E
```

### Check Polygon Balance:
```
https://polygonscan.com/address/0xF2e2367461dbD22C47eEB8D111fa2ccEd03cea14
```

**Expected:**
- Base: 0.01 ETH (or more)
- Polygon: 10 MATIC (or more)

---

## 🚀 After Funding

### 1. Add to Render Environment Variables

Go to your Render dashboard and add these 4 variables:

```
BASE_GAS_SPONSOR_ADDRESS=0x08B89F3406A247EA91139A7B508491eEDF51aF8E
BASE_GAS_SPONSOR_PRIVATE_KEY=0x67223a8cdf5ae5beda1c989d60987f6db9d41061461c029e701520d231295a12
POLYGON_GAS_SPONSOR_ADDRESS=0xF2e2367461dbD22C47eEB8D111fa2ccEd03cea14
POLYGON_GAS_SPONSOR_PRIVATE_KEY=0xdceb307d5eebc2bf174d3f64da5a5be021ea2047114a811557022c03ad4c0828
```

**How to add:**
1. Go to https://dashboard.render.com/
2. Select your backend service
3. Go to "Environment" tab
4. Click "Add Environment Variable"
5. Add each variable one by one
6. Click "Save Changes"
7. Render will automatically redeploy

### 2. Test Offramp

After Render redeploys:

1. **Test Base offramp** with $1 USDC
2. **Test Polygon offramp** with $1 USDC
3. **Verify gas fees** are deducted from gas sponsor wallets

### 3. Monitor Balances

Check balances weekly to ensure you don't run out:

```bash
# Base
https://basescan.org/address/0x08B89F3406A247EA91139A7B508491eEDF51aF8E

# Polygon
https://polygonscan.com/address/0xF2e2367461dbD22C47eEB8D111fa2ccEd03cea14
```

**When to top up:**
- Base: When balance drops below 0.005 ETH (~$17)
- Polygon: When balance drops below 5 MATIC (~$4)

---

## 📊 Gas Fee Estimates

### Base (per transaction):
- Gas limit: ~100,000
- Gas price: ~0.1 gwei
- Cost per transaction: ~0.00001 ETH (~$0.035)
- **0.01 ETH covers:** ~1,000 transactions

### Polygon (per transaction):
- Gas limit: ~100,000
- Gas price: ~30 gwei
- Cost per transaction: ~0.003 MATIC (~$0.0025)
- **10 MATIC covers:** ~3,300 transactions

---

## ⚠️ IMPORTANT WARNINGS

### DO:
✅ Send to the EXACT addresses shown above  
✅ Select the CORRECT network (Base for ETH, Polygon for MATIC)  
✅ Double-check addresses before sending  
✅ Start with small test amounts first  
✅ Verify funds arrived before sending more  

### DON'T:
❌ Send ETH on Ethereum mainnet (use Base!)  
❌ Send MATIC on Ethereum (use Polygon!)  
❌ Send to wrong address  
❌ Send less than required minimum  
❌ Share private keys with anyone  

---

## 🆘 Troubleshooting

### "Transaction failed" or "Insufficient funds"
- Check you selected the correct network
- Verify the address is correct
- Make sure you have enough for gas fees on the sending side

### "Funds not showing up"
- Wait 5-10 minutes for confirmations
- Check the block explorer links above
- Verify you sent to the correct address
- Check you selected the correct network

### "Wrong network"
If you sent to the wrong network:
- ETH sent to Ethereum instead of Base: You can bridge it to Base
- MATIC sent to Ethereum instead of Polygon: You can bridge it to Polygon
- Use Portal Bridge or Stargate to bridge

---

## 📞 Need Help?

If you're stuck:
1. Check the block explorer to see if transaction was successful
2. Verify you selected the correct network
3. Double-check the address matches exactly
4. Contact exchange support if funds are missing

---

**Next:** After funding, add to Render and test offramps!

