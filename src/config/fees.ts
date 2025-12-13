/**
 * Platform Fee Configuration
 *
 * This file contains all fee-related settings for the SolPay platform.
 * Fees are collected in cryptocurrency and sent to platform treasury wallets.
 */

export const FeeConfig = {
  /**
   * Platform fee: 1.5% of transaction amount (minimum ₦500)
   *
   * Examples:
   * - ₦10,000 → 1.5% = ₦150, but minimum is ₦500 → Fee: ₦500
   * - ₦50,000 → 1.5% = ₦750 → Fee: ₦750
   * - ₦100,000 → 1.5% = ₦1,500 → Fee: ₦1,500
   * - ₦1,000,000 → 1.5% = ₦15,000 → Fee: ₦15,000
   */
  FEE_PERCENT: 0.015,  // 1.5%
  MIN_FEE_NGN: 500,    // Minimum fee in NGN

  /**
   * Default exchange rate for USD/NGN
   * This should be updated dynamically from the exchange rate API
   */
  DEFAULT_EXCHANGE_RATE: 1500,

  /**
   * Minimum transaction amount (in NGN)
   * Transactions below this amount will be rejected
   */
  MIN_TRANSACTION_AMOUNT: 100,
};

/**
 * Calculate platform fee for a given transaction amount
 * Fee: 1.5% of transaction (minimum ₦500)
 *
 * @param nairaAmount - Transaction amount in NGN
 * @returns Platform fee in NGN
 *
 * @example
 * calculatePlatformFee(150000) // ₦100 at ₦1,500 rate = 1.5% = ₦2,250
 * calculatePlatformFee(15000)  // ₦10 at ₦1,500 rate = 1.5% = ₦225, but min ₦500
 */
export function calculatePlatformFee(nairaAmount: number): number {
  if (nairaAmount <= 0) return 0;

  // Calculate 1.5% fee
  const percentageFee = nairaAmount * FeeConfig.FEE_PERCENT;

  // Apply minimum fee
  return Math.max(percentageFee, FeeConfig.MIN_FEE_NGN);
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

