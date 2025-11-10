/**
 * Platform Fee Configuration
 *
 * Defines fee structure for SolPay platform
 */

// ============================================================================
// PLATFORM FEE CONSTANTS
// ============================================================================

/**
 * Platform fee for offramp transactions
 * ₦5 flat fee per transaction
 */
export const PLATFORM_FEE_NAIRA = 5;

/**
 * Calculate platform fee for an offramp transaction
 *
 * @param grossAmountNaira - Gross NGN amount before fee
 * @returns Platform fee in Naira (₦5 flat fee)
 */
export function calculatePlatformFee(grossAmountNaira: number): number {
  // Flat ₦5 fee regardless of amount
  return PLATFORM_FEE_NAIRA;
}

/**
 * Calculate net amount after platform fee
 *
 * @param grossAmountNaira - Gross NGN amount before fee
 * @returns Net amount user receives after fee deduction
 */
export function calculateNetAmount(grossAmountNaira: number): number {
  return grossAmountNaira - calculatePlatformFee(grossAmountNaira);
}

// ============================================================================
// CRYPTO FEE CALCULATION
// ============================================================================

/**
 * Calculate platform fee in cryptocurrency
 *
 * This converts the ₦5 NGN fee to the equivalent amount in crypto
 * based on the current exchange rate.
 *
 * @param asset - Cryptocurrency asset (e.g., 'USDC', 'SOL')
 * @param exchangeRate - Current exchange rate (e.g., 1453 NGN per USDC)
 * @returns Platform fee in cryptocurrency
 *
 * @example
 * // USDC at ₦1,453 per USDC
 * calculatePlatformFeeInCrypto('USDC', 1453)
 * // Returns: 0.00344 USDC
 */
export function calculatePlatformFeeInCrypto(
  asset: string,
  exchangeRate: number
): number {
  if (exchangeRate <= 0) {
    throw new Error('Exchange rate must be positive');
  }

  const feeNGN = PLATFORM_FEE_NAIRA;
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
 * // User wants to offramp 10 USDC at ₦1,453 per USDC
 * calculateAmountAfterFee(10, 'USDC', 1453)
 * // Returns: { platformFee: 0.00344, amountToBread: 9.99656 }
 */
export function calculateAmountAfterFee(
  cryptoAmount: number,
  asset: string,
  exchangeRate: number
): { platformFee: number; amountToBread: number } {
  const platformFee = calculatePlatformFeeInCrypto(asset, exchangeRate);
  const amountToBread = cryptoAmount - platformFee;

  if (amountToBread <= 0) {
    throw new Error('Crypto amount too small to cover platform fee');
  }

  return {
    platformFee,
    amountToBread,
  };
}

