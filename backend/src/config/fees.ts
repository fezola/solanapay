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

