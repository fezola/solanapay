/**
 * Sumsub Webhook Routes
 * Handles verification status updates from Sumsub
 */

import { FastifyPluginAsync } from 'fastify';
import { SumsubService } from '../services/kyc/index.js';
import { SumsubWebhookPayload } from '../services/kyc/sumsub-types.js';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

// Initialize Sumsub service if credentials are available
const sumsubService =
  env.SUMSUB_APP_TOKEN && env.SUMSUB_SECRET_KEY
    ? new SumsubService({
        appToken: env.SUMSUB_APP_TOKEN,
        secretKey: env.SUMSUB_SECRET_KEY,
        baseUrl: env.SUMSUB_BASE_URL,
        levelName: env.SUMSUB_LEVEL_NAME,
      })
    : null;

export const sumsubWebhookRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * Sumsub Webhook Endpoint
   * POST /api/webhooks/sumsub
   */
  fastify.post('/', async (request, reply) => {
    if (!sumsubService) {
      logger.error('Sumsub webhook received but service not configured');
      return reply.status(503).send({ error: 'Sumsub not configured' });
    }

    try {
      // Get webhook signature from headers
      const signature = request.headers['x-payload-digest'] as string;
      const rawBody = JSON.stringify(request.body);

      // Verify webhook signature if secret is configured
      if (env.SUMSUB_WEBHOOK_SECRET && signature) {
        const isValid = sumsubService.verifyWebhookSignature(
          rawBody,
          signature,
          env.SUMSUB_WEBHOOK_SECRET
        );

        if (!isValid) {
          logger.warn({
            msg: 'Invalid Sumsub webhook signature',
            signature,
          });
          return reply.status(401).send({ error: 'Invalid signature' });
        }
      }

      // Parse webhook payload
      const payload = request.body as SumsubWebhookPayload;

      logger.info({
        msg: 'Sumsub webhook received',
        type: payload.type,
        applicantId: payload.applicantId,
        externalUserId: payload.externalUserId,
        reviewStatus: payload.reviewStatus,
      });

      // Handle webhook event
      await sumsubService.handleWebhook(payload);

      // Return success
      return reply.status(200).send({ success: true });
    } catch (error: any) {
      logger.error({
        msg: 'Error processing Sumsub webhook',
        error: error.message,
        stack: error.stack,
      });

      // Return 200 to prevent Sumsub from retrying
      // (we've logged the error for investigation)
      return reply.status(200).send({ success: false, error: error.message });
    }
  });

  /**
   * Health check for webhook endpoint
   */
  fastify.get('/health', async (request, reply) => {
    return {
      status: 'ok',
      service: 'sumsub-webhooks',
      configured: !!sumsubService,
    };
  });
};

