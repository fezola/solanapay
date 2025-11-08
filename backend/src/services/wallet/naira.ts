/**
 * Naira Wallet Service
 * 
 * Handles NGN wallet operations:
 * - Credit wallet from USDC off-ramp
 * - Debit wallet for bank withdrawal
 * - Get balance
 * - Get transaction history
 */

import { supabaseAdmin } from '../../utils/supabase.js';
import { logger } from '../../utils/logger.js';
import { calculatePlatformFee } from '../../config/fees.js';

// ============================================================================
// TYPES
// ============================================================================

export interface WalletBalance {
  kobo: number;
  naira: number;
}

export interface WalletTransaction {
  id: string;
  userId: string;
  type: 'credit' | 'debit' | 'fee' | 'refund';
  source: string;
  amount: number; // in kobo
  balanceAfter: number; // in kobo
  description: string;
  reference?: string;
  createdAt: string;
}

export interface CreditWalletParams {
  userId: string;
  amountNaira: number;
  source: 'bread_offramp' | 'refund' | 'bonus' | 'manual';
  description: string;
  reference?: string;
  quoteId?: string;
}

export interface DebitWalletParams {
  userId: string;
  amountNaira: number;
  source: 'withdrawal' | 'platform_fee' | 'manual';
  description: string;
  reference?: string;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Convert Naira to Kobo
 */
function nairaToKobo(naira: number): number {
  return Math.round(naira * 100);
}

/**
 * Convert Kobo to Naira
 */
function koboToNaira(kobo: number): number {
  return kobo / 100;
}

// ============================================================================
// WALLET SERVICE
// ============================================================================

export class NairaWalletService {
  /**
   * Get user's NGN wallet balance
   */
  async getBalance(userId: string): Promise<WalletBalance> {
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('naira_balance')
      .eq('id', userId)
      .single();

    if (error) {
      logger.error({ error, userId }, 'Failed to get wallet balance');
      throw new Error('Failed to get wallet balance');
    }

    const kobo = data?.naira_balance || 0;

    return {
      kobo,
      naira: koboToNaira(kobo),
    };
  }

  /**
   * Credit user's NGN wallet
   * Used when user off-ramps USDC → NGN
   */
  async credit(params: CreditWalletParams): Promise<string> {
    const { userId, amountNaira, source, description, reference, quoteId } = params;
    const amountKobo = nairaToKobo(amountNaira);

    logger.info({
      userId,
      amountNaira,
      amountKobo,
      source,
      reference,
    }, 'Crediting NGN wallet');

    try {
      // Call the database function to credit wallet atomically
      const { data, error } = await supabaseAdmin.rpc('credit_naira_wallet', {
        p_user_id: userId,
        p_amount_kobo: amountKobo,
        p_source: source,
        p_description: description,
        p_reference: reference || null,
        p_quote_id: quoteId || null,
      });

      if (error) {
        // Check if it's a duplicate reference error
        if (error.message?.includes('duplicate') || error.code === '23505') {
          logger.warn({ reference, userId }, 'Duplicate credit attempt - already processed');
          throw new Error('Transaction already processed');
        }
        throw error;
      }

      const transactionId = data as string;

      logger.info({
        userId,
        transactionId,
        amountNaira,
        source,
      }, '✅ NGN wallet credited successfully');

      return transactionId;
    } catch (error: any) {
      logger.error({ error, userId, amountNaira }, 'Failed to credit wallet');
      throw new Error(error.message || 'Failed to credit wallet');
    }
  }

  /**
   * Debit user's NGN wallet
   * Used when user withdraws to bank
   */
  async debit(params: DebitWalletParams): Promise<string> {
    const { userId, amountNaira, source, description, reference } = params;
    const amountKobo = nairaToKobo(amountNaira);

    logger.info({
      userId,
      amountNaira,
      amountKobo,
      source,
      reference,
    }, 'Debiting NGN wallet');

    try {
      // Call the database function to debit wallet atomically
      const { data, error } = await supabaseAdmin.rpc('debit_naira_wallet', {
        p_user_id: userId,
        p_amount_kobo: amountKobo,
        p_source: source,
        p_description: description,
        p_reference: reference || null,
      });

      if (error) {
        // Check if it's insufficient balance error
        if (error.message?.includes('Insufficient balance')) {
          throw new Error('Insufficient NGN balance');
        }
        throw error;
      }

      const transactionId = data as string;

      logger.info({
        userId,
        transactionId,
        amountNaira,
        source,
      }, '✅ NGN wallet debited successfully');

      return transactionId;
    } catch (error: any) {
      logger.error({ error, userId, amountNaira }, 'Failed to debit wallet');
      throw new Error(error.message || 'Failed to debit wallet');
    }
  }

  /**
   * Get wallet transaction history
   */
  async getTransactions(
    userId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<WalletTransaction[]> {
    const { data, error } = await supabaseAdmin
      .from('wallet_transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      logger.error({ error, userId }, 'Failed to get wallet transactions');
      throw new Error('Failed to get wallet transactions');
    }

    return (data || []).map((tx: any) => ({
      id: tx.id,
      userId: tx.user_id,
      type: tx.type,
      source: tx.source,
      amount: tx.amount,
      balanceAfter: tx.balance_after,
      description: tx.description,
      reference: tx.reference,
      createdAt: tx.created_at,
    }));
  }

  /**
   * Credit wallet from Bread off-ramp
   * This is called after successful USDC → NGN conversion
   * Automatically deducts platform fee
   */
  async creditFromOfframp(params: {
    userId: string;
    grossAmountNaira: number; // Amount before platform fee
    breadReference: string;
    quoteId: string;
  }): Promise<{ transactionId: string; netAmount: number; fee: number }> {
    const { userId, grossAmountNaira, breadReference, quoteId } = params;

    // Calculate platform fee (₦5 flat fee)
    const platformFee = calculatePlatformFee(grossAmountNaira);
    const netAmount = grossAmountNaira - platformFee;

    logger.info({
      userId,
      grossAmountNaira,
      platformFee,
      netAmount,
      breadReference,
    }, 'Processing offramp credit with platform fee');

    try {
      // Credit the net amount (after fee)
      const transactionId = await this.credit({
        userId,
        amountNaira: netAmount,
        source: 'bread_offramp',
        description: `Off-ramp from USDC via Bread (Fee: ₦${platformFee.toFixed(2)})`,
        reference: breadReference,
        quoteId,
      });

      // Record the platform fee
      if (platformFee > 0) {
        await supabaseAdmin.from('platform_fees').insert({
          user_id: userId,
          amount: nairaToKobo(platformFee),
          currency: 'NGN',
          fee_type: 'offramp',
          wallet_transaction_id: transactionId,
          quote_id: quoteId,
          description: `Platform fee for off-ramp (${breadReference})`,
        });
      }

      logger.info({
        userId,
        transactionId,
        netAmount,
        platformFee,
      }, '✅ Offramp credited to wallet with fee deducted');

      return {
        transactionId,
        netAmount,
        fee: platformFee,
      };
    } catch (error: any) {
      logger.error({ error, userId, grossAmountNaira }, 'Failed to credit from offramp');
      throw error;
    }
  }
}

// Export singleton instance
export const nairaWalletService = new NairaWalletService();

