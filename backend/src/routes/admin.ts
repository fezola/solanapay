import { FastifyPluginAsync } from 'fastify';
import { adminMiddleware } from '../middleware/auth.js';
import { supabaseAdmin } from '../utils/supabase.js';
import { rateEngine } from '../services/pricing/rate-engine.js';
import axios from 'axios';
import { Connection, Keypair, PublicKey, Transaction, SystemProgram, sendAndConfirmTransaction } from '@solana/web3.js';
import { getAssociatedTokenAddress, createTransferInstruction } from '@solana/spl-token';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

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

  /**
   * Get comprehensive transaction analytics
   */
  fastify.get('/analytics/transactions', async (request, reply) => {
    const {
      start_date,
      end_date,
      group_by = 'day'
    } = request.query as {
      start_date?: string;
      end_date?: string;
      group_by?: 'day' | 'week' | 'month'
    };

    try {
      // Get all deposits with asset breakdown
      let depositsQuery = supabaseAdmin
        .from('onchain_deposits')
        .select('*');

      if (start_date) {
        depositsQuery = depositsQuery.gte('detected_at', start_date);
      }
      if (end_date) {
        depositsQuery = depositsQuery.lte('detected_at', end_date);
      }

      const { data: deposits } = await depositsQuery;

      // Get all payouts with quotes
      let payoutsQuery = supabaseAdmin
        .from('payouts')
        .select(`
          *,
          quote:quotes(*)
        `);

      if (start_date) {
        payoutsQuery = payoutsQuery.gte('created_at', start_date);
      }
      if (end_date) {
        payoutsQuery = payoutsQuery.lte('created_at', end_date);
      }

      const { data: payouts } = await payoutsQuery;

      // Calculate deposit statistics by asset
      const depositStats = deposits?.reduce((acc: any, deposit: any) => {
        const asset = deposit.asset;
        if (!acc[asset]) {
          acc[asset] = {
            total_amount: 0,
            total_count: 0,
            confirmed_amount: 0,
            confirmed_count: 0,
            pending_amount: 0,
            pending_count: 0,
          };
        }

        const amount = parseFloat(deposit.amount);
        acc[asset].total_amount += amount;
        acc[asset].total_count += 1;

        if (deposit.status === 'confirmed' || deposit.status === 'swept') {
          acc[asset].confirmed_amount += amount;
          acc[asset].confirmed_count += 1;
        } else {
          acc[asset].pending_amount += amount;
          acc[asset].pending_count += 1;
        }

        return acc;
      }, {}) || {};

      // Calculate offramp statistics
      const offrampStats = payouts?.reduce((acc: any, payout: any) => {
        const status = payout.status;
        if (!acc[status]) {
          acc[status] = {
            count: 0,
            total_fiat: 0,
            total_crypto: 0,
          };
        }

        acc[status].count += 1;
        acc[status].total_fiat += parseFloat(payout.fiat_amount || 0);

        if (payout.quote) {
          acc[status].total_crypto += parseFloat(payout.quote.crypto_amount || 0);
        }

        return acc;
      }, {}) || {};

      // Calculate total USDC volume (deposits + offramps)
      const totalUSDCDeposits = depositStats['USDC']?.total_amount || 0;
      const totalUSDTDeposits = depositStats['USDT']?.total_amount || 0;
      const totalSOLDeposits = depositStats['SOL']?.total_amount || 0;

      // Calculate offramped amounts by asset
      const totalUSDCOfframped = payouts
        ?.filter((p: any) => {
          const asset = p.quote?.crypto_asset || p.quote?.asset;
          return asset === 'USDC' && p.status === 'success';
        })
        .reduce((sum: number, p: any) => {
          const amount = parseFloat(p.quote?.crypto_amount || 0);
          return sum + amount;
        }, 0) || 0;

      const totalUSDTOfframped = payouts
        ?.filter((p: any) => {
          const asset = p.quote?.crypto_asset || p.quote?.asset;
          return asset === 'USDT' && p.status === 'success';
        })
        .reduce((sum: number, p: any) => {
          const amount = parseFloat(p.quote?.crypto_amount || 0);
          return sum + amount;
        }, 0) || 0;

      // Calculate total NGN paid out
      const totalNGNPaidOut = payouts
        ?.filter((p: any) => p.status === 'success')
        .reduce((sum: number, p: any) => sum + parseFloat(p.fiat_amount || 0), 0) || 0;

      // Get user count
      const { count: totalUsers } = await supabaseAdmin
        .from('users')
        .select('*', { count: 'exact', head: true });

      // Get active users (users with at least one transaction)
      const activeUserIds = new Set([
        ...(deposits?.map((d: any) => d.user_id).filter(Boolean) || []),
        ...(payouts?.map((p: any) => p.user_id).filter(Boolean) || []),
      ]);

      return {
        summary: {
          total_users: totalUsers || 0,
          active_users: activeUserIds.size,
          total_deposits: deposits?.length || 0,
          total_offramps: payouts?.length || 0,
          total_usdc_deposited: totalUSDCDeposits,
          total_usdt_deposited: totalUSDTDeposits,
          total_sol_deposited: totalSOLDeposits,
          total_usdc_offramped: totalUSDCOfframped,
          total_usdt_offramped: totalUSDTOfframped,
          total_ngn_paid_out: totalNGNPaidOut,
          usdc_balance: totalUSDCDeposits - totalUSDCOfframped,
          usdt_balance: totalUSDTDeposits - totalUSDTOfframped,
        },
        deposits_by_asset: depositStats,
        offramps_by_status: offrampStats,
        date_range: {
          start: start_date || 'all time',
          end: end_date || 'now',
        },
      };
    } catch (error) {
      request.log.error({ error }, 'Failed to fetch transaction analytics');
      return reply.status(500).send({ error: 'Failed to fetch analytics' });
    }
  });

  /**
   * Get all transactions (deposits + offramps) with full details
   */
  fastify.get('/analytics/all-transactions', async (request, reply) => {
    const {
      limit = 100,
      offset = 0,
      type,
      status,
      user_id,
    } = request.query as {
      limit?: number;
      offset?: number;
      type?: 'deposit' | 'offramp';
      status?: string;
      user_id?: string;
    };

    try {
      const transactions = [];

      // Get deposits if requested
      if (!type || type === 'deposit') {
        let depositsQuery = supabaseAdmin
          .from('onchain_deposits')
          .select(`
            *,
            user:users(id, email, full_name)
          `)
          .order('detected_at', { ascending: false });

        if (status) {
          depositsQuery = depositsQuery.eq('status', status);
        }
        if (user_id) {
          depositsQuery = depositsQuery.eq('user_id', user_id);
        }

        const { data: deposits, error: depositsError } = await depositsQuery;

        if (depositsError) {
          request.log.error({ error: depositsError }, 'Failed to fetch deposits with relations');
        }

        if (deposits) {
          // If user relations didn't work, fetch users separately
          const depositsWithMissingUser = deposits.filter((d: any) => !d.user && d.user_id);

          if (depositsWithMissingUser.length > 0) {
            request.log.warn({
              count: depositsWithMissingUser.length
            }, 'Some deposits missing user relation, fetching manually');

            const userIds = [...new Set(depositsWithMissingUser.map((d: any) => d.user_id))];
            const { data: users } = await supabaseAdmin
              .from('users')
              .select('id, email, full_name')
              .in('id', userIds);

            if (users) {
              const usersMap = Object.fromEntries(users.map(u => [u.id, u]));
              for (const deposit of deposits as any[]) {
                if (!deposit.user && deposit.user_id && usersMap[deposit.user_id]) {
                  deposit.user = usersMap[deposit.user_id];
                }
              }
            }
          }

          transactions.push(
            ...deposits.map((d: any) => ({
              id: d.id,
              type: 'deposit',
              user_id: d.user_id,
              user_email: d.user?.email || null,
              user_name: d.user?.full_name || null,
              deposit_address: d.address,
              asset: d.asset,
              chain: d.chain,
              amount: parseFloat(d.amount),
              status: d.status,
              tx_hash: d.tx_hash,
              confirmations: d.confirmations,
              required_confirmations: d.required_confirmations,
              from_address: d.from_address,
              to_address: d.address,
              created_at: d.detected_at,
              confirmed_at: d.confirmed_at,
              swept_at: d.swept_at,
            }))
          );
        }
      }

      // Get offramps if requested
      if (!type || type === 'offramp') {
        let payoutsQuery = supabaseAdmin
          .from('payouts')
          .select(`
            *,
            user:users(id, email, full_name),
            quote:quotes(*),
            beneficiary:bank_accounts(*)
          `)
          .order('created_at', { ascending: false });

        if (status) {
          payoutsQuery = payoutsQuery.eq('status', status);
        }
        if (user_id) {
          payoutsQuery = payoutsQuery.eq('user_id', user_id);
        }

        const { data: payouts, error: payoutsError } = await payoutsQuery;

        if (payoutsError) {
          request.log.error({ error: payoutsError }, 'Failed to fetch payouts with relations');
        }

        if (payouts) {
          // If relations didn't work, fetch users and quotes separately
          const payoutsWithMissingData = payouts.filter((p: any) => !p.user || !p.quote);

          if (payoutsWithMissingData.length > 0) {
            request.log.warn({
              count: payoutsWithMissingData.length,
              sampleIds: payoutsWithMissingData.slice(0, 3).map((p: any) => p.id)
            }, 'Some payouts missing user/quote relations, fetching manually');

            // Get all unique user_ids and quote_ids that need to be fetched
            const userIds = [...new Set(payouts.filter((p: any) => !p.user && p.user_id).map((p: any) => p.user_id))];
            const quoteIds = [...new Set(payouts.filter((p: any) => !p.quote && p.quote_id).map((p: any) => p.quote_id))];

            // Fetch missing users
            let usersMap: Record<string, any> = {};
            if (userIds.length > 0) {
              const { data: users } = await supabaseAdmin
                .from('users')
                .select('id, email, full_name')
                .in('id', userIds);
              if (users) {
                usersMap = Object.fromEntries(users.map(u => [u.id, u]));
              }
            }

            // Fetch missing quotes
            let quotesMap: Record<string, any> = {};
            if (quoteIds.length > 0) {
              const { data: quotes } = await supabaseAdmin
                .from('quotes')
                .select('*')
                .in('id', quoteIds);
              if (quotes) {
                quotesMap = Object.fromEntries(quotes.map(q => [q.id, q]));
              }
            }

            // Merge the data
            for (const payout of payouts as any[]) {
              if (!payout.user && payout.user_id && usersMap[payout.user_id]) {
                payout.user = usersMap[payout.user_id];
              }
              if (!payout.quote && payout.quote_id && quotesMap[payout.quote_id]) {
                payout.quote = quotesMap[payout.quote_id];
              }
            }
          }

          transactions.push(
            ...payouts.map((p: any) => ({
              id: p.id,
              type: 'offramp',
              user_id: p.user_id,
              user_email: p.user?.email || null,
              user_name: p.user?.full_name || null,
              asset: p.quote?.crypto_asset || null,
              chain: p.quote?.crypto_network || null,
              crypto_amount: p.quote ? parseFloat(p.quote.crypto_amount) : 0,
              fiat_amount: parseFloat(p.fiat_amount),
              currency: p.currency,
              status: p.status,
              bank_name: p.beneficiary?.bank_name,
              account_number: p.beneficiary?.account_number,
              account_name: p.beneficiary?.account_name,
              provider: p.provider,
              provider_reference: p.provider_reference,
              error_message: p.error_message,
              created_at: p.created_at,
              completed_at: p.completed_at,
            }))
          );
        }
      }

      // Sort by date
      transactions.sort((a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      // Apply pagination
      const paginatedTransactions = transactions.slice(offset, offset + limit);

      return {
        transactions: paginatedTransactions,
        total: transactions.length,
        limit,
        offset,
      };
    } catch (error) {
      request.log.error({ error }, 'Failed to fetch all transactions');
      return reply.status(500).send({ error: 'Failed to fetch transactions' });
    }
  });

  /**
   * Get platform revenue and fees
   */
  fastify.get('/analytics/revenue', async (request, reply) => {
    const { start_date, end_date } = request.query as {
      start_date?: string;
      end_date?: string;
    };

    try {
      // Get all successful payouts with quotes
      let payoutsQuery = supabaseAdmin
        .from('payouts')
        .select(`
          *,
          quote:quotes(*)
        `)
        .eq('status', 'success');

      if (start_date) {
        payoutsQuery = payoutsQuery.gte('created_at', start_date);
      }
      if (end_date) {
        payoutsQuery = payoutsQuery.lte('created_at', end_date);
      }

      const { data: payouts } = await payoutsQuery;

      // Calculate total fees collected
      const totalFees = payouts?.reduce((sum: number, p: any) => {
        if (p.quote?.total_fee) {
          return sum + parseFloat(p.quote.total_fee);
        }
        return sum;
      }, 0) || 0;

      // Calculate total volume
      const totalVolume = payouts?.reduce((sum: number, p: any) => {
        return sum + parseFloat(p.fiat_amount || 0);
      }, 0) || 0;

      // Calculate average fee percentage
      const avgFeePercentage = totalVolume > 0 ? (totalFees / totalVolume) * 100 : 0;

      return {
        total_fees_ngn: totalFees,
        total_volume_ngn: totalVolume,
        average_fee_percentage: avgFeePercentage,
        transaction_count: payouts?.length || 0,
        date_range: {
          start: start_date || 'all time',
          end: end_date || 'now',
        },
      };
    } catch (error) {
      request.log.error({ error }, 'Failed to fetch revenue analytics');
      return reply.status(500).send({ error: 'Failed to fetch revenue' });
    }
  });

  /**
   * MIGRATION: Recreate Bread wallets for Base chain
   * GET /admin/migrate-base-wallets?dry_run=true&secret=xxx (default - safe preview)
   * GET /admin/migrate-base-wallets?dry_run=false&secret=xxx (apply changes)
   *
   * Note: This endpoint bypasses admin middleware for migration purposes
   * Requires ENCRYPTION_KEY as secret parameter for security
   */
  fastify.get('/migrate-base-wallets', {
    onRequest: async (request, reply) => {
      // Skip admin middleware, use secret key instead
      const { secret } = request.query as { secret?: string };
      const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;

      if (!secret || secret !== ENCRYPTION_KEY) {
        return reply.status(401).send({
          error: 'Unauthorized',
          message: 'Invalid or missing secret parameter'
        });
      }
    }
  }, async (request, reply) => {
    const { dry_run = 'true' } = request.query as { dry_run?: string };
    const isDryRun = dry_run === 'true';

    const BREAD_API_KEY = process.env.BREAD_API_KEY!;
    const BREAD_API_URL = 'https://processor-prod.up.railway.app';

    fastify.log.info({ msg: 'Starting Base wallet migration', isDryRun });

    // Helper: Create a new Bread wallet
    async function createBreadWallet(userId: string, chain: string = 'base') {
      try {
        const reference = `wallet_${userId}_${chain}_${Date.now()}`;

        const response = await axios.post(
          `${BREAD_API_URL}/wallet`,
          { reference },
          {
            headers: {
              'Authorization': `Bearer ${BREAD_API_KEY}`,
              'Content-Type': 'application/json',
            },
          }
        );

        const walletData = response.data.data || response.data;
        const walletId = walletData.wallet_id || walletData.id;
        const evmAddress = walletData.address?.evm || null;
        const svmAddress = walletData.address?.svm || null;

        return {
          walletId,
          evmAddress,
          svmAddress,
          network: walletData.network || 'unknown',
        };
      } catch (error: any) {
        fastify.log.error({ msg: 'Error creating Bread wallet', error: error.response?.data || error.message });
        return null;
      }
    }

    // Step 1: Find all unique users with Base chain deposits
    const { data: baseAddresses, error } = await supabaseAdmin
      .from('deposit_addresses')
      .select('user_id, network')
      .eq('network', 'base');

    if (error) {
      return reply.status(500).send({ error: 'Failed to fetch deposit addresses', details: error });
    }

    if (!baseAddresses || baseAddresses.length === 0) {
      return reply.send({ message: 'No Base chain addresses found', usersProcessed: 0 });
    }

    // Get unique user IDs
    const uniqueUserIds = [...new Set(baseAddresses.map(addr => addr.user_id))];
    fastify.log.info({ msg: 'Found users with Base deposits', count: uniqueUserIds.length });

    const results = [];

    // Step 2: Process each user
    for (const userId of uniqueUserIds) {
      // Get current Base addresses for this user
      const { data: userAddresses } = await supabaseAdmin
        .from('deposit_addresses')
        .select('id, asset_symbol, address, bread_wallet_id, bread_wallet_address')
        .eq('user_id', userId)
        .eq('network', 'base');

      if (!userAddresses || userAddresses.length === 0) continue;

      const result: any = {
        userId,
        assets: userAddresses.map(a => a.asset_symbol),
        depositAddress: userAddresses[0].address,
        oldBreadWalletId: userAddresses[0].bread_wallet_id,
        oldBreadAddress: userAddresses[0].bread_wallet_address,
      };

      if (isDryRun) {
        result.action = 'DRY_RUN - Would create new Bread wallet';
        results.push(result);
        continue;
      }

      // Create new Bread wallet
      fastify.log.info({ msg: 'Creating new Bread wallet for Base', userId });
      const newWallet = await createBreadWallet(userId, 'base');

      if (!newWallet || !newWallet.walletId) {
        result.action = 'FAILED';
        result.error = 'Failed to create Bread wallet';
        results.push(result);
        continue;
      }

      result.newBreadWalletId = newWallet.walletId;
      result.newBreadAddress = newWallet.evmAddress;
      result.network = newWallet.network;

      // Update all Base addresses for this user
      const { error: updateError } = await supabaseAdmin
        .from('deposit_addresses')
        .update({
          bread_wallet_id: newWallet.walletId,
          bread_wallet_address: newWallet.evmAddress,
          bread_wallet_type: 'basic',
          bread_synced_at: new Date().toISOString(),
        })
        .eq('user_id', userId)
        .eq('network', 'base');

      if (updateError) {
        result.action = 'FAILED';
        result.error = updateError.message;
      } else {
        result.action = 'SUCCESS';
        result.assetsUpdated = userAddresses.length;
      }

      results.push(result);
    }

    return reply.send({
      mode: isDryRun ? 'DRY_RUN' : 'LIVE',
      usersFound: uniqueUserIds.length,
      usersProcessed: results.length,
      results,
      message: isDryRun
        ? 'Dry run complete. Call with ?dry_run=false to apply changes.'
        : 'Migration complete! Users can now offramp on Base chain.',
    });
  });

  /**
   * Send bonus to user
   * POST /api/admin/send-bonus
   */
  fastify.post('/send-bonus', async (request, reply) => {
    const {
      user_email,
      amount,
      asset = 'USDC',
      chain = 'solana',
      reason
    } = request.body as {
      user_email: string;
      amount: number;
      asset?: string;
      chain?: string;
      reason: string;
    };

    const adminEmail = request.adminEmail!;

    logger.info({
      msg: 'Admin sending bonus',
      adminEmail,
      user_email,
      amount,
      asset,
      chain,
      reason,
    });

    // Validate inputs
    if (!user_email || !amount || !reason) {
      return reply.status(400).send({
        error: 'Missing required fields: user_email, amount, reason',
      });
    }

    if (amount <= 0) {
      return reply.status(400).send({
        error: 'Amount must be greater than 0',
      });
    }

    // Only support Solana USDC for now
    if (chain !== 'solana' || asset !== 'USDC') {
      return reply.status(400).send({
        error: 'Only Solana USDC bonuses are supported at this time',
      });
    }

    // Check treasury wallet is configured
    if (!env.SOLANA_TREASURY_PRIVATE_KEY) {
      return reply.status(500).send({
        error: 'Treasury wallet not configured. Please set SOLANA_TREASURY_PRIVATE_KEY',
      });
    }

    try {
      // Step 1: Find user by email
      const { data: user, error: userError } = await supabaseAdmin
        .from('users')
        .select('id, email, full_name, username')
        .eq('email', user_email)
        .single();

      if (userError || !user) {
        return reply.status(404).send({
          error: 'User not found',
          message: `No user found with email: ${user_email}`,
        });
      }

      // Step 2: Get user's Solana USDC deposit address
      const { data: depositAddress, error: addressError } = await supabaseAdmin
        .from('deposit_addresses')
        .select('address')
        .eq('user_id', user.id)
        .eq('network', 'solana')
        .eq('asset_symbol', 'USDC')
        .single();

      if (addressError || !depositAddress) {
        return reply.status(404).send({
          error: 'User deposit address not found',
          message: `User ${user_email} does not have a Solana USDC deposit address`,
        });
      }

      const userAddress = depositAddress.address;

      // Step 3: Create bonus transaction record
      const { data: bonusRecord, error: bonusError } = await supabaseAdmin
        .from('bonus_transactions')
        .insert({
          user_id: user.id,
          admin_email: adminEmail,
          amount,
          asset,
          chain,
          reason,
          status: 'processing',
        })
        .select()
        .single();

      if (bonusError || !bonusRecord) {
        logger.error({ error: bonusError }, 'Failed to create bonus record');
        return reply.status(500).send({
          error: 'Failed to create bonus record',
        });
      }

      // Step 4: Send USDC from treasury to user
      try {
        const connection = new Connection(env.SOLANA_RPC_URL, 'confirmed');

        // Parse treasury private key
        const treasurySecretKey = JSON.parse(env.SOLANA_TREASURY_PRIVATE_KEY);
        const treasuryKeypair = Keypair.fromSecretKey(new Uint8Array(treasurySecretKey));

        const usdcMint = new PublicKey(env.USDC_SOL_MINT);
        const recipientPubkey = new PublicKey(userAddress);

        // Get token accounts
        const treasuryTokenAccount = await getAssociatedTokenAddress(
          usdcMint,
          treasuryKeypair.publicKey
        );

        const recipientTokenAccount = await getAssociatedTokenAddress(
          usdcMint,
          recipientPubkey
        );

        // Convert amount to smallest unit (USDC has 6 decimals)
        const amountInSmallestUnit = Math.floor(amount * 1_000_000);

        // Create transfer instruction
        const transferInstruction = createTransferInstruction(
          treasuryTokenAccount,
          recipientTokenAccount,
          treasuryKeypair.publicKey,
          amountInSmallestUnit
        );

        // Create and send transaction
        const transaction = new Transaction().add(transferInstruction);

        logger.info({
          msg: 'Sending bonus transaction',
          from: treasuryKeypair.publicKey.toBase58(),
          to: userAddress,
          amount,
          amountInSmallestUnit,
        });

        const signature = await sendAndConfirmTransaction(
          connection,
          transaction,
          [treasuryKeypair],
          { commitment: 'confirmed' }
        );

        logger.info({
          msg: 'Bonus sent successfully',
          signature,
          user_email,
          amount,
        });

        // Step 5: Update bonus record with success
        await supabaseAdmin
          .from('bonus_transactions')
          .update({
            status: 'success',
            tx_hash: signature,
            completed_at: new Date().toISOString(),
          })
          .eq('id', bonusRecord.id);

        return reply.send({
          success: true,
          message: `Successfully sent ${amount} ${asset} bonus to ${user_email}`,
          bonus: {
            id: bonusRecord.id,
            user: {
              email: user.email,
              name: user.full_name || user.username,
            },
            amount,
            asset,
            chain,
            reason,
            tx_hash: signature,
            explorer_url: `https://solscan.io/tx/${signature}`,
          },
        });

      } catch (txError: any) {
        logger.error({
          error: txError,
          message: txError.message,
        }, 'Failed to send bonus transaction');

        // Update bonus record with failure
        await supabaseAdmin
          .from('bonus_transactions')
          .update({
            status: 'failed',
            error_message: txError.message,
          })
          .eq('id', bonusRecord.id);

        return reply.status(500).send({
          error: 'Failed to send bonus',
          message: txError.message,
        });
      }

    } catch (error: any) {
      logger.error({ error }, 'Bonus sending failed');
      return reply.status(500).send({
        error: 'Internal server error',
        message: error.message,
      });
    }
  });

  /**
   * Get all bonuses
   * GET /api/admin/bonuses
   */
  fastify.get('/bonuses', async (request, reply) => {
    const { limit = 50, status } = request.query as { limit?: number; status?: string };

    let query = supabaseAdmin
      .from('bonus_transactions')
      .select(`
        *,
        user:users(email, full_name, username)
      `)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (status) {
      query = query.eq('status', status);
    }

    const { data: bonuses, error } = await query;

    if (error) {
      return reply.status(500).send({ error: 'Failed to fetch bonuses' });
    }

    return { bonuses };
  });
};

