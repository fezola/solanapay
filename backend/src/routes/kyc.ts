import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth.js';
import { supabaseAdmin } from '../utils/supabase.js';
import { SumsubService } from '../services/kyc/index.js';
import { env } from '../config/env.js';

const startKYCSchema = z.object({
  level: z.number().int().min(1).max(2),
});

const submitBVNSchema = z.object({
  bvn: z.string().length(11),
  date_of_birth: z.string(),
});

const uploadDocumentSchema = z.object({
  document_type: z.enum(['nin', 'passport', 'drivers_license']),
  document_number: z.string(),
  document_url: z.string().url(),
  selfie_url: z.string().url().optional(),
});

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

export const kycRoutes: FastifyPluginAsync = async (fastify) => {
  // Apply auth middleware to all routes
  fastify.addHook('onRequest', authMiddleware);

  /**
   * Get KYC status
   */
  fastify.get('/status', async (request, reply) => {
    const userId = request.userId!;

    if (sumsubService) {
      // Use Sumsub for KYC status
      const status = await sumsubService.getKYCStatus(userId);
      return status;
    }

    // Fallback to legacy KYC
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('kyc_tier, kyc_status')
      .eq('id', userId)
      .single();

    const { data: verifications } = await supabaseAdmin
      .from('kyc_verifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    return {
      kyc_tier: user?.kyc_tier || 0,
      kyc_status: user?.kyc_status || 'not_started',
      verifications: verifications || [],
    };
  });

  /**
   * Start KYC verification (Initialize Sumsub)
   */
  fastify.post('/start', async (request, reply) => {
    const userId = request.userId!;

    if (sumsubService) {
      // Get user email and phone for Sumsub
      const { data: user } = await supabaseAdmin
        .from('users')
        .select('email, phone, kyc_tier, kyc_status')
        .eq('id', userId)
        .single();

      if (!user) {
        return reply.status(404).send({ error: 'User not found' });
      }

      // Initialize KYC with Sumsub
      const result = await sumsubService.initializeKYC(
        userId,
        user.email,
        user.phone
      );

      return {
        provider: 'sumsub',
        applicantId: result.applicantId,
        accessToken: result.accessToken,
        message: 'KYC initialized. Use the access token with Sumsub Web SDK.',
      };
    }

    // Fallback to legacy KYC
    const body = startKYCSchema.parse(request.body);

    const { data: user } = await supabaseAdmin
      .from('users')
      .select('kyc_tier, kyc_status')
      .eq('id', userId)
      .single();

    if (!user) {
      return reply.status(404).send({ error: 'User not found' });
    }

    // Check if already at this level or higher
    if (user.kyc_tier >= body.level) {
      return reply.status(400).send({
        error: 'Already verified at this level or higher',
      });
    }

    // Create verification record
    const { data: verification, error } = await supabaseAdmin
      .from('kyc_verifications')
      .insert({
        user_id: userId,
        provider: 'legacy',
        tier: body.level,
        status: 'pending',
        applicant_id: `legacy_${userId}`,
      })
      .select()
      .single();

    if (error) {
      return reply.status(500).send({ error: 'Failed to start KYC' });
    }

    return { verification };
  });

  /**
   * Submit BVN for verification (Tier 1)
   */
  fastify.post('/bvn', async (request, reply) => {
    const userId = request.userId!;
    const body = submitBVNSchema.parse(request.body);

    // Get pending verification
    const { data: verification } = await supabaseAdmin
      .from('kyc_verifications')
      .select('*')
      .eq('user_id', userId)
      .eq('level', 1)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (!verification) {
      return reply.status(404).send({
        error: 'No pending KYC verification found',
      });
    }

    // In production, verify BVN with YouVerify or similar service
    // For now, we'll simulate verification
    const isValid = body.bvn.length === 11;

    if (!isValid) {
      await supabaseAdmin
        .from('kyc_verifications')
        .update({
          status: 'rejected',
          rejection_reason: 'Invalid BVN',
        })
        .eq('id', verification.id);

      return reply.status(400).send({ error: 'BVN verification failed' });
    }

    // Update verification
    await supabaseAdmin
      .from('kyc_verifications')
      .update({
        bvn: body.bvn,
        result_json: { bvn_verified: true },
      })
      .eq('id', verification.id);

    return {
      message: 'BVN submitted successfully',
      verification_id: verification.id,
    };
  });

  /**
   * Upload KYC documents
   */
  fastify.post('/documents', async (request, reply) => {
    const userId = request.userId!;
    const body = uploadDocumentSchema.parse(request.body);

    // Get pending verification
    const { data: verification } = await supabaseAdmin
      .from('kyc_verifications')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (!verification) {
      return reply.status(404).send({
        error: 'No pending KYC verification found',
      });
    }

    // Update verification with documents
    await supabaseAdmin
      .from('kyc_verifications')
      .update({
        document_type: body.document_type,
        document_number: body.document_number,
        document_url: body.document_url,
        selfie_url: body.selfie_url,
      })
      .eq('id', verification.id);

    return {
      message: 'Documents uploaded successfully',
      verification_id: verification.id,
    };
  });

  /**
   * Complete KYC verification (auto-approve for demo)
   */
  fastify.post('/complete', async (request, reply) => {
    const userId = request.userId!;

    // Get pending verification
    const { data: verification } = await supabaseAdmin
      .from('kyc_verifications')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (!verification) {
      return reply.status(404).send({
        error: 'No pending KYC verification found',
      });
    }

    // Check if all required fields are present
    const hasRequiredFields = verification.bvn && verification.document_url;

    if (!hasRequiredFields) {
      return reply.status(400).send({
        error: 'Missing required KYC information',
      });
    }

    // Auto-approve for demo (in production, this would be manual review or API call)
    await supabaseAdmin
      .from('kyc_verifications')
      .update({
        status: 'approved',
        verified_at: new Date().toISOString(),
      })
      .eq('id', verification.id);

    // Update user KYC tier
    await supabaseAdmin
      .from('users')
      .update({
        kyc_tier: verification.level,
        kyc_status: 'approved',
      })
      .eq('id', userId);

    // Create limits for the user
    await createUserLimits(userId, verification.level);

    return {
      message: 'KYC verification approved',
      kyc_tier: verification.level,
    };
  });

  /**
   * Retry KYC verification (Sumsub)
   */
  fastify.post('/retry', async (request, reply) => {
    const userId = request.userId!;

    if (!sumsubService) {
      return reply.status(400).send({
        error: 'Sumsub not configured',
      });
    }

    try {
      const result = await sumsubService.retryKYC(userId);

      return {
        provider: 'sumsub',
        applicantId: result.applicantId,
        accessToken: result.accessToken,
        message: 'KYC retry initialized. Use the access token with Sumsub Web SDK.',
      };
    } catch (error: any) {
      return reply.status(400).send({
        error: error.message || 'Failed to retry KYC',
      });
    }
  });

  /**
   * Get KYC limits
   */
  fastify.get('/limits', async (request, reply) => {
    const userId = request.userId!;

    const { data: limits } = await supabaseAdmin
      .from('limits')
      .select('*')
      .eq('user_id', userId);

    return { limits: limits || [] };
  });
};

/**
 * Create limits for user based on KYC tier
 */
async function createUserLimits(userId: string, tier: number) {
  const limitsByTier: Record<number, { daily: number; weekly: number; monthly: number }> = {
    1: {
      daily: 5000000, // 5M NGN
      weekly: 25000000, // 25M NGN
      monthly: 50000000, // 50M NGN
    },
    2: {
      daily: 10000000, // 10M NGN
      weekly: 50000000, // 50M NGN
      monthly: 100000000, // 100M NGN
    },
  };

  const limits = limitsByTier[tier];
  if (!limits) return;

  const now = new Date();
  const periods = [
    {
      period: 'daily',
      resets_at: new Date(now.getTime() + 24 * 60 * 60 * 1000),
      max_amount: limits.daily,
    },
    {
      period: 'weekly',
      resets_at: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
      max_amount: limits.weekly,
    },
    {
      period: 'monthly',
      resets_at: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
      max_amount: limits.monthly,
    },
  ];

  for (const limit of periods) {
    await supabaseAdmin.from('limits').upsert({
      user_id: userId,
      period: limit.period,
      asset: 'ALL',
      max_amount: limit.max_amount.toString(),
      used_amount: '0',
      resets_at: limit.resets_at.toISOString(),
    });
  }
}

