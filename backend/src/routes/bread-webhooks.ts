/**
 * Bread Africa Webhook Routes
 * Handles webhook events from Bread API
 */

import { FastifyPluginAsync } from 'fastify';
import { BreadWebhookHandler } from '../services/bread/webhooks.js';
import { BreadWebhookPayload, BreadOfframp } from '../services/bread/types.js';
import { supabaseAdmin } from '../utils/supabase.js';
import { logger } from '../utils/logger.js';
import { env } from '../config/env.js';

export const breadWebhookRoutes: FastifyPluginAsync = async (fastify) => {
  const webhookHandler = new BreadWebhookHandler(env.BREAD_WEBHOOK_SECRET);

  /**
   * Receive webhook from Bread
   */
  fastify.post('/bread', async (request, reply) => {
    try {
      const signature = request.headers['x-bread-signature'] as string;
      const payload = request.body as BreadWebhookPayload;

      // Verify signature
      if (signature) {
        const rawBody = JSON.stringify(request.body);
        const isValid = webhookHandler.verifySignature(rawBody, signature);

        if (!isValid) {
          logger.warn({ msg: 'Invalid Bread webhook signature' });
          return reply.status(401).send({ error: 'Invalid signature' });
        }
      }

      // Log webhook event
      await supabaseAdmin.from('bread_webhook_events').insert({
        event_type: payload.event,
        event_id: `${payload.event}-${Date.now()}`,
        payload: payload as any,
        processed: false,
      });

      // Process webhook
      await webhookHandler.processWebhook(payload, {
        onOfframpCreated: async (offramp: BreadOfframp) => {
          logger.info({
            msg: 'Bread offramp created',
            offrampId: offramp.id,
          });

          // Update payout status
          await supabaseAdmin
            .from('payouts')
            .update({
              status: 'processing',
            })
            .eq('bread_offramp_id', offramp.id);
        },

        onOfframpProcessing: async (offramp: BreadOfframp) => {
          logger.info({
            msg: 'Bread offramp processing',
            offrampId: offramp.id,
          });

          await supabaseAdmin
            .from('payouts')
            .update({
              status: 'processing',
            })
            .eq('bread_offramp_id', offramp.id);
        },

        onOfframpCompleted: async (offramp: BreadOfframp) => {
          logger.info({
            msg: 'Bread offramp completed',
            offrampId: offramp.id,
            fiatAmount: offramp.fiatAmount,
          });

          // Update payout status
          await supabaseAdmin
            .from('payouts')
            .update({
              status: 'success',
              completed_at: new Date().toISOString(),
              bread_tx_hash: offramp.txHash,
            })
            .eq('bread_offramp_id', offramp.id);

          // Update quote status
          const { data: payout } = await supabaseAdmin
            .from('payouts')
            .select('quote_id')
            .eq('bread_offramp_id', offramp.id)
            .single();

          if (payout) {
            await supabaseAdmin
              .from('quotes')
              .update({
                status: 'executed',
                executed_at: new Date().toISOString(),
              })
              .eq('id', payout.quote_id);
          }
        },

        onOfframpFailed: async (offramp: BreadOfframp) => {
          logger.error({
            msg: 'Bread offramp failed',
            offrampId: offramp.id,
            error: offramp.errorMessage,
          });

          // Update payout status
          await supabaseAdmin
            .from('payouts')
            .update({
              status: 'failed',
              error_message: offramp.errorMessage,
            })
            .eq('bread_offramp_id', offramp.id);
        },

        onWalletDeposit: async (data: any) => {
          logger.info({
            msg: 'Bread wallet deposit detected',
            data,
          });

          // This is handled automatically by Bread for offramp wallets
          // Just log for monitoring
        },

        onIdentityVerified: async (data: any) => {
          logger.info({
            msg: 'Bread identity verified',
            identityId: data.id,
          });

          // Update user KYC status
          await supabaseAdmin
            .from('users')
            .update({
              bread_identity_status: 'verified',
              kyc_status: 'approved',
              kyc_tier: 1,
            })
            .eq('bread_identity_id', data.id);
        },

        onIdentityRejected: async (data: any) => {
          logger.warn({
            msg: 'Bread identity rejected',
            identityId: data.id,
          });

          // Update user KYC status
          await supabaseAdmin
            .from('users')
            .update({
              bread_identity_status: 'rejected',
              kyc_status: 'rejected',
            })
            .eq('bread_identity_id', data.id);
        },
      });

      // Mark webhook as processed
      await supabaseAdmin
        .from('bread_webhook_events')
        .update({
          processed: true,
          processed_at: new Date().toISOString(),
        })
        .eq('event_id', `${payload.event}-${Date.now()}`);

      return { success: true };
    } catch (error) {
      logger.error({
        msg: 'Failed to process Bread webhook',
        error,
      });

      return reply.status(500).send({ error: 'Webhook processing failed' });
    }
  });

  /**
   * Get webhook event history (admin only)
   */
  fastify.get('/bread/events', async (request, reply) => {
    const { data: events, error } = await supabaseAdmin
      .from('bread_webhook_events')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      return reply.status(500).send({ error: 'Failed to fetch events' });
    }

    return { events };
  });
};

