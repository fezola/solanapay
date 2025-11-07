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
   *
   * Note: We need the raw body for signature verification
   */
  fastify.addContentTypeParser(
    'application/json',
    { parseAs: 'buffer' },
    (req, body, done) => {
      try {
        // Store raw body for signature verification
        (req as any).rawBody = body;
        // Parse JSON for request.body
        const json = JSON.parse(body.toString('utf8'));
        done(null, json);
      } catch (err: any) {
        err.statusCode = 400;
        done(err, undefined);
      }
    }
  );

  fastify.post('/', async (request, reply) => {
    if (!sumsubService) {
      logger.error('Sumsub webhook received but service not configured');
      return reply.status(503).send({ error: 'Sumsub not configured' });
    }

    try {
      // Get webhook signature and algorithm from headers
      const signature = request.headers['x-payload-digest'] as string;
      const algorithm = (request.headers['x-payload-digest-alg'] as string) || 'HMAC_SHA256_HEX';

      // Use raw body bytes for signature verification (as required by Sumsub)
      const rawBody = (request as any).rawBody as Buffer;

      logger.info({
        msg: 'Webhook headers received',
        signature: signature?.substring(0, 20) + '...',
        algorithm,
        hasRawBody: !!rawBody,
        bodyLength: rawBody?.length,
      });

      // Verify webhook signature if secret is configured and not a placeholder
      if (
        env.SUMSUB_WEBHOOK_SECRET &&
        env.SUMSUB_WEBHOOK_SECRET !== 'your_webhook_secret_here' &&
        signature &&
        rawBody
      ) {
        const isValid = sumsubService.verifyWebhookSignature(
          rawBody.toString('utf8'), // Convert buffer to string for HMAC
          signature,
          env.SUMSUB_WEBHOOK_SECRET,
          algorithm
        );

        if (!isValid) {
          logger.warn({
            msg: 'Invalid Sumsub webhook signature',
            signature: signature?.substring(0, 20) + '...',
            algorithm,
            bodyPreview: rawBody.toString('utf8').substring(0, 100),
            secretPreview: env.SUMSUB_WEBHOOK_SECRET.substring(0, 5) + '...',
          });
          return reply.status(401).send({ error: 'Invalid signature' });
        }

        logger.info({ msg: 'Webhook signature verified successfully', algorithm });
      } else {
        logger.warn({
          msg: 'Webhook signature verification skipped - secret not configured or missing data',
          hasSecret: !!env.SUMSUB_WEBHOOK_SECRET,
          hasSignature: !!signature,
          hasRawBody: !!rawBody,
        });
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

