/**
 * Bills Routes
 * Handles airtime and data purchases using Reloadly
 */

import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth.js';
import { supabaseAdmin } from '../utils/supabase.js';
import { reloadlyService, ReloadlyAPIError } from '../services/reloadly/index.js';
import { nanoid } from 'nanoid';

const purchaseAirtimeSchema = z.object({
  phone_number: z.string().min(10).max(15),
  amount_ngn: z.number().positive().min(50).max(50000),
  operator_id: z.number().optional(), // If not provided, auto-detect
  crypto_asset: z.enum(['USDC', 'USDT']),
  crypto_chain: z.enum(['solana', 'base', 'polygon']),
});

const getOperatorsSchema = z.object({
  include_data: z.boolean().optional().default(true),
});

export const billsRoutes: FastifyPluginAsync = async (fastify) => {
  // Apply auth middleware to all routes
  fastify.addHook('onRequest', authMiddleware);

  /**
   * Check if bills service is available
   */
  fastify.get('/status', async (request, reply) => {
    const isConfigured = reloadlyService.isConfigured();
    return {
      available: isConfigured,
      message: isConfigured ? 'Bills service is available' : 'Bills service not configured',
    };
  });

  /**
   * Get Nigerian mobile operators
   */
  fastify.get('/operators', async (request, reply) => {
    try {
      const operators = await reloadlyService.getNigerianOperators();

      // Filter to only main airtime operators (not data bundles)
      // The main operators have names like "MTN Nigeria", "Airtel Nigeria", etc.
      const mainOperatorNames = [
        'MTN Nigeria',
        'Airtel Nigeria',
        'Glo',
        '9mobile',
        '9mobile (Etisalat)',
        'Globacom Nigeria',
      ];

      // Filter and deduplicate - prefer operators that support airtime
      const mainOperators = operators.filter((op) => {
        const isMainOperator = mainOperatorNames.some(name =>
          op.name.toLowerCase() === name.toLowerCase() ||
          op.name.toLowerCase().startsWith(name.toLowerCase().split(' ')[0])
        );
        // Exclude data-only bundles
        const isNotDataBundle = !op.name.toLowerCase().includes('bundle') &&
                                !op.name.toLowerCase().includes('data');
        return isMainOperator && isNotDataBundle;
      });

      // Deduplicate by carrier name (keep first match which is usually the main airtime operator)
      const seenCarriers = new Set<string>();
      const uniqueOperators = mainOperators.filter((op) => {
        const carrier = op.name.toLowerCase().includes('mtn') ? 'mtn' :
                        op.name.toLowerCase().includes('airtel') ? 'airtel' :
                        op.name.toLowerCase().includes('glo') ? 'glo' :
                        op.name.toLowerCase().includes('9mobile') || op.name.toLowerCase().includes('etisalat') ? '9mobile' :
                        op.name.toLowerCase();
        if (seenCarriers.has(carrier)) return false;
        seenCarriers.add(carrier);
        return true;
      });

      // Map to simplified format for frontend
      const simplified = uniqueOperators.map((op) => ({
        id: op.operatorId,
        name: op.name,
        logo: op.logoUrls?.[0] || null,
        supportsData: op.data,
        supportsAirtime: !op.data || op.bundle,
        minAmount: op.localMinAmount,
        maxAmount: op.localMaxAmount,
        fixedAmounts: op.localFixedAmounts,
        denominationType: op.denominationType,
      }));

      return { operators: simplified };
    } catch (error) {
      request.log.error({ error }, 'Failed to fetch operators');
      if (error instanceof ReloadlyAPIError) {
        return reply.status(error.status || 500).send({ error: error.message });
      }
      return reply.status(500).send({ error: 'Failed to fetch operators' });
    }
  });

  /**
   * Auto-detect operator from phone number
   */
  fastify.get('/detect-operator/:phoneNumber', async (request, reply) => {
    const { phoneNumber } = request.params as { phoneNumber: string };

    try {
      const operator = await reloadlyService.detectOperator(phoneNumber);
      return {
        operator_id: operator.operatorId,
        name: operator.name,
        supports_data: operator.data,
      };
    } catch (error) {
      request.log.error({ error }, 'Failed to detect operator');
      if (error instanceof ReloadlyAPIError) {
        return reply.status(error.status || 500).send({ error: error.message });
      }
      return reply.status(500).send({ error: 'Failed to detect operator' });
    }
  });

  /**
   * Purchase airtime
   */
  fastify.post('/airtime', async (request, reply) => {
    const userId = (request as any).userId;
    const body = purchaseAirtimeSchema.parse(request.body);

    try {
      // Generate unique transaction ID
      const transactionId = `bill_${nanoid(16)}`;

      // Auto-detect operator if not provided
      let operatorId = body.operator_id;
      if (!operatorId) {
        const detected = await reloadlyService.detectOperator(body.phone_number);
        operatorId = detected.operatorId;
      }

      // Get operator details for pricing
      const operator = await reloadlyService.getOperator(operatorId);

      // Calculate crypto amount needed (using current rate)
      // For now, we'll use a simple USD/NGN rate - in production, integrate with your rate engine
      const usdNgnRate = 1600; // Example rate
      const amountUsd = body.amount_ngn / usdNgnRate;

      // Record transaction as pending
      const { data: billTx, error: insertError } = await supabaseAdmin
        .from('bill_transactions')
        .insert({
          id: transactionId,
          user_id: userId,
          type: 'airtime',
          provider: operator.name,
          operator_id: operatorId,
          phone_number: body.phone_number,
          amount_ngn: body.amount_ngn,
          amount_crypto: amountUsd,
          crypto_asset: body.crypto_asset,
          crypto_chain: body.crypto_chain,
          status: 'pending',
        })
        .select()
        .single();

      if (insertError) {
        request.log.error({ error: insertError }, 'Failed to create bill transaction');
        return reply.status(500).send({ error: 'Failed to create transaction' });
      }

      // Send the top-up via Reloadly
      const topupResult = await reloadlyService.sendTopup({
        operatorId,
        phoneNumber: body.phone_number,
        amount: body.amount_ngn,
        useLocalAmount: true,
        customIdentifier: transactionId,
      });

      // Update transaction with success
      await supabaseAdmin
        .from('bill_transactions')
        .update({
          status: 'completed',
          reloadly_transaction_id: topupResult.transactionId.toString(),
          delivered_amount: topupResult.deliveredAmount,
          completed_at: new Date().toISOString(),
        })
        .eq('id', transactionId);

      return {
        success: true,
        transaction_id: transactionId,
        reloadly_id: topupResult.transactionId,
        delivered_amount: topupResult.deliveredAmount,
        operator: operator.name,
        phone_number: body.phone_number,
      };
    } catch (error) {
      request.log.error({ error }, 'Failed to purchase airtime');
      if (error instanceof ReloadlyAPIError) {
        return reply.status(error.status || 500).send({ error: error.message });
      }
      return reply.status(500).send({ error: 'Failed to purchase airtime' });
    }
  });

  /**
   * Get bill transaction history
   */
  fastify.get('/history', async (request, reply) => {
    const userId = (request as any).userId;
    const { limit = 20, offset = 0 } = request.query as { limit?: number; offset?: number };

    try {
      const { data: transactions, error } = await supabaseAdmin
        .from('bill_transactions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        request.log.error({ error }, 'Failed to fetch bill history');
        return reply.status(500).send({ error: 'Failed to fetch history' });
      }

      return { transactions };
    } catch (error) {
      request.log.error({ error }, 'Failed to fetch bill history');
      return reply.status(500).send({ error: 'Failed to fetch history' });
    }
  });

  /**
   * Get Reloadly account balance (admin only)
   */
  fastify.get('/balance', async (request, reply) => {
    try {
      const balance = await reloadlyService.getBalance();
      return balance;
    } catch (error) {
      request.log.error({ error }, 'Failed to fetch balance');
      if (error instanceof ReloadlyAPIError) {
        return reply.status(error.status || 500).send({ error: error.message });
      }
      return reply.status(500).send({ error: 'Failed to fetch balance' });
    }
  });
};

