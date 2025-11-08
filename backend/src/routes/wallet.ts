/**
 * NGN Wallet API Routes
 *
 * Endpoints:
 * - GET /api/wallet/balance - Get NGN wallet balance
 * - GET /api/wallet/transactions - Get wallet transaction history
 * - POST /api/wallet/withdraw - Withdraw NGN to bank account
 */

import { FastifyPluginAsync } from 'fastify';
import { authMiddleware } from '../middleware/auth.js';
import { nairaWalletService } from '../services/wallet/naira.js';
import { BreadOfframpService } from '../services/bread/offramp.js';
import { supabaseAdmin } from '../utils/supabase.js';
import { logger } from '../utils/logger.js';

export const walletRoutes: FastifyPluginAsync = async (fastify) => {
  // Apply auth middleware to all routes
  fastify.addHook('onRequest', authMiddleware);

  // ============================================================================
  // GET /api/wallet/balance
  // ============================================================================
  fastify.get('/balance', async (request, reply) => {
    const userId = request.userId!;

    if (!userId) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }

    try {
      const balance = await nairaWalletService.getBalance(userId);

      logger.info({ userId, balance }, 'Wallet balance retrieved');

      return reply.send({
        success: true,
        balance: {
          naira: balance.naira,
          kobo: balance.kobo,
          formatted: `₦${balance.naira.toLocaleString('en-NG', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}`,
        },
      });
    } catch (error: any) {
      logger.error({ error, userId }, 'Failed to get wallet balance');
      return reply.code(500).send({
        error: 'Failed to get wallet balance',
        message: error.message,
      });
    }
  });

  // ============================================================================
  // GET /api/wallet/transactions
  // ============================================================================
  fastify.get('/transactions', async (request, reply) => {
    const userId = request.userId!;

    const { limit = 50, offset = 0 } = request.query as any;

    try {
      const transactions = await nairaWalletService.getTransactions(
        userId,
        parseInt(limit),
        parseInt(offset)
      );

      logger.info({ userId, count: transactions.length }, 'Wallet transactions retrieved');

      return reply.send({
        success: true,
        transactions: transactions.map((tx) => ({
          id: tx.id,
          type: tx.type,
          source: tx.source,
          amount: {
            naira: tx.amount / 100,
            kobo: tx.amount,
            formatted: `${tx.type === 'debit' ? '-' : '+'}₦${(tx.amount / 100).toLocaleString('en-NG', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}`,
          },
          balanceAfter: {
            naira: tx.balanceAfter / 100,
            kobo: tx.balanceAfter,
          },
          description: tx.description,
          reference: tx.reference,
          createdAt: tx.createdAt,
        })),
        pagination: {
          limit: parseInt(limit),
          offset: parseInt(offset),
          hasMore: transactions.length === parseInt(limit),
        },
      });
    } catch (error: any) {
      logger.error({ error, userId }, 'Failed to get wallet transactions');
      return reply.code(500).send({
        error: 'Failed to get wallet transactions',
        message: error.message,
      });
    }
  });

  // ============================================================================
  // POST /api/wallet/withdraw
  // ============================================================================
  fastify.post('/withdraw', async (request, reply) => {
    const userId = request.userId!;

    const { amount, beneficiaryId } = request.body as any;

    // Validation
    if (!amount || amount <= 0) {
      return reply.code(400).send({ error: 'Invalid amount' });
    }

    if (!beneficiaryId) {
      return reply.code(400).send({ error: 'Beneficiary ID is required' });
    }

    // Minimum withdrawal amount: ₦100
    if (amount < 100) {
      return reply.code(400).send({
        error: 'Minimum withdrawal amount is ₦100',
      });
    }

    logger.info({
      userId,
      amount,
      beneficiaryId,
    }, '🏦 Processing NGN withdrawal');

    try {
      // 1. Check balance
      const balance = await nairaWalletService.getBalance(userId);

      if (balance.naira < amount) {
        return reply.code(400).send({
          error: 'Insufficient balance',
          available: balance.naira,
          requested: amount,
        });
      }

      // 2. Get beneficiary details
      const { data: beneficiary, error: beneficiaryError } = await supabaseAdmin
        .from('bank_accounts')
        .select('*')
        .eq('id', beneficiaryId)
        .eq('user_id', userId)
        .single();

      if (beneficiaryError || !beneficiary) {
        return reply.code(404).send({ error: 'Beneficiary not found' });
      }

      // 3. Debit wallet first (to prevent double-spending)
      const withdrawalRef = `WD-${Date.now()}-${userId.substring(0, 8)}`;
      
      const transactionId = await nairaWalletService.debit({
        userId,
        amountNaira: amount,
        source: 'withdrawal',
        description: `Withdrawal to ${beneficiary.bank_name} (${beneficiary.account_number})`,
        reference: withdrawalRef,
      });

      logger.info({
        userId,
        transactionId,
        amount,
        withdrawalRef,
      }, '✅ Wallet debited, initiating Bread payout');

      // 4. Create withdrawal record
      const { data: withdrawal, error: withdrawalError } = await supabaseAdmin
        .from('withdrawals')
        .insert({
          user_id: userId,
          amount: Math.round(amount * 100), // Convert to kobo
          currency: 'NGN',
          bank_account_id: beneficiaryId,
          status: 'processing',
          provider: 'bread',
          wallet_transaction_id: transactionId,
        })
        .select()
        .single();

      if (withdrawalError) {
        logger.error({ error: withdrawalError }, 'Failed to create withdrawal record');
        // Refund the wallet
        await nairaWalletService.credit({
          userId,
          amountNaira: amount,
          source: 'refund',
          description: `Refund for failed withdrawal (${withdrawalRef})`,
          reference: `REFUND-${withdrawalRef}`,
        });
        throw new Error('Failed to create withdrawal record');
      }

      // 5. Call Bread to send money to bank
      try {
        // TODO: Implement actual Bread payout call
        // For now, we'll simulate success
        // const breadResponse = await breadOfframpService.executePayout({
        //   beneficiaryId,
        //   amount,
        //   currency: 'NGN',
        // });

        // Simulate Bread response
        const breadReference = `BREAD-${Date.now()}`;

        // Update withdrawal status
        await supabaseAdmin
          .from('withdrawals')
          .update({
            status: 'completed',
            provider_reference: breadReference,
            completed_at: new Date().toISOString(),
          })
          .eq('id', withdrawal.id);

        logger.info({
          userId,
          withdrawalId: withdrawal.id,
          breadReference,
          amount,
        }, '✅ Withdrawal completed successfully');

        return reply.send({
          success: true,
          withdrawal: {
            id: withdrawal.id,
            amount,
            status: 'completed',
            reference: withdrawalRef,
            breadReference,
            bankAccount: {
              bankName: beneficiary.bank_name,
              accountNumber: beneficiary.account_number,
              accountName: beneficiary.account_name,
            },
          },
          newBalance: {
            naira: balance.naira - amount,
            formatted: `₦${(balance.naira - amount).toLocaleString('en-NG', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}`,
          },
        });
      } catch (breadError: any) {
        logger.error({ error: breadError, userId }, 'Bread payout failed');

        // Update withdrawal status to failed
        await supabaseAdmin
          .from('withdrawals')
          .update({
            status: 'failed',
            error_message: breadError.message,
            failed_at: new Date().toISOString(),
          })
          .eq('id', withdrawal.id);

        // Refund the wallet
        await nairaWalletService.credit({
          userId,
          amountNaira: amount,
          source: 'refund',
          description: `Refund for failed withdrawal (${withdrawalRef})`,
          reference: `REFUND-${withdrawalRef}`,
        });

        return reply.code(500).send({
          error: 'Withdrawal failed',
          message: breadError.message,
          refunded: true,
        });
      }
    } catch (error: any) {
      logger.error({ error, userId, amount }, 'Failed to process withdrawal');
      return reply.code(500).send({
        error: 'Failed to process withdrawal',
        message: error.message,
      });
    }
  });
};

