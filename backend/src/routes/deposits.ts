import { FastifyPluginAsync } from 'fastify';
import { authMiddleware } from '../middleware/auth.js';
import { supabaseAdmin } from '../utils/supabase.js';
import { solanaWalletService } from '../services/wallet/solana.js';
import { baseWalletService } from '../services/wallet/base.js';
import type { Chain, Asset } from '../types/index.js';

export const depositRoutes: FastifyPluginAsync = async (fastify) => {
  // Apply auth middleware to all routes
  fastify.addHook('onRequest', authMiddleware);

  /**
   * Get user's deposit addresses
   */
  fastify.get('/addresses', async (request, reply) => {
    const userId = request.userId!;

    const { data: addresses, error } = await supabaseAdmin
      .from('deposit_addresses')
      .select('*')
      .eq('user_id', userId);

    if (error) {
      return reply.status(500).send({ error: 'Failed to fetch addresses' });
    }

    // If no addresses exist, generate them
    if (!addresses || addresses.length === 0) {
      const newAddresses = await generateUserAddresses(userId);
      return { addresses: newAddresses };
    }

    return {
      addresses: addresses.map((addr) => ({
        chain: addr.network,
        asset: addr.asset_symbol,
        address: addr.address,
      })),
    };
  });

  /**
   * Get deposit history
   */
  fastify.get('/history', async (request, reply) => {
    const userId = request.userId!;

    const { data: deposits, error } = await supabaseAdmin
      .from('onchain_deposits')
      .select('*')
      .eq('user_id', userId)
      .order('detected_at', { ascending: false })
      .limit(50);

    if (error) {
      return reply.status(500).send({ error: 'Failed to fetch deposit history' });
    }

    return { deposits };
  });

  /**
   * Get specific deposit details
   */
  fastify.get('/deposits/:id', async (request, reply) => {
    const userId = request.userId!;
    const { id } = request.params as { id: string };

    const { data: deposit, error } = await supabaseAdmin
      .from('onchain_deposits')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (error || !deposit) {
      return reply.status(404).send({ error: 'Deposit not found' });
    }

    return { deposit };
  });

  /**
   * Get balances for all assets
   *
   * This calculates the user's available balance by:
   * 1. Summing all confirmed deposits from onchain_deposits table
   * 2. Subtracting all completed payouts
   */
  fastify.get('/balances', async (request, reply) => {
    const userId = request.userId!;

    // Get all confirmed deposits (not swept yet or swept to treasury)
    const { data: deposits } = await supabaseAdmin
      .from('onchain_deposits')
      .select('asset, chain, amount')
      .eq('user_id', userId)
      .in('status', ['confirmed', 'swept']);

    // Get all completed payouts (money already sent to bank)
    const { data: payouts } = await supabaseAdmin
      .from('payouts')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'success');

    // Calculate balances
    const balances: any = {
      usdcSolana: 0,
      usdcBase: 0,
      sol: 0,
      usdtSolana: 0,
      eth: 0,
    };

    // Add up all deposits
    if (deposits) {
      for (const deposit of deposits) {
        const amount = parseFloat(deposit.amount);
        const key = `${deposit.asset.toLowerCase()}${deposit.chain === 'solana' ? 'Solana' : deposit.chain === 'base' ? 'Base' : ''}`;

        if (balances.hasOwnProperty(key)) {
          balances[key] += amount;
        }
      }
    }

    // Subtract payouts (TODO: implement when payout flow is complete)
    // For now, payouts are handled separately

    return { balances };
  });
};

/**
 * Generate deposit addresses for a new user
 */
async function generateUserAddresses(userId: string) {
  const addresses = [];
  let accountIndex = 0;

  // Generate Solana addresses
  const solAssets: Array<{ asset: Asset; chain: Chain }> = [
    { asset: 'SOL', chain: 'solana' },
    { asset: 'USDC', chain: 'solana' },
    { asset: 'USDT', chain: 'solana' },
  ];

  for (const { asset, chain } of solAssets) {
    const wallet = await solanaWalletService.generateWallet(userId, accountIndex++);

    const { data, error } = await supabaseAdmin
      .from('deposit_addresses')
      .insert({
        user_id: userId,
        network: chain,
        asset_symbol: asset,
        address: wallet.address,
        derivation_path: wallet.derivationPath,
        private_key_encrypted: wallet.encryptedPrivateKey,
      })
      .select()
      .single();

    if (!error && data) {
      addresses.push({
        chain: data.network,
        asset: data.asset_symbol,
        address: data.address,
      });
    }
  }

  // Generate Base addresses
  const baseAssets: Array<{ asset: Asset; chain: Chain }> = [
    { asset: 'USDC', chain: 'base' },
  ];

  for (const { asset, chain } of baseAssets) {
    const wallet = await baseWalletService.generateWallet(userId, accountIndex++);

    const { data, error } = await supabaseAdmin
      .from('deposit_addresses')
      .insert({
        user_id: userId,
        network: chain,
        asset_symbol: asset,
        address: wallet.address,
        derivation_path: wallet.derivationPath,
        private_key_encrypted: wallet.encryptedPrivateKey,
      })
      .select()
      .single();

    if (!error && data) {
      addresses.push({
        chain: data.network,
        asset: data.asset_symbol,
        address: data.address,
      });
    }
  }

  return addresses;
}

