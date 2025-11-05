import { FastifyPluginAsync } from 'fastify';
import crypto from 'crypto';
import { env } from '../config/env.js';
import { supabaseAdmin } from '../utils/supabase.js';
import { paystackService } from '../services/payout/paystack.js';

export const webhookRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * Paystack webhook handler
   */
  fastify.post('/paystack', async (request, reply) => {
    // Verify webhook signature
    const hash = crypto
      .createHmac('sha512', env.PAYSTACK_SECRET_KEY)
      .update(JSON.stringify(request.body))
      .digest('hex');

    const signature = request.headers['x-paystack-signature'];

    if (hash !== signature) {
      return reply.status(401).send({ error: 'Invalid signature' });
    }

    const event = request.body as any;

    try {
      const result = await paystackService.handleWebhook(event);

      // Update payout status
      const { data: payout } = await supabaseAdmin
        .from('payouts')
        .select('*')
        .eq('provider_reference', result.reference)
        .single();

      if (payout) {
        await supabaseAdmin
          .from('payouts')
          .update({
            status: result.status,
            completed_at: new Date().toISOString(),
          })
          .eq('id', payout.id);

        fastify.log.info(`Updated payout ${payout.id} status to ${result.status}`);
      }

      return { received: true };
    } catch (error) {
      fastify.log.error('Webhook processing error:', error);
      return reply.status(400).send({ error: 'Webhook processing failed' });
    }
  });

  /**
   * Solana webhook (if using a service like Helius)
   */
  fastify.post('/solana', async (request, reply) => {
    // Process Solana transaction webhooks
    // This would be called by services like Helius or QuickNode
    const event = request.body as any;

    fastify.log.info('Received Solana webhook:', event);

    // Process the event
    // The monitor service already handles this, but webhooks provide faster notifications

    return { received: true };
  });

  /**
   * Base webhook (if using a service like Alchemy)
   */
  fastify.post('/base', async (request, reply) => {
    // Process Base transaction webhooks
    const event = request.body as any;

    fastify.log.info('Received Base webhook:', event);

    return { received: true };
  });
};

