# 💰 SolPay Platform Fee Guide

## Overview

SolPay charges a **₦50 flat fee** per offramp transaction. This fee is competitive, transparent, and profitable.

---

## 📊 Fee Structure

### Current Fee: ₦5 Flat Fee

**Why ₦5?**
- ✅ **Very Competitive:** Much lower than most Nigerian platforms
- ✅ **Simple:** Users know exactly what they'll pay
- ✅ **User-Friendly:** Won't scare customers away
- ✅ **Profitable at Scale:** Small fee × high volume = good revenue

### Fee Examples

| Crypto Amount | Naira Value | Platform Fee | You Receive | Fee % |
|---------------|-------------|--------------|-------------|-------|
| 1 USDC | ₦1,453 | ₦5 | ₦1,448 | 0.34% |
| 5 USDC | ₦7,265 | ₦5 | ₦7,260 | 0.07% |
| 10 USDC | ₦14,530 | ₦5 | ₦14,525 | 0.03% |
| 50 USDC | ₦72,650 | ₦5 | ₦72,645 | 0.007% |
| 100 USDC | ₦145,300 | ₦5 | ₦145,295 | 0.003% |

**Key Insight:** The fee is almost negligible - users will love this!

---

## 🏦 Fee Collection

### Where Fees Go

All platform fees are collected and sent to your **UBA account**.

**To set up fee collection:**

1. Open `src/config/fees.ts`
2. Update the `FEE_COLLECTION_ACCOUNT` section:

```typescript
FEE_COLLECTION_ACCOUNT: {
  bankName: 'UBA',
  bankCode: '033',
  accountNumber: 'YOUR_UBA_ACCOUNT_NUMBER', // ← Update this
  accountName: 'YOUR_NAME', // ← Update this
},
```

### How Fees Are Collected

Currently, fees are **deducted from the user's payout** and shown separately in the UI.

**Future Enhancement:** You can implement automatic fee collection to your UBA account by:
1. Creating a separate payout for the fee amount
2. Sending it to your UBA account via Bread Africa
3. This would require backend changes to split the payout

---

## 🎯 Competitive Analysis

### Nigerian Crypto Platforms (Estimated Fees)

| Platform | Fee Structure | Notes |
|----------|---------------|-------|
| **Binance P2P** | 0% (but worse rates) | No direct fee, but spread in rates |
| **Quidax** | ~1-2% | Variable based on volume |
| **Luno** | ~1.5% | Higher fees, limited assets |
| **Roqqu** | ~0.5-1% | Competitive rates |
| **Breet** | ~1% | Popular in Nigeria |
| **SolPay** | ₦50 flat | **0.03% - 3.4%** depending on size |

**Your Advantage:**
- For transactions above ₦5,000, your fee is **lower than most competitors**
- Transparent flat fee (no hidden spreads)
- Users can calculate exact costs upfront

---

## 💡 Alternative Fee Structures

If you want to change the fee structure later, here are options:

### Option 1: Percentage-Based Fee

```typescript
// In src/config/fees.ts
PLATFORM_FEE_PERCENTAGE: 0.005, // 0.5%

// In calculatePlatformFee function:
return nairaAmount * FeeConfig.PLATFORM_FEE_PERCENTAGE;
```

**Pros:** Scales with transaction size
**Cons:** Can be expensive on large transactions

---

### Option 2: Tiered Fee Structure

```typescript
// In src/config/fees.ts
TIERED_FEES: [
  { maxAmount: 5000, fee: 30 },    // ₦30 for under ₦5,000
  { maxAmount: 50000, fee: 50 },   // ₦50 for ₦5,000 - ₦50,000
  { maxAmount: Infinity, fee: 100 }, // ₦100 for above ₦50,000
],

// In calculatePlatformFee function:
for (const tier of FeeConfig.TIERED_FEES) {
  if (nairaAmount <= tier.maxAmount) {
    return tier.fee;
  }
}
```

**Pros:** Fair for all transaction sizes
**Cons:** More complex to explain

---

### Option 3: Volume-Based Discounts

Reward high-volume users with lower fees:

```typescript
// Based on user's monthly volume
if (monthlyVolume > 1000000) return 30; // ₦30 for VIP users
if (monthlyVolume > 500000) return 40;  // ₦40 for high-volume
return 50; // ₦50 for regular users
```

**Pros:** Encourages loyalty and high volume
**Cons:** Requires tracking user volume

---

## 📈 Revenue Projections

### Conservative Estimate

Assuming:
- 100 transactions per day
- Average fee: ₦5

**Daily Revenue:** 100 × ₦5 = **₦500**
**Monthly Revenue:** ₦500 × 30 = **₦15,000**
**Annual Revenue:** ₦15,000 × 12 = **₦180,000**

### Growth Scenario

Assuming:
- 1,000 transactions per day (after 6 months)
- Average fee: ₦5

**Daily Revenue:** 1,000 × ₦5 = **₦5,000**
**Monthly Revenue:** ₦5,000 × 30 = **₦150,000**
**Annual Revenue:** ₦150,000 × 12 = **₦1,800,000**

### High Volume Scenario

Assuming:
- 5,000 transactions per day (mature platform)
- Average fee: ₦5

**Daily Revenue:** 5,000 × ₦5 = **₦25,000**
**Monthly Revenue:** ₦25,000 × 30 = **₦750,000**
**Annual Revenue:** ₦750,000 × 12 = **₦9,000,000**

**Note:** With ₦5 fee, you need high volume to make good profit. But users will love the low fee and tell their friends!

---

## 🔧 How to Change Fees

### Quick Change (Flat Fee Amount)

1. Open `src/config/fees.ts`
2. Change `PLATFORM_FEE_FLAT: 50` to your desired amount
3. Save and redeploy

### Switch to Percentage Fee

1. Open `src/config/fees.ts`
2. Uncomment `PLATFORM_FEE_PERCENTAGE`
3. In `calculatePlatformFee()`, uncomment the percentage calculation
4. Comment out the flat fee return
5. Save and redeploy

### Switch to Tiered Fees

1. Open `src/config/fees.ts`
2. Uncomment `TIERED_FEES`
3. In `calculatePlatformFee()`, uncomment the tiered calculation
4. Comment out the flat fee return
5. Save and redeploy

---

## ✅ What's Been Implemented

### Frontend Changes

1. **`src/config/fees.ts`** - Centralized fee configuration
2. **`src/components/OfframpScreen.tsx`** - Updated to show platform fee
3. **UI Display:**
   - Shows "You get" (amount before fee)
   - Shows "Platform fee" (₦50)
   - Shows "You receive" (final amount)

### Example UI:

```
You get:          ₦1,453.00
Platform fee:     -₦5.00
─────────────────────────────
You receive:      ₦1,448.00
```

---

## 🚀 Next Steps

### Immediate:
1. ✅ Fee structure implemented (₦5 flat)
2. ✅ UI updated to show fees clearly
3. ⏳ Update UBA account details in `src/config/fees.ts`

### Future Enhancements:
1. **Automatic Fee Collection:** Send fees directly to your UBA account
2. **Fee Analytics Dashboard:** Track total fees collected
3. **Volume-Based Discounts:** Reward loyal users
4. **Promotional Periods:** Temporarily reduce fees for marketing

---

## 📞 Support

If you want to change the fee structure or have questions:
1. Edit `src/config/fees.ts`
2. Test with small transactions first
3. Monitor user feedback
4. Adjust as needed

---

## 🎉 Summary

**Current Setup:**
- ✅ ₦5 flat fee per transaction (very low!)
- ✅ Transparent and super competitive
- ✅ Easy to change in the future
- ✅ User-friendly - won't scare customers away

**Your fee is one of the lowest in Nigeria! Users will love it! 🎉**

**Strategy:** Low fee → More users → High volume → Good profit!

