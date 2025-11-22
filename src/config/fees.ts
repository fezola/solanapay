/**
 * Platform Fee Configuration
 *
 * This file contains all fee-related settings for the SolPay platform.
 * Fees are collected in cryptocurrency and sent to platform treasury wallets.
 */

export const FeeConfig = {
  /**
   * Tiered fee structure for offramp transactions
   * Customer-friendly pricing that scales with transaction size
   *
   * Tiers (based on USD equivalent):
   * - $0-$20: ₦5 flat fee
   * - $20-$100: ₦50 flat fee
   * - $100-$500: ₦100 flat fee
   * - $500-$1,000: ₦200 flat fee
   * - $1,000+: 0.3% of amount (max ₦500)
   *
   * Examples:
   * - $10 (₦14,530) → Fee: ₦5 (0.03%)
   * - $50 (₦72,650) → Fee: ₦50 (0.07%)
   * - $100 (₦145,300) → Fee: ₦50 (0.03%)
   * - $500 (₦726,500) → Fee: ₦100 (0.01%)
   * - $1,000 (₦1,453,000) → Fee: ₦200 (0.01%)
   * - $5,000 (₦7,265,000) → Fee: ₦500 (0.01% - capped)
   */
  TIERED_FEES: [
    { maxAmountUSD: 20, feeNGN: 5 },        // $0-$20: ₦5
    { maxAmountUSD: 100, feeNGN: 50 },      // $20-$100: ₦50
    { maxAmountUSD: 500, feeNGN: 100 },     // $100-$500: ₦100
    { maxAmountUSD: 1000, feeNGN: 200 },    // $500-$1,000: ₦200
    { maxAmountUSD: Infinity, feePercent: 0.003, maxFeeNGN: 500 }, // $1,000+: 0.3% (max ₦500)
  ],

  /**
   * Default exchange rate for USD/NGN (used for tier calculation)
   * This should be updated dynamically from the exchange rate API
   */
  DEFAULT_EXCHANGE_RATE: 1453,

  /**
   * Minimum transaction amount (in NGN)
   * Transactions below this amount will be rejected
   */
  MIN_TRANSACTION_AMOUNT: 100,

  /**
   * Fee collection account (UBA)
   * This is where platform fees will be sent
   *
   * TODO: Update with your actual UBA account details
   */
  FEE_COLLECTION_ACCOUNT: {
    bankName: 'UBA',
    bankCode: '033',
    accountNumber: 'YOUR_UBA_ACCOUNT_NUMBER', // Update this
    accountName: 'YOUR_NAME', // Update this
  },
};

/**
 * Calculate platform fee for a given transaction amount using tiered structure
 * @param nairaAmount - Transaction amount in NGN
 * @param exchangeRate - Current NGN/USD exchange rate (default: 1453)
 * @returns Platform fee in NGN
 */
export function calculatePlatformFee(nairaAmount: number, exchangeRate: number = FeeConfig.DEFAULT_EXCHANGE_RATE): number {
  if (nairaAmount <= 0) return 0;

  // Convert NGN to USD for tier calculation
  const amountUSD = nairaAmount / exchangeRate;

  // Find the appropriate tier
  for (const tier of FeeConfig.TIERED_FEES) {
    if (amountUSD <= tier.maxAmountUSD) {
      if (tier.feeNGN !== undefined) {
        // Flat fee tier
        return tier.feeNGN;
      } else if (tier.feePercent !== undefined) {
        // Percentage-based tier with cap
        const percentageFee = nairaAmount * tier.feePercent;
        return Math.min(percentageFee, tier.maxFeeNGN || Infinity);
      }
    }
  }

  // Fallback (should never reach here)
  return 5;
}

/**
 * Get fee display text for UI
 * @param fee - Fee amount in NGN
 * @param nairaAmount - Transaction amount in NGN
 * @returns Display text for the fee
 */
export function getFeeDisplayText(fee: number, nairaAmount: number): string {
  if (fee === 0 || nairaAmount === 0) return '';
  
  const percentage = ((fee / nairaAmount) * 100).toFixed(2);
  return `₦${fee.toFixed(2)} (${percentage}%)`;
}

