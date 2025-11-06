import { FastifyPluginAsync } from 'fastify';
import { adminMiddleware } from '../middleware/auth.js';
import { supabaseAdmin } from '../utils/supabase.js';
import { rateEngine } from '../services/pricing/rate-engine.js';

export const adminRoutes: FastifyPluginAsync = async (fastify) => {
  // Apply admin middleware to all routes
  fastify.addHook('onRequest', adminMiddleware);

  /**
   * Get dashboard stats
   */
  fastify.get('/stats', async (request, reply) => {
    const { data: users } = await supabaseAdmin
      .from('users')
      .select('id, kyc_tier, kyc_status, created_at');

    const { data: deposits } = await supabaseAdmin
      .from('onchain_deposits')
      .select('amount, asset, status');

    const { data: payouts } = await supabaseAdmin
      .from('payouts')
      .select('fiat_amount, status');

    const totalUsers = users?.length || 0;
    const kycApproved = users?.filter((u) => u.kyc_status === 'approved').length || 0;
    const kycPending = users?.filter((u) => u.kyc_status === 'pending').length || 0;

    const totalDeposits = deposits?.reduce((sum, d) => sum + parseFloat(d.amount), 0) || 0;
    const totalPayouts = payouts?.reduce((sum, p) => sum + parseFloat(p.fiat_amount), 0) || 0;
    const successfulPayouts = payouts?.filter((p) => p.status === 'success').length || 0;

    return {
      users: {
        total: totalUsers,
        kyc_approved: kycApproved,
        kyc_pending: kycPending,
      },
      deposits: {
        total_count: deposits?.length || 0,
        total_value: totalDeposits,
      },
      payouts: {
        total_count: payouts?.length || 0,
        successful_count: successfulPayouts,
        total_value: totalPayouts,
      },
    };
  });

  /**
   * Get all users
   */
  fastify.get('/users', async (request, reply) => {
    const { limit = 50, offset = 0 } = request.query as { limit?: number; offset?: number };

    const { data: users, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      return reply.status(500).send({ error: 'Failed to fetch users' });
    }

    return { users };
  });

  /**
   * Get user details
   */
  fastify.get('/users/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    const { data: user } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', id)
      .single();

    if (!user) {
      return reply.status(404).send({ error: 'User not found' });
    }

    const { data: deposits } = await supabaseAdmin
      .from('onchain_deposits')
      .select('*')
      .eq('user_id', id);

    const { data: payouts } = await supabaseAdmin
      .from('payouts')
      .select('*')
      .eq('user_id', id);

    const { data: kyc } = await supabaseAdmin
      .from('kyc_verifications')
      .select('*')
      .eq('user_id', id);

    return {
      user,
      deposits,
      payouts,
      kyc_verifications: kyc,
    };
  });

  /**
   * Update user status
   */
  fastify.patch('/users/:id/status', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { status } = request.body as { status: 'active' | 'suspended' | 'banned' };

    const { error } = await supabaseAdmin
      .from('users')
      .update({ status })
      .eq('id', id);

    if (error) {
      return reply.status(500).send({ error: 'Failed to update user status' });
    }

    return { message: 'User status updated' };
  });

  /**
   * Get pending KYC verifications
   */
  fastify.get('/kyc/pending', async (request, reply) => {
    const { data: verifications } = await supabaseAdmin
      .from('kyc_verifications')
      .select(`
        *,
        user:users(*)
      `)
      .eq('status', 'pending')
      .order('created_at', { ascending: true });

    return { verifications };
  });

  /**
   * Approve/Reject KYC
   */
  fastify.post('/kyc/:id/review', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { action, reason } = request.body as { action: 'approve' | 'reject'; reason?: string };

    const { data: verification } = await supabaseAdmin
      .from('kyc_verifications')
      .select('*')
      .eq('id', id)
      .single();

    if (!verification) {
      return reply.status(404).send({ error: 'Verification not found' });
    }

    if (action === 'approve') {
      await supabaseAdmin
        .from('kyc_verifications')
        .update({
          status: 'approved',
          verified_at: new Date().toISOString(),
        })
        .eq('id', id);

      await supabaseAdmin
        .from('users')
        .update({
          kyc_tier: verification.level,
          kyc_status: 'approved',
        })
        .eq('id', verification.user_id);
    } else {
      await supabaseAdmin
        .from('kyc_verifications')
        .update({
          status: 'rejected',
          rejection_reason: reason,
        })
        .eq('id', id);

      await supabaseAdmin
        .from('users')
        .update({ kyc_status: 'rejected' })
        .eq('id', verification.user_id);
    }

    return { message: `KYC ${action}d successfully` };
  });

  /**
   * Get current prices
   */
  fastify.get('/prices', async (request, reply) => {
    const prices = await rateEngine.getAllPrices();
    const fxRate = await rateEngine.getFXRate('USD', 'NGN');

    return {
      prices,
      fx_rate: fxRate,
      timestamp: new Date().toISOString(),
    };
  });

  /**
   * Get balance (Bread Africa)
   */
  fastify.get('/balance', async (request, reply) => {
    // TODO: Implement Bread Africa balance check
    return { balance: 0, currency: 'NGN', provider: 'bread' };
  });

  /**
   * Get all payouts
   */
  fastify.get('/payouts', async (request, reply) => {
    const { status, limit = 50 } = request.query as { status?: string; limit?: number };

    let query = supabaseAdmin
      .from('payouts')
      .select(`
        *,
        user:users(email),
        quote:quotes(*),
        beneficiary:payout_beneficiaries(*)
      `)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (status) {
      query = query.eq('status', status);
    }

    const { data: payouts } = await query;

    return { payouts };
  });
};

