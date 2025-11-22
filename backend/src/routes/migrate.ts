/**
 * Migration endpoint - NO AUTH REQUIRED
 * Just use secret key from environment
 */

import { FastifyPluginAsync } from 'fastify';
import { supabaseAdmin } from '../utils/supabase.js';
import axios from 'axios';

export const migrateRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * Fix Base wallet addresses
   * GET /migrate/fix-base-wallets?secret=YOUR_ENCRYPTION_KEY&dry_run=true
   */
  fastify.get('/fix-base-wallets', async (request, reply) => {
    const { secret, dry_run = 'true' } = request.query as { secret?: string; dry_run?: string };
    const isDryRun = dry_run === 'true';

    // Simple secret check
    const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
    if (!secret || secret !== ENCRYPTION_KEY) {
      return reply.status(401).send({ 
        error: 'Unauthorized',
        message: 'Invalid secret. Use ?secret=YOUR_ENCRYPTION_KEY'
      });
    }

    const BREAD_API_KEY = process.env.BREAD_API_KEY!;
    const BREAD_API_URL = 'https://processor-prod.up.railway.app';

    fastify.log.info({ msg: 'Starting Base wallet migration', isDryRun });

    // Create Bread wallet
    async function createBreadWallet(userId: string, chain: string = 'base') {
      try {
        const reference = `wallet_${userId}_${chain}_${Date.now()}`;

        // CRITICAL: Bread API needs network parameter (svm or evm)
        const network = chain === 'solana' ? 'svm' : 'evm';

        const response = await axios.post(
          `${BREAD_API_URL}/wallet`,
          {
            reference,
            network, // This is why it was failing!
          },
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

        return { walletId, evmAddress, error: null };
      } catch (error: any) {
        const errorDetails = error.response?.data || error.message;
        fastify.log.error({ msg: 'Error creating Bread wallet', error: errorDetails });
        return { walletId: null, evmAddress: null, error: errorDetails };
      }
    }

    // Find all Base chain users
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

    const uniqueUserIds = [...new Set(baseAddresses.map(addr => addr.user_id))];
    const results = [];

    // Process each user
    for (const userId of uniqueUserIds) {
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
        result.error = newWallet?.error || 'Failed to create Bread wallet';
        result.breadApiError = newWallet?.error; // Show actual Bread API error
        results.push(result);
        continue;
      }

      result.newBreadWalletId = newWallet.walletId;
      result.newBreadAddress = newWallet.evmAddress;

      // Update database
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
        : '✅ Migration complete! Users can now offramp on Base chain.',
    });
  });
};

