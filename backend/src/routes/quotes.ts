import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth.js';
import { supabaseAdmin } from '../utils/supabase.js';
import { BreadService } from '../services/bread/index.js';
import { rateEngine } from '../services/pricing/rate-engine.js';
import { env } from '../config/env.js';
import type { Asset, Chain } from '../types/index.js';

// Initialize Bread service
const breadService = new BreadService({
  apiKey: env.BREAD_API_KEY!,
  baseUrl: env.BREAD_API_URL,
});

const createQuoteSchema = z.object({
  asset: z.enum(['USDC', 'SOL', 'USDT', 'ETH']),
  chain: z.enum(['solana', 'base']),
  crypto_amount: z.number().positive().optional(),
  fiat_target: z.number().positive().optional(),
  currency: z.string().default('NGN'),
}).refine(
  (data) => data.crypto_amount || data.fiat_target,
  { message: 'Either crypto_amount or fiat_target must be provided' }
);

export const quoteRoutes: FastifyPluginAsync = async (fastify) => {
  // Apply auth middleware to all routes
  fastify.addHook('onRequest', authMiddleware);

  /**
   * Create a new quote
   */
  fastify.post('/', async (request, reply) => {
    try {
      const userId = request.userId!;
      request.log.info({ body: request.body }, '🔵 Creating quote...');
      const body = createQuoteSchema.parse(request.body);

      // KYC check removed - offramp is now open for all users
      // Daily limit check removed - no limits enforced

    // Calculate quote using Bread if enabled, otherwise use legacy rate engine
    let quote;
    let breadQuoteData = null;

    if (breadService && body.crypto_amount) {
      // Use Bread API for quote
      try {
        const breadQuote = await breadService.offramp.getQuote(
          body.asset as Asset,
          body.chain as Chain,
          body.crypto_amount
        );

        // Map Bread response to our quote format
        quote = {
          cryptoAmount: body.crypto_amount,
          spotPrice: breadQuote.data.rate,
          fxRate: breadQuote.data.rate,
          spreadBps: 0, // Bread includes spread in rate
          flatFee: breadQuote.data.fee,
          variableFeeBps: 0,
          totalFee: breadQuote.data.fee,
          grossFiatAmount: breadQuote.data.output_amount + breadQuote.data.fee,
          fiatAmount: breadQuote.data.output_amount,
        };

        breadQuoteData = {
          expiry: breadQuote.data.expiry,
          type: breadQuote.data.type,
        };

        request.log.info({
          asset: body.asset,
          chain: body.chain,
          cryptoAmount: body.crypto_amount,
          fiatAmount: quote.fiatAmount,
        }, 'Quote generated using Bread API');
      } catch (error) {
        request.log.error({ error }, 'Bread API failed, falling back to legacy');
        // Fall back to legacy rate engine
        quote = await rateEngine.calculateQuote({
          asset: body.asset as Asset,
          chain: body.chain as Chain,
          cryptoAmount: body.crypto_amount,
          fiatTarget: body.fiat_target,
          currency: body.currency,
        });
      }
    } else {
      // Use legacy rate engine
      quote = await rateEngine.calculateQuote({
        asset: body.asset as Asset,
        chain: body.chain as Chain,
        cryptoAmount: body.crypto_amount,
        fiatTarget: body.fiat_target,
        currency: body.currency,
      });
    }

    // Create quote record
    const lockExpiresAt = breadQuoteData?.expiry
      ? new Date(breadQuoteData.expiry)
      : new Date(Date.now() + env.QUOTE_LOCK_SECONDS * 1000);

    const { data: quoteRecord, error } = await supabaseAdmin
      .from('quotes')
      .insert({
        user_id: userId,
        crypto_asset: body.asset,  // Changed from 'asset' to 'crypto_asset'
        crypto_network: body.chain,  // Changed from 'chain' to 'crypto_network'
        crypto_amount: quote.cryptoAmount.toString(),
        spot_price: quote.spotPrice.toString(),
        fx_rate: quote.fxRate.toString(),
        spread_bps: quote.spreadBps || 0,
        flat_fee: quote.flatFee.toString(),
        variable_fee_bps: quote.variableFeeBps || 0,
        total_fees: quote.totalFee.toString(),  // Changed from 'total_fee' to 'total_fees'
        fiat_amount: quote.fiatAmount.toString(),
        final_amount: quote.fiatAmount.toString(),  // Added final_amount (same as fiat_amount)
        locked_until: lockExpiresAt.toISOString(),  // Changed from 'lock_expires_at' to 'locked_until'
        is_used: false,  // Added is_used field
        metadata: {
          currency: body.currency,
          provider: breadService ? 'bread' : 'legacy',
        },
      })
      .select()
      .single();

    if (error) {
      request.log.error({ error }, 'Failed to create quote');
      return reply.status(500).send({ error: 'Failed to create quote', details: error.message });
    }

    return {
      quote: quoteRecord,
      breakdown: {
        crypto_amount: quote.cryptoAmount,
        spot_price: quote.spotPrice,
        fx_rate: quote.fxRate,
        gross_fiat_amount: quote.grossFiatAmount,
        fees: {
          flat_fee: quote.flatFee,
          variable_fee: quote.totalFee - quote.flatFee,
          total_fee: quote.totalFee,
        },
        net_fiat_amount: quote.fiatAmount,
      },
      expires_in_seconds: env.QUOTE_LOCK_SECONDS,
      expires_at: lockExpiresAt.toISOString(),
    };
    } catch (error: any) {
      request.log.error({ error: error.message, stack: error.stack }, '❌ Quote creation failed');
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: error.message,
        details: error.stack
      });
    }
  });

  /**
   * Get quote by ID
   */
  fastify.get('/:id', async (request, reply) => {
    const userId = request.userId!;
    const { id } = request.params as { id: string };

    const { data: quote, error } = await supabaseAdmin
      .from('quotes')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (error || !quote) {
      return reply.status(404).send({ error: 'Quote not found' });
    }

    // Check if expired
    const isExpired = new Date(quote.lock_expires_at) < new Date();
    
    if (isExpired && quote.status === 'active') {
      // Mark as expired
      await supabaseAdmin
        .from('quotes')
        .update({ status: 'expired' })
        .eq('id', id);
      
      quote.status = 'expired';
    }

    return { quote };
  });

  /**
   * Get user's quote history
   */
  fastify.get('/', async (request, reply) => {
    const userId = request.userId!;
    const { status, limit = 20 } = request.query as { status?: string; limit?: number };

    let query = supabaseAdmin
      .from('quotes')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (status) {
      query = query.eq('status', status);
    }

    const { data: quotes, error } = await query;

    if (error) {
      return reply.status(500).send({ error: 'Failed to fetch quotes' });
    }

    return { quotes };
  });

  /**
   * Cancel a quote
   */
  fastify.post('/:id/cancel', async (request, reply) => {
    const userId = request.userId!;
    const { id } = request.params as { id: string };

    const { data: quote } = await supabaseAdmin
      .from('quotes')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (!quote) {
      return reply.status(404).send({ error: 'Quote not found' });
    }

    if (quote.status !== 'active') {
      return reply.status(400).send({ error: 'Quote cannot be cancelled' });
    }

    const { error } = await supabaseAdmin
      .from('quotes')
      .update({ status: 'cancelled' })
      .eq('id', id);

    if (error) {
      return reply.status(500).send({ error: 'Failed to cancel quote' });
    }

    return { message: 'Quote cancelled successfully' };
  });

  /**
   * Validate quote is still valid
   */
  fastify.post('/:id/validate', async (request, reply) => {
    const userId = request.userId!;
    const { id } = request.params as { id: string };

    const { data: quote } = await supabaseAdmin
      .from('quotes')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (!quote) {
      return reply.status(404).send({ error: 'Quote not found' });
    }

    // Check expiration
    const isExpired = new Date(quote.lock_expires_at) < new Date();
    if (isExpired) {
      return {
        valid: false,
        reason: 'Quote has expired',
      };
    }

    // Check price slippage
    const isValid = await rateEngine.validateQuote(
      quote.asset as Asset,
      parseFloat(quote.spot_price),
      100 // 1% slippage tolerance
    );

    if (!isValid) {
      return {
        valid: false,
        reason: 'Price has moved beyond acceptable range',
      };
    }

    return {
      valid: true,
      expires_in_seconds: Math.floor(
        (new Date(quote.lock_expires_at).getTime() - Date.now()) / 1000
      ),
    };
  });
};

