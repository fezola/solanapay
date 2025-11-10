import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { supabase, supabaseAdmin } from '../utils/supabase.js';
import { referralService } from '../services/referral/index.js';

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().optional(),
  offrampMode: z.enum(['automatic', 'basic']).optional().default('basic'),
  referralCode: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

const otpRequestSchema = z.object({
  email: z.string().email().optional(),
  phone: z.string().optional(),
});

const otpVerifySchema = z.object({
  email: z.string().email().optional(),
  phone: z.string().optional(),
  token: z.string(),
});

const updateOfframpModeSchema = z.object({
  offrampMode: z.enum(['automatic', 'basic']),
});

export const authRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * Sign up with email/password
   */
  fastify.post('/signup', async (request, reply) => {
    const body = signupSchema.parse(request.body);

    const { data, error } = await supabase.auth.signUp({
      email: body.email,
      password: body.password,
      options: {
        data: {
          name: body.name || body.email.split('@')[0],
        },
      },
    });

    if (error) {
      return reply.status(400).send({ error: error.message });
    }

    // Create user record in database
    if (data.user) {
      await supabaseAdmin.from('users').insert({
        id: data.user.id,
        email: body.email,
        kyc_tier: 0,
        kyc_status: 'not_started',
        offramp_mode: body.offrampMode || 'basic',
      });

      // Apply referral code if provided
      if (body.referralCode) {
        try {
          await referralService.applyReferralCode({
            referralCode: body.referralCode,
            newUserId: data.user.id,
            ipAddress: request.ip,
            userAgent: request.headers['user-agent'],
          });
          request.log.info({ userId: data.user.id, referralCode: body.referralCode }, 'Referral code applied during signup');
        } catch (referralError: any) {
          // Log error but don't fail signup
          request.log.warn({ error: referralError, referralCode: body.referralCode }, 'Failed to apply referral code');
        }
      }
    }

    return {
      user: data.user,
      session: data.session,
      offrampMode: body.offrampMode || 'basic',
    };
  });

  /**
   * Login with email/password
   */
  fastify.post('/login', async (request, reply) => {
    const body = loginSchema.parse(request.body);

    const { data, error } = await supabase.auth.signInWithPassword({
      email: body.email,
      password: body.password,
    });

    if (error) {
      return reply.status(401).send({ error: error.message });
    }

    return {
      user: data.user,
      session: data.session,
    };
  });

  /**
   * Request OTP (passwordless)
   */
  fastify.post('/otp/request', async (request, reply) => {
    const body = otpRequestSchema.parse(request.body);

    if (body.email) {
      const { error } = await supabase.auth.signInWithOtp({
        email: body.email,
      });

      if (error) {
        return reply.status(400).send({ error: error.message });
      }

      return { message: 'OTP sent to email' };
    } else if (body.phone) {
      const { error } = await supabase.auth.signInWithOtp({
        phone: body.phone,
      });

      if (error) {
        return reply.status(400).send({ error: error.message });
      }

      return { message: 'OTP sent to phone' };
    }

    return reply.status(400).send({ error: 'Email or phone required' });
  });

  /**
   * Verify OTP
   */
  fastify.post('/otp/verify', async (request, reply) => {
    const body = otpVerifySchema.parse(request.body);

    const { data, error } = await supabase.auth.verifyOtp(
      body.email
        ? {
            email: body.email,
            token: body.token,
            type: 'email',
          }
        : {
            phone: body.phone!,
            token: body.token,
            type: 'sms',
          }
    );

    if (error) {
      return reply.status(401).send({ error: error.message });
    }

    // Create user if doesn't exist
    if (data.user) {
      const { data: existingUser } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('id', data.user.id)
        .single();

      if (!existingUser) {
        await supabaseAdmin.from('users').insert({
          id: data.user.id,
          email: data.user.email,
          phone: data.user.phone,
          kyc_tier: 0,
          kyc_status: 'not_started',
        });
      }
    }

    return {
      user: data.user,
      session: data.session,
    };
  });

  /**
   * Logout
   */
  fastify.post('/logout', async (request, reply) => {
    const authHeader = request.headers.authorization;
    
    if (!authHeader) {
      return reply.status(401).send({ error: 'No authorization header' });
    }

    const token = authHeader.substring(7);

    const { error } = await supabase.auth.admin.signOut(token);

    if (error) {
      return reply.status(400).send({ error: error.message });
    }

    return { message: 'Logged out successfully' };
  });

  /**
   * Refresh token
   */
  fastify.post('/refresh', async (request, reply) => {
    const { refresh_token } = request.body as { refresh_token: string };

    if (!refresh_token) {
      return reply.status(400).send({ error: 'Refresh token required' });
    }

    const { data, error } = await supabase.auth.refreshSession({
      refresh_token,
    });

    if (error) {
      return reply.status(401).send({ error: error.message });
    }

    return {
      session: data.session,
    };
  });

  /**
   * Update offramp mode preference
   */
  fastify.patch('/offramp-mode', async (request, reply) => {
    const userId = request.userId;
    if (!userId) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    const body = updateOfframpModeSchema.parse(request.body);

    const { error } = await supabaseAdmin
      .from('users')
      .update({ offramp_mode: body.offrampMode })
      .eq('id', userId);

    if (error) {
      return reply.status(500).send({ error: 'Failed to update offramp mode' });
    }

    return {
      message: 'Offramp mode updated successfully',
      offrampMode: body.offrampMode,
    };
  });

  /**
   * Get user preferences
   */
  fastify.get('/preferences', async (request, reply) => {
    const userId = request.userId;
    if (!userId) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    const { data: user } = await supabaseAdmin
      .from('users')
      .select('offramp_mode')
      .eq('id', userId)
      .single();

    return {
      offrampMode: user?.offramp_mode || 'basic',
    };
  });
};

