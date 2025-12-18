/**
 * Platform Fee Configuration
 *
 * Tiered fee structure - lower fees for larger transactions
 */

// ============================================================================
// TIERED FEE STRUCTURE
// ============================================================================

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
  { maxAmountUSD: 500, feePercent: 0.005 },  // 0.5% for $100-$500
  { maxAmountUSD: Infinity, feePercent: 0.003 }, // 0.3% for $500+
];

export const FEE_CONFIG = {
  /** Default fee for backwards compatibility */
  FEE_PERCENT: 0.02,
  /** Minimum fee in NGN */
  MIN_FEE_NGN: 0,
  /** Minimum offramp amount in USD */
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
 * Calculate platform fee for an offramp transaction using tiered structure
 *
 * @param grossAmountNaira - Gross NGN amount before fee
 * @param exchangeRate - Current NGN/USD exchange rate (e.g., 1500 for ₦1,500 per USD)
 * @returns Platform fee in Naira
 *
 * @example
 * // $10 at ₦1,500 = ₦15,000 → 2% = ₦300 fee
 * calculatePlatformFee(15000, 1500) // Returns: 300
 *
 * @example
 * // $150 at ₦1,500 = ₦225,000 → 0.5% = ₦1,125 fee
 * calculatePlatformFee(225000, 1500) // Returns: 1125
 */
export function calculatePlatformFee(grossAmountNaira: number, exchangeRate: number = 1500): number {
  // Calculate USD amount for tier lookup
  const amountUSD = grossAmountNaira / exchangeRate;

  // Get tiered fee percentage
  const feePercent = getFeePercentForAmount(amountUSD);

  // Calculate fee
  const fee = grossAmountNaira * feePercent;

  return Math.max(fee, FEE_CONFIG.MIN_FEE_NGN);
}

/**
 * Calculate net amount after platform fee
 *
 * @param grossAmountNaira - Gross NGN amount before fee
 * @param exchangeRate - Current NGN/USD exchange rate
 * @returns Net amount user receives after fee deduction
 */
export function calculateNetAmount(grossAmountNaira: number, exchangeRate: number = 1453): number {
  return grossAmountNaira - calculatePlatformFee(grossAmountNaira, exchangeRate);
}

// ============================================================================
// CRYPTO FEE CALCULATION
// ============================================================================

/**
 * Calculate platform fee in cryptocurrency using tiered structure
 *
 * This converts the tiered NGN fee to the equivalent amount in crypto
 * based on the current exchange rate and transaction amount.
 *
 * @param asset - Cryptocurrency asset (e.g., 'USDC', 'SOL')
 * @param exchangeRate - Current exchange rate (e.g., 1453 NGN per USDC)
 * @param cryptoAmount - Amount of crypto being offramped (optional, for accurate tier calculation)
 * @returns Platform fee in cryptocurrency
 *
 * @example
 * // 10 USDC at ₦1,453 per USDC = ₦14,530 (Tier 1: ₦5 fee)
 * calculatePlatformFeeInCrypto('USDC', 1453, 10)
 * // Returns: 0.00344 USDC
 *
 * @example
 * // 500 USDC at ₦1,453 per USDC = ₦726,500 (Tier 3: ₦100 fee)
 * calculatePlatformFeeInCrypto('USDC', 1453, 500)
 * // Returns: 0.0688 USDC
 */
export function calculatePlatformFeeInCrypto(
  asset: string,
  exchangeRate: number,
  cryptoAmount?: number
): number {
  if (exchangeRate <= 0) {
    throw new Error('Exchange rate must be positive');
  }

  // Calculate gross amount in NGN
  const grossAmountNGN = cryptoAmount ? cryptoAmount * exchangeRate : 0;

  // Get tiered fee in NGN
  const feeNGN = calculatePlatformFee(grossAmountNGN, exchangeRate);

  // Convert to crypto
  const feeInCrypto = feeNGN / exchangeRate;

  return feeInCrypto;
}

/**
 * Calculate amount to send to Bread after deducting platform fee
 *
 * @param cryptoAmount - Original crypto amount user wants to offramp
 * @param asset - Cryptocurrency asset
 * @param exchangeRate - Current exchange rate
 * @returns Object with fee and amount to send to Bread
 *
 * @example
 * // User wants to offramp 10 USDC at ₦1,453 per USDC (₦14,530 = Tier 1: ₦5)
 * calculateAmountAfterFee(10, 'USDC', 1453)
 * // Returns: { platformFee: 0.00344, amountToBread: 9.99656 }
 *
 * @example
 * // User wants to offramp 500 USDC at ₦1,453 per USDC (₦726,500 = Tier 3: ₦100)
 * calculateAmountAfterFee(500, 'USDC', 1453)
 * // Returns: { platformFee: 0.0688, amountToBread: 499.9312 }
 */
export function calculateAmountAfterFee(
  cryptoAmount: number,
  asset: string,
  exchangeRate: number
): { platformFee: number; amountToBread: number } {
  const platformFee = calculatePlatformFeeInCrypto(asset, exchangeRate, cryptoAmount);
  const amountToBread = cryptoAmount - platformFee;

  if (amountToBread <= 0) {
    throw new Error('Crypto amount too small to cover platform fee');
  }

  return {
    platformFee,
    amountToBread,
  };
}

