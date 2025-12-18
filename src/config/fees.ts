/**
 * Platform Fee Configuration
 *
 * Tiered fee structure - lower fees for larger transactions
 * Fees are collected in cryptocurrency and sent to platform treasury wallets.
 */

/**
 * Tiered fee structure - lower percentage for higher amounts
 *
 * Examples at ₦1,500/USD:
 * - $10 (₦15,000) → 2% = ₦300
 * - $30 (₦45,000) → 1.5% = ₦675
 * - $75 (₦112,500) → 1% = ₦1,125
 * - $150 (₦225,000) → 0.5% = ₦1,125
 * - $500 (₦750,000) → 0.3% = ₦2,250
 */
export const TIERED_FEES = [
  { maxAmountUSD: 20, feePercent: 0.02 },    // 2% for $0-$20
  { maxAmountUSD: 50, feePercent: 0.015 },   // 1.5% for $20-$50
  { maxAmountUSD: 100, feePercent: 0.01 },   // 1% for $50-$100
  { maxAmountUSD: 500, feePercent: 0.003 },  // 0.3% for $100-$500 (~₦700 for $150)
  { maxAmountUSD: Infinity, feePercent: 0.002 }, // 0.2% for $500+
];

export const FeeConfig = {
  /** Default fee for backwards compatibility */
  FEE_PERCENT: 0.02,
  MIN_FEE_NGN: 0,

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
 * Get fee percentage based on USD amount (tiered)
 */
export function getFeePercentForAmount(amountUSD: number): number {
  for (const tier of TIERED_FEES) {
    if (amountUSD <= tier.maxAmountUSD) {
      return tier.feePercent;
    }
  }
  return TIERED_FEES[TIERED_FEES.length - 1].feePercent;
}

/**
 * Calculate platform fee for a given transaction amount using tiered structure
 *
 * @param nairaAmount - Transaction amount in NGN
 * @param exchangeRate - Current NGN/USD exchange rate (default: 1500)
 * @returns Platform fee in NGN
 *
 * @example
 * calculatePlatformFee(15000, 1500)  // $10 → 2% = ₦300
 * calculatePlatformFee(225000, 1500) // $150 → 0.5% = ₦1,125
 */
export function calculatePlatformFee(nairaAmount: number, exchangeRate: number = FeeConfig.DEFAULT_EXCHANGE_RATE): number {
  if (nairaAmount <= 0) return 0;

  // Calculate USD amount for tier lookup
  const amountUSD = nairaAmount / exchangeRate;

  // Get tiered fee percentage
  const feePercent = getFeePercentForAmount(amountUSD);

  // Calculate fee
  return nairaAmount * feePercent;
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

