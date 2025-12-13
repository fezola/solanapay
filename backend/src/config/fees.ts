/**
 * Platform Fee Configuration
 *
 * Defines fee structure for SolPay platform
 */

// ============================================================================
// PLATFORM FEE CONSTANTS
// ============================================================================

/**
 * Platform fee configuration
 * 1.5% flat fee on all transactions
 */
export const FEE_CONFIG = {
  /** Fee percentage (1.5% = 0.015) */
  FEE_PERCENT: 0.015,
  /** Minimum fee in NGN (none - just flat 1.5%) */
  MIN_FEE_NGN: 0,
  /** Minimum offramp amount in USD */
  MIN_OFFRAMP_USD: 1,
};

/**
 * Legacy tiered fees (kept for backwards compatibility)
 * @deprecated Use FEE_CONFIG instead
 */
export const TIERED_FEES = [
  { maxAmountUSD: Infinity, feePercent: FEE_CONFIG.FEE_PERCENT, minFeeNGN: FEE_CONFIG.MIN_FEE_NGN },
];

/**
 * Calculate platform fee for an offramp transaction
 *
 * Fee: 1.5% flat fee on all transactions
 *
 * @param grossAmountNaira - Gross NGN amount before fee
 * @param exchangeRate - Current NGN/USD exchange rate (e.g., 1500 for ₦1,500 per USD)
 * @returns Platform fee in Naira
 *
 * @example
 * // $5 at ₦1,500 = ₦7,500 → 1.5% = ₦112.50 fee
 * calculatePlatformFee(7500, 1500) // Returns: 112.50
 *
 * @example
 * // $100 at ₦1,500 = ₦150,000 → 1.5% = ₦2,250 fee
 * calculatePlatformFee(150000, 1500) // Returns: 2250
 */
export function calculatePlatformFee(grossAmountNaira: number, exchangeRate: number = 1500): number {
  // Calculate 1% fee
  const percentageFee = grossAmountNaira * FEE_CONFIG.FEE_PERCENT;

  // Apply minimum fee
  return Math.max(percentageFee, FEE_CONFIG.MIN_FEE_NGN);
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

