/**
 * Sumsub KYC Service
 * Handles KYC verification using Sumsub
 */

import { SumsubClient, SumsubConfig } from './sumsub-client.js';
import { supabaseAdmin } from '../../utils/supabase.js';
import { logger } from '../../utils/logger.js';
import {
  SumsubWebhookPayload,
  ReviewResult,
  KYC_TIER_MAPPING,
} from './sumsub-types.js';

export class SumsubService {
  private client: SumsubClient;

  constructor(config: SumsubConfig) {
    this.client = new SumsubClient(config);
  }

  /**
   * Initialize KYC for a user
   */
  async initializeKYC(
    userId: string,
    email?: string,
    phone?: string
  ): Promise<{
    applicantId: string;
    accessToken: string;
  }> {
    logger.info({
      msg: 'Initializing KYC for user',
      userId,
    });

    // Check if applicant already exists
    let applicant = await this.client.getApplicantByExternalId(userId);

    if (!applicant) {
      // Create new applicant
      applicant = await this.client.createApplicant({
        externalUserId: userId,
        email,
        phone,
      });

      // Update user record with Sumsub applicant ID
      await supabaseAdmin
        .from('users')
        .update({
          sumsub_applicant_id: applicant.id,
          kyc_status: 'pending',
        })
        .eq('id', userId);

      logger.info({
        msg: 'User updated with Sumsub applicant ID',
        userId,
        applicantId: applicant.id,
      });
    }

    // Generate access token for Web SDK
    const tokenResponse = await this.client.generateAccessToken(userId);

    return {
      applicantId: applicant.id,
      accessToken: tokenResponse.token,
    };
  }

  /**
   * Get KYC status for a user
   */
  async getKYCStatus(userId: string): Promise<{
    status: string;
    tier: number;
    applicantId?: string;
    reviewResult?: ReviewResult;
    rejectLabels?: string[];
  }> {
    logger.debug({
      msg: 'Getting KYC status for user',
      userId,
    });

    // Get user from database
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('sumsub_applicant_id, kyc_status, kyc_tier')
      .eq('id', userId)
      .single();

    if (!user || !user.sumsub_applicant_id) {
      return {
        status: 'not_started',
        tier: 0,
      };
    }

    // Get applicant status from Sumsub
    const applicantStatus = await this.client.getApplicantStatus(
      user.sumsub_applicant_id
    );

    return {
      status: this.mapReviewStatusToKYCStatus(applicantStatus.reviewStatus),
      tier: user.kyc_tier || 0,
      applicantId: user.sumsub_applicant_id,
      reviewResult: applicantStatus.reviewResult,
      rejectLabels: applicantStatus.rejectLabels,
    };
  }

  /**
   * Handle webhook event from Sumsub
   */
  async handleWebhook(payload: SumsubWebhookPayload): Promise<void> {
    logger.info({
      msg: 'Processing Sumsub webhook',
      type: payload.type,
      applicantId: payload.applicantId,
      externalUserId: payload.externalUserId,
    });

    const { externalUserId, applicantId, reviewResult, reviewStatus, levelName } = payload;

    // Try to find user by externalUserId first, then by applicantId
    let user = null;
    let userId = null;

    if (externalUserId) {
      const { data } = await supabaseAdmin
        .from('users')
        .select('id, kyc_status, kyc_tier')
        .eq('id', externalUserId)
        .single();

      user = data;
      userId = externalUserId;
    }

    // If not found by externalUserId, try by applicantId
    if (!user && applicantId) {
      const { data } = await supabaseAdmin
        .from('users')
        .select('id, kyc_status, kyc_tier')
        .eq('sumsub_applicant_id', applicantId)
        .single();

      user = data;
      userId = data?.id;

      logger.info({
        msg: 'User found by applicantId',
        applicantId,
        userId,
      });
    }

    if (!user || !userId) {
      logger.warn({
        msg: 'User not found for webhook',
        externalUserId,
        applicantId,
      });
      return;
    }

    // Determine KYC status and tier based on review result
    let kycStatus = this.mapReviewStatusToKYCStatus(reviewStatus);
    let kycTier = user.kyc_tier || 0;

    if (payload.type === 'applicantReviewed' && reviewResult) {
      if (reviewResult.reviewAnswer === 'GREEN') {
        kycStatus = 'approved';
        kycTier = KYC_TIER_MAPPING[levelName] || 1;
      } else if (reviewResult.reviewAnswer === 'RED') {
        kycStatus = 'rejected';
        kycTier = 0;
      } else if (reviewResult.reviewAnswer === 'RETRY') {
        kycStatus = 'pending';
      }
    }

    // Update user record
    await supabaseAdmin
      .from('users')
      .update({
        sumsub_applicant_id: applicantId,
        kyc_status: kycStatus,
        kyc_tier: kycTier,
        kyc_verified_at: kycStatus === 'approved' ? new Date().toISOString() : null,
      })
      .eq('id', userId);

    logger.info({
      msg: 'User KYC status updated from webhook',
      userId,
      kycStatus,
      kycTier,
      reviewAnswer: reviewResult?.reviewAnswer,
    });

    // Log webhook event
    await supabaseAdmin.from('kyc_verifications').insert({
      user_id: externalUserId,
      provider: 'sumsub',
      applicant_id: applicantId,
      status: kycStatus,
      tier: kycTier,
      review_result: reviewResult?.reviewAnswer,
      reject_labels: reviewResult?.rejectLabels,
      webhook_type: payload.type,
      raw_data: payload,
    });
  }

  /**
   * Retry KYC verification
   */
  async retryKYC(userId: string): Promise<{
    applicantId: string;
    accessToken: string;
  }> {
    logger.info({
      msg: 'Retrying KYC for user',
      userId,
    });

    // Get user's applicant ID
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('sumsub_applicant_id')
      .eq('id', userId)
      .single();

    if (!user?.sumsub_applicant_id) {
      throw new Error('No existing KYC application found');
    }

    // Reset applicant in Sumsub
    await this.client.resetApplicant(user.sumsub_applicant_id);

    // Update user status
    await supabaseAdmin
      .from('users')
      .update({
        kyc_status: 'pending',
      })
      .eq('id', userId);

    // Generate new access token
    const tokenResponse = await this.client.generateAccessToken(userId);

    return {
      applicantId: user.sumsub_applicant_id,
      accessToken: tokenResponse.token,
    };
  }

  /**
   * Map Sumsub review status to KYC status
   */
  private mapReviewStatusToKYCStatus(reviewStatus?: string): string {
    switch (reviewStatus) {
      case 'init':
        return 'not_started';
      case 'pending':
      case 'queued':
      case 'prechecked':
        return 'pending';
      case 'completed':
        return 'approved'; // Will be overridden by review result
      case 'onHold':
        return 'on_hold';
      default:
        return 'not_started';
    }
  }

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(
    payload: string,
    signature: string,
    secret: string,
    algorithm?: string
  ): boolean {
    return this.client.verifyWebhookSignature(payload, signature, secret, algorithm);
  }
}

