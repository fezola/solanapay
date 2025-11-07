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

        // Map asset + chain to balance key
        let key = '';
        if (deposit.asset === 'USDC' && deposit.chain === 'solana') {
          key = 'usdcSolana';
        } else if (deposit.asset === 'USDC' && deposit.chain === 'base') {
          key = 'usdcBase';
        } else if (deposit.asset === 'SOL' && deposit.chain === 'solana') {
          key = 'sol';
        } else if (deposit.asset === 'USDT' && deposit.chain === 'solana') {
          key = 'usdtSolana';
        } else if (deposit.asset === 'ETH' && deposit.chain === 'base') {
          key = 'eth';
        }

        if (key && balances.hasOwnProperty(key)) {
          balances[key] += amount;
        }
      }
    }

    // Subtract payouts (TODO: implement when payout flow is complete)
    // For now, payouts are handled separately

    return { balances };
  });

  /**
   * Get crypto balances (for basic mode users)
   * Shows actual crypto amounts, not fiat equivalent
   */
  fastify.get('/crypto-balances', async (request, reply) => {
    const userId = request.userId!;

    // Get all confirmed deposits that haven't been used for offramp
    const { data: deposits } = await supabaseAdmin
      .from('onchain_deposits')
      .select('asset, chain, amount')
      .eq('user_id', userId)
      .eq('status', 'confirmed'); // Only confirmed, not swept

    // Calculate crypto balances
    const balances: Record<string, number> = {};

    if (deposits) {
      for (const deposit of deposits) {
        const key = `${deposit.asset.toLowerCase()}-${deposit.chain}`;
        balances[key] = (balances[key] || 0) + parseFloat(deposit.amount);
      }
    }

    return { balances };
  });
};

/**
 * Generate deposit addresses for a new user
 * Respects user's offramp_mode preference (automatic vs basic)
 */
async function generateUserAddresses(userId: string) {
  const addresses = [];
  let accountIndex = 0;

  // Get user's offramp mode preference
  const { data: user } = await supabaseAdmin
    .from('users')
    .select('offramp_mode')
    .eq('id', userId)
    .single();

  const walletType = user?.offramp_mode || 'basic';

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
        wallet_type: walletType,
      })
      .select()
      .single();

    if (!error && data) {
      addresses.push({
        chain: data.network,
        asset: data.asset_symbol,
        address: data.address,
        walletType: data.wallet_type,
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
        wallet_type: walletType,
      })
      .select()
      .single();

    if (!error && data) {
      addresses.push({
        chain: data.network,
        asset: data.asset_symbol,
        address: data.address,
        walletType: data.wallet_type,
      });
    }
  }

  return addresses;
}

