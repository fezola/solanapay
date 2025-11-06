import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth.js';
import { supabaseAdmin } from '../utils/supabase.js';
import { BreadService } from '../services/bread/index.js';
import { env } from '../config/env.js';
import { nanoid } from 'nanoid';

// Initialize Bread service
const breadService = new BreadService({
  apiKey: env.BREAD_API_KEY!,
  baseUrl: env.BREAD_API_URL,
});

const createBeneficiarySchema = z.object({
  bank_code: z.string(),
  account_number: z.string().length(10),
});

const confirmQuoteSchema = z.object({
  quote_id: z.string().uuid(),
  beneficiary_id: z.string().uuid(),
});

export const payoutRoutes: FastifyPluginAsync = async (fastify) => {
  // Apply auth middleware to all routes
  fastify.addHook('onRequest', authMiddleware);

  /**
   * Get list of Nigerian banks
   */
  fastify.get('/banks', async (request, reply) => {
    try {
      const banks = await breadService.offramp.getBanks();
      return { banks, provider: 'bread' };
    } catch (error) {
      request.log.error({ error }, 'Failed to fetch banks');
      return reply.status(500).send({ error: 'Failed to fetch banks' });
    }
  });

  /**
   * Verify bank account (without creating beneficiary)
   */
  fastify.post('/verify-account', async (request, reply) => {
    const body = createBeneficiarySchema.parse(request.body);

    try {
      const verification = await breadService.beneficiary.verifyBankAccount(
        body.bank_code,
        body.account_number
      );

      return {
        account_number: body.account_number,
        account_name: verification.accountName,
        bank_code: body.bank_code,
      };
    } catch (error: any) {
      request.log.error('Account verification failed:', error);
      return reply.status(400).send({
        error: 'Account verification failed',
        message: error.message || 'Could not verify account details',
      });
    }
  });

  /**
   * Create and verify beneficiary
   */
  fastify.post('/beneficiaries', async (request, reply) => {
    const userId = request.userId!;
    const body = createBeneficiarySchema.parse(request.body);

    // Verify account with Bread
    try {
      const verification = await breadService.beneficiary.verifyBankAccount(
        body.bank_code,
        body.account_number
      );

      // Get bank name
      const banks = await breadService.offramp.getBanks();
      const bank = banks.find((b: any) => b.code === body.bank_code);

      if (!bank) {
        return reply.status(400).send({ error: 'Invalid bank code' });
      }

      // Check if beneficiary already exists
      const { data: existing } = await supabaseAdmin
        .from('payout_beneficiaries')
        .select('*')
        .eq('user_id', userId)
        .eq('account_number', body.account_number)
        .eq('bank_code', body.bank_code)
        .single();

      if (existing) {
        return { beneficiary: existing };
      }

      // Create beneficiary
      const { data: beneficiary, error } = await supabaseAdmin
        .from('payout_beneficiaries')
        .insert({
          user_id: userId,
          bank_code: body.bank_code,
          bank_name: bank.name,
          account_number: body.account_number,
          account_name: verification.accountName,
          verified_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        request.log.error({ error }, 'Failed to create beneficiary');
        return reply.status(500).send({ error: 'Failed to create beneficiary' });
      }

      return { beneficiary };
    } catch (error: any) {
      request.log.error('Account verification failed:', error);
      return reply.status(400).send({
        error: 'Account verification failed',
        message: error.message,
      });
    }
  });

  /**
   * Get user's beneficiaries
   */
  fastify.get('/beneficiaries', async (request, reply) => {
    const userId = request.userId!;

    const { data: beneficiaries, error } = await supabaseAdmin
      .from('payout_beneficiaries')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      return reply.status(500).send({ error: 'Failed to fetch beneficiaries' });
    }

    return { beneficiaries };
  });

  /**
   * Delete beneficiary
   */
  fastify.delete('/beneficiaries/:id', async (request, reply) => {
    const userId = request.userId!;
    const { id } = request.params as { id: string };

    const { error } = await supabaseAdmin
      .from('payout_beneficiaries')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      return reply.status(500).send({ error: 'Failed to delete beneficiary' });
    }

    return { message: 'Beneficiary deleted successfully' };
  });

  /**
   * Confirm quote and initiate payout
   */
  fastify.post('/confirm', async (request, reply) => {
    const userId = request.userId!;
    const body = confirmQuoteSchema.parse(request.body);

    // Get quote
    const { data: quote } = await supabaseAdmin
      .from('quotes')
      .select('*')
      .eq('id', body.quote_id)
      .eq('user_id', userId)
      .single();

    if (!quote) {
      return reply.status(404).send({ error: 'Quote not found' });
    }

    // Validate quote
    if (quote.status !== 'active') {
      return reply.status(400).send({ error: 'Quote is not active' });
    }

    const isExpired = new Date(quote.lock_expires_at) < new Date();
    if (isExpired) {
      return reply.status(400).send({ error: 'Quote has expired' });
    }

    // Get beneficiary
    const { data: beneficiary } = await supabaseAdmin
      .from('payout_beneficiaries')
      .select('*')
      .eq('id', body.beneficiary_id)
      .eq('user_id', userId)
      .single();

    if (!beneficiary) {
      return reply.status(404).send({ error: 'Beneficiary not found' });
    }

    // Check user has sufficient balance
    // This would check the onchain_deposits table for confirmed, unswept deposits
    // For now, we'll assume balance is sufficient

    try {
      const reference = `PAYOUT_${nanoid(16)}`;
      let providerReference = reference;
      let transferStatus = 'pending';
      let provider = 'bread';

      // Execute Bread offramp
      request.log.info({
        quoteId: quote.id,
        asset: quote.asset,
        chain: quote.chain,
        amount: quote.crypto_amount,
      }, 'Executing Bread offramp');

      // TODO: Implement actual Bread offramp execution
      // For now, we'll create the payout record and mark it as pending
      transferStatus = 'pending_execution';

      // Create payout record
      const { data: payout, error: payoutError } = await supabaseAdmin
        .from('payouts')
        .insert({
          user_id: userId,
          quote_id: quote.id,
          beneficiary_id: beneficiary.id,
          fiat_amount: quote.fiat_amount,
          currency: quote.currency,
          provider,
          provider_reference: providerReference,
          status: 'pending',
        })
        .select()
        .single();

      if (payoutError) {
        request.log.error({ error: payoutError }, 'Failed to create payout record');
        return reply.status(500).send({ error: 'Failed to create payout' });
      }

      // Mark quote as executed
      await supabaseAdmin
        .from('quotes')
        .update({
          status: 'executed',
          executed_at: new Date().toISOString(),
        })
        .eq('id', quote.id);

      // Update limits
      await updateUserLimits(userId, parseFloat(quote.fiat_amount));

      return {
        payout,
        transfer: {
          reference: providerReference,
          status: transferStatus,
          provider,
        },
      };
    } catch (error: any) {
      request.log.error('Payout failed:', error);
      return reply.status(500).send({
        error: 'Payout failed',
        message: error.message,
      });
    }
  });

  /**
   * Get payout history
   */
  fastify.get('/', async (request, reply) => {
    const userId = request.userId!;
    const { limit = 20 } = request.query as { limit?: number };

    const { data: payouts, error } = await supabaseAdmin
      .from('payouts')
      .select(`
        *,
        quote:quotes(*),
        beneficiary:payout_beneficiaries(*)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      return reply.status(500).send({ error: 'Failed to fetch payouts' });
    }

    return { payouts };
  });

  /**
   * Get specific payout
   */
  fastify.get('/:id', async (request, reply) => {
    const userId = request.userId!;
    const { id } = request.params as { id: string };

    const { data: payout, error } = await supabaseAdmin
      .from('payouts')
      .select(`
        *,
        quote:quotes(*),
        beneficiary:payout_beneficiaries(*)
      `)
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (error || !payout) {
      return reply.status(404).send({ error: 'Payout not found' });
    }

    return { payout };
  });
};

/**
 * Update user limits after payout
 */
async function updateUserLimits(userId: string, amount: number) {
  const periods = ['daily', 'weekly', 'monthly'];

  for (const period of periods) {
    const { data: limit } = await supabaseAdmin
      .from('limits')
      .select('*')
      .eq('user_id', userId)
      .eq('period', period)
      .eq('asset', 'ALL')
      .single();

    if (limit) {
      const newUsed = parseFloat(limit.used_amount) + amount;
      
      await supabaseAdmin
        .from('limits')
        .update({ used_amount: newUsed.toString() })
        .eq('id', limit.id);
    }
  }
}

