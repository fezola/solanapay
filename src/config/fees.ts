/**
 * Platform Fee Configuration
 * 
 * This file contains all fee-related settings for the SolPay platform.
 * Fees are collected and sent to the platform owner's UBA account.
 */

export const FeeConfig = {
  /**
   * Platform fee charged per offramp transaction
   * This is a flat fee in NGN (Nigerian Naira)
   *
   * Current: ₦5 per transaction
   *
   * Examples:
   * - 1 USDC (₦1,453) → Fee: ₦5 (0.34%)
   * - 10 USDC (₦14,530) → Fee: ₦5 (0.03%)
   * - 100 USDC (₦145,300) → Fee: ₦5 (0.003%)
   */
  PLATFORM_FEE_FLAT: 5,

  /**
   * Alternative: Percentage-based fee (currently not used)
   * Uncomment and modify the code if you want to switch to percentage-based fees
   * 
   * Example: 0.005 = 0.5%
   */
  // PLATFORM_FEE_PERCENTAGE: 0.005,

  /**
   * Alternative: Tiered fee structure (currently not used)
   * Uncomment and modify the code if you want tiered fees
   */
  // TIERED_FEES: [
  //   { maxAmount: 5000, fee: 30 },    // ₦30 for transactions under ₦5,000
  //   { maxAmount: 50000, fee: 50 },   // ₦50 for transactions ₦5,000 - ₦50,000
  //   { maxAmount: Infinity, fee: 100 }, // ₦100 for transactions above ₦50,000
  // ],

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
 * Calculate platform fee for a given transaction amount
 * @param nairaAmount - Transaction amount in NGN
 * @returns Platform fee in NGN
 */
export function calculatePlatformFee(nairaAmount: number): number {
  if (nairaAmount <= 0) return 0;
  
  // Currently using flat fee
  return FeeConfig.PLATFORM_FEE_FLAT;

  // Alternative: Percentage-based fee
  // return nairaAmount * FeeConfig.PLATFORM_FEE_PERCENTAGE;

  // Alternative: Tiered fee
  // for (const tier of FeeConfig.TIERED_FEES) {
  //   if (nairaAmount <= tier.maxAmount) {
  //     return tier.fee;
  //   }
  // }
  // return FeeConfig.TIERED_FEES[FeeConfig.TIERED_FEES.length - 1].fee;
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

