/**
 * Platform Fee Configuration
 *
 * This file contains all fee-related settings for the SolPay platform.
 * Fees are collected in cryptocurrency and sent to platform treasury wallets.
 */

export const FeeConfig = {
  /**
   * Platform fee: 1.5% flat fee on all transactions
   *
   * Examples:
   * - $1 (₦1,500) → 1.5% = ₦22.50
   * - $5 (₦7,500) → 1.5% = ₦112.50
   * - $50 (₦75,000) → 1.5% = ₦1,125
   * - $100 (₦150,000) → 1.5% = ₦2,250
   * - $1,000 (₦1,500,000) → 1.5% = ₦22,500
   */
  FEE_PERCENT: 0.015,  // 1.5%
  MIN_FEE_NGN: 0,      // No minimum fee - just flat 1.5%

  /**
   * Default exchange rate for USD/NGN
   * This should be updated dynamically from the exchange rate API
   */
  DEFAULT_EXCHANGE_RATE: 1500,

  /**
   * Minimum offramp amount in USD
   */
  MIN_OFFRAMP_USD: 1,
};

/**
 * Calculate platform fee for a given transaction amount
 * Fee: 1.5% flat fee
 *
 * @param nairaAmount - Transaction amount in NGN
 * @returns Platform fee in NGN
 *
 * @example
 * calculatePlatformFee(7500)   // $5 → 1.5% = ₦112.50
 * calculatePlatformFee(150000) // $100 → 1.5% = ₦2,250
 */
export function calculatePlatformFee(nairaAmount: number): number {
  if (nairaAmount <= 0) return 0;

  // Calculate 1.5% fee
  return nairaAmount * FeeConfig.FEE_PERCENT;
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

