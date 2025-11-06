/**
 * Bread Africa Webhook Handler
 * Processes webhook events from Bread API
 */

import crypto from 'crypto';
import { logger } from '../../utils/logger.js';
import { BreadWebhookPayload, BreadOfframp } from './types.js';

export class BreadWebhookHandler {
  constructor(private webhookSecret?: string) {}

  /**
   * Verify webhook signature
   */
  verifySignature(payload: string, signature: string): boolean {
    if (!this.webhookSecret) {
      logger.warn({
        msg: 'Webhook secret not configured, skipping signature verification',
      });
      return true;
    }

    const expectedSignature = crypto
      .createHmac('sha256', this.webhookSecret)
      .update(payload)
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  }

  /**
   * Process webhook event
   */
  async processWebhook(
    payload: BreadWebhookPayload,
    handlers: {
      onOfframpCreated?: (offramp: BreadOfframp) => Promise<void>;
      onOfframpProcessing?: (offramp: BreadOfframp) => Promise<void>;
      onOfframpCompleted?: (offramp: BreadOfframp) => Promise<void>;
      onOfframpFailed?: (offramp: BreadOfframp) => Promise<void>;
      onWalletDeposit?: (data: any) => Promise<void>;
      onIdentityVerified?: (data: any) => Promise<void>;
      onIdentityRejected?: (data: any) => Promise<void>;
    }
  ): Promise<void> {
    logger.info({
      msg: 'Processing Bread webhook',
      event: payload.event,
      timestamp: payload.timestamp,
    });

    try {
      switch (payload.event) {
        case 'offramp.created':
          if (handlers.onOfframpCreated) {
            await handlers.onOfframpCreated(payload.data as BreadOfframp);
          }
          break;

        case 'offramp.processing':
          if (handlers.onOfframpProcessing) {
            await handlers.onOfframpProcessing(payload.data as BreadOfframp);
          }
          break;

        case 'offramp.completed':
          if (handlers.onOfframpCompleted) {
            await handlers.onOfframpCompleted(payload.data as BreadOfframp);
          }
          break;

        case 'offramp.failed':
          if (handlers.onOfframpFailed) {
            await handlers.onOfframpFailed(payload.data as BreadOfframp);
          }
          break;

        case 'wallet.deposit':
          if (handlers.onWalletDeposit) {
            await handlers.onWalletDeposit(payload.data);
          }
          break;

        case 'identity.verified':
          if (handlers.onIdentityVerified) {
            await handlers.onIdentityVerified(payload.data);
          }
          break;

        case 'identity.rejected':
          if (handlers.onIdentityRejected) {
            await handlers.onIdentityRejected(payload.data);
          }
          break;

        default:
          logger.warn({
            msg: 'Unknown webhook event',
            event: payload.event,
          });
      }

      logger.info({
        msg: 'Bread webhook processed successfully',
        event: payload.event,
      });
    } catch (error) {
      logger.error({
        msg: 'Error processing Bread webhook',
        event: payload.event,
        error,
      });
      throw error;
    }
  }
}

