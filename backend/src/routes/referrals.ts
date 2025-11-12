import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { referralService } from '../services/referral/index.js';
import { supabaseAdmin } from '../utils/supabase.js';
import { authMiddleware } from '../middleware/auth.js';

const applyReferralSchema = z.object({
  referralCode: z.string().min(6).max(8),
  deviceFingerprint: z.string().optional(),
});

export const referralRoutes: FastifyPluginAsync = async (fastify) => {
  // Apply auth middleware to all routes
  fastify.addHook('onRequest', authMiddleware);
  /**
   * Get user's referral code
   * GET /api/referrals/code
   */
  fastify.get('/code', async (request, reply) => {
    const userId = request.userId!;

    try {
      let referralCode = await referralService.getUserReferralCode(userId);

      // If no referral code exists, create one
      if (!referralCode) {
        request.log.info({ userId }, 'No referral code found, creating one');
        referralCode = await referralService.generateReferralCode(userId);
      }

      // Generate referral link
      const baseUrl = process.env.APP_URL || 'https://solpay.app';
      const referralLink = referralService.getReferralLink(referralCode.code, baseUrl);

      return {
        code: referralCode.code,
        link: referralLink,
        created_at: referralCode.created_at,
      };
    } catch (error: any) {
      request.log.error({ error }, 'Failed to get referral code');
      return reply.status(500).send({ error: error.message || 'Failed to get referral code' });
    }
  });

  /**
   * Get referral statistics
   * GET /api/referrals/stats
   */
  fastify.get('/stats', async (request, reply) => {
    const userId = request.userId!;

    try {
      const stats = await referralService.getReferralStats(userId);

      return {
        total_referrals: stats.total_referrals,
        pending_referrals: stats.pending_referrals,
        completed_referrals: stats.completed_referrals,
        total_earnings: {
          usd: stats.total_earnings_usd,
          ngn: stats.total_earnings_ngn,
        },
      };
    } catch (error: any) {
      request.log.error({ error }, 'Failed to get referral stats');
      return reply.status(500).send({ error: error.message || 'Failed to get referral stats' });
    }
  });

  /**
   * Get referral history
   * GET /api/referrals/history
   */
  fastify.get('/history', async (request, reply) => {
    const userId = request.userId!;

    try {
      const history = await referralService.getReferralHistory(userId);

      return {
        referrals: history.map(r => ({
          id: r.id,
          referred_user_id: r.referred_user_id,
          status: r.status,
          reward_amount_usd: r.reward_amount_usd,
          reward_credited: r.reward_credited,
          reward_credited_at: r.reward_credited_at,
          created_at: r.created_at,
          completed_at: r.completed_at,
        })),
      };
    } catch (error: any) {
      request.log.error({ error }, 'Failed to get referral history');
      return reply.status(500).send({ error: error.message || 'Failed to get referral history' });
    }
  });

  /**
   * Apply a referral code (called during signup)
   * POST /api/referrals/apply
   * Body: { referralCode: string, deviceFingerprint?: string }
   * 
   * Note: This endpoint is called AFTER user account is created
   */
  fastify.post('/apply', async (request, reply) => {
    const userId = request.userId!;
    const body = applyReferralSchema.parse(request.body);

    try {
      // Get IP address from request
      const ipAddress = request.ip;
      const userAgent = request.headers['user-agent'];

      const referral = await referralService.applyReferralCode({
        referralCode: body.referralCode,
        newUserId: userId,
        ipAddress,
        userAgent,
        deviceFingerprint: body.deviceFingerprint,
      });

      return {
        success: true,
        message: 'Referral code applied successfully',
        referral: {
          id: referral.id,
          referrer_id: referral.referrer_id,
          status: referral.status,
        },
      };
    } catch (error: any) {
      request.log.error({ error, referralCode: body.referralCode }, 'Failed to apply referral code');
      
      // Return specific error messages
      if (error.message === 'Invalid referral code') {
        return reply.status(400).send({ error: 'Invalid referral code' });
      }
      if (error.message === 'Cannot refer yourself') {
        return reply.status(400).send({ error: 'You cannot use your own referral code' });
      }
      if (error.message === 'User already referred by someone else') {
        return reply.status(400).send({ error: 'You have already been referred by someone else' });
      }

      return reply.status(500).send({ error: 'Failed to apply referral code' });
    }
  });

  /**
   * Validate a referral code (check if it exists)
   * GET /api/referrals/validate/:code
   */
  fastify.get('/validate/:code', async (request, reply) => {
    const params = request.params as { code: string };
    const code = params.code.toUpperCase();

    try {
      const { data, error } = await supabaseAdmin
        .from('referral_codes')
        .select('code, user_id')
        .eq('code', code)
        .single();

      if (error || !data) {
        return {
          valid: false,
          message: 'Invalid referral code',
        };
      }

      // Check if user is trying to use their own code
      const userId = request.userId;
      if (userId && data.user_id === userId) {
        return {
          valid: false,
          message: 'You cannot use your own referral code',
        };
      }

      return {
        valid: true,
        message: 'Valid referral code',
      };
    } catch (error: any) {
      request.log.error({ error, code }, 'Failed to validate referral code');
      return reply.status(500).send({ error: 'Failed to validate referral code' });
    }
  });

  /**
   * Admin: Manually credit a referral reward
   * POST /api/referrals/admin/credit/:referralId
   * (Requires admin authentication - to be implemented)
   */
  fastify.post('/admin/credit/:referralId', async (request, reply) => {
    const params = request.params as { referralId: string };

    try {
      // TODO: Add admin authentication check
      const transactionId = await referralService.creditReferralReward(params.referralId);

      return {
        success: true,
        message: 'Referral reward credited successfully',
        transaction_id: transactionId,
      };
    } catch (error: any) {
      request.log.error({ error, referralId: params.referralId }, 'Failed to credit referral reward');
      return reply.status(500).send({ error: error.message || 'Failed to credit referral reward' });
    }
  });

  /**
   * Admin: Cancel a referral
   * POST /api/referrals/admin/cancel/:referralId
   * (Requires admin authentication - to be implemented)
   */
  fastify.post('/admin/cancel/:referralId', async (request, reply) => {
    const params = request.params as { referralId: string };
    const body = z.object({ reason: z.string() }).parse(request.body);

    try {
      // TODO: Add admin authentication check
      await referralService.cancelReferral(params.referralId, body.reason);

      return {
        success: true,
        message: 'Referral cancelled successfully',
      };
    } catch (error: any) {
      request.log.error({ error, referralId: params.referralId }, 'Failed to cancel referral');
      return reply.status(500).send({ error: error.message || 'Failed to cancel referral' });
    }
  });
};

