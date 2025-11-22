/**
 * Platform Fee Configuration
 *
 * Defines fee structure for SolPay platform
 */

// ============================================================================
// PLATFORM FEE CONSTANTS
// ============================================================================

/**
 * Tiered fee structure for offramp transactions
 * Customer-friendly pricing that scales with transaction size
 */
export const TIERED_FEES = [
  { maxAmountUSD: 20, feeNGN: 5 },        // $0-$20: ₦5
  { maxAmountUSD: 100, feeNGN: 50 },      // $20-$100: ₦50
  { maxAmountUSD: 500, feeNGN: 100 },     // $100-$500: ₦100
  { maxAmountUSD: 1000, feeNGN: 200 },    // $500-$1,000: ₦200
  { maxAmountUSD: Infinity, feePercent: 0.003, maxFeeNGN: 500 }, // $1,000+: 0.3% (max ₦500)
];

/**
 * Calculate platform fee for an offramp transaction using tiered structure
 *
 * @param grossAmountNaira - Gross NGN amount before fee
 * @param exchangeRate - Current NGN/USD exchange rate (e.g., 1453 for ₦1,453 per USD)
 * @returns Platform fee in Naira
 */
export function calculatePlatformFee(grossAmountNaira: number, exchangeRate: number = 1453): number {
  // Convert NGN to USD for tier calculation
  const amountUSD = grossAmountNaira / exchangeRate;

  // Find the appropriate tier
  for (const tier of TIERED_FEES) {
    if (amountUSD <= tier.maxAmountUSD) {
      if (tier.feeNGN !== undefined) {
        // Flat fee tier
        return tier.feeNGN;
      } else if (tier.feePercent !== undefined) {
        // Percentage-based tier with cap
        const percentageFee = grossAmountNaira * tier.feePercent;
        return Math.min(percentageFee, tier.maxFeeNGN || Infinity);
      }
    }
  }

  // Fallback (should never reach here)
  return 5;
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

