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
      .eq('user_id', userId)
      .is('disabled_at', null);

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
        chain: addr.chain,
        asset: addr.asset,
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
   */
  fastify.get('/balances', async (request, reply) => {
    const userId = request.userId!;

    // Get all deposit addresses
    const { data: addresses } = await supabaseAdmin
      .from('deposit_addresses')
      .select('*')
      .eq('user_id', userId)
      .is('disabled_at', null);

    if (!addresses || addresses.length === 0) {
      return {
        balances: {
          usdcSolana: 0,
          usdcBase: 0,
          sol: 0,
          usdtSolana: 0,
        },
      };
    }

    const balances: any = {};

    for (const addr of addresses) {
      try {
        let balance = 0;

        if (addr.chain === 'solana') {
          if (addr.asset === 'SOL') {
            balance = await solanaWalletService.getSOLBalance(addr.address);
          } else if (addr.asset === 'USDC') {
            balance = await solanaWalletService.getUSDCBalance(addr.address);
          } else if (addr.asset === 'USDT') {
            balance = await solanaWalletService.getUSDTBalance(addr.address);
          }
        } else if (addr.chain === 'base') {
          if (addr.asset === 'USDC') {
            balance = await baseWalletService.getUSDCBalance(addr.address);
          } else if (addr.asset === 'ETH') {
            balance = await baseWalletService.getETHBalance(addr.address);
          }
        }

        const key = `${addr.asset.toLowerCase()}${addr.chain === 'solana' ? 'Solana' : 'Base'}`;
        balances[key] = balance;
      } catch (error) {
        request.log.error(`Failed to get balance for ${addr.chain}/${addr.asset}:`, error);
        balances[`${addr.asset.toLowerCase()}${addr.chain}`] = 0;
      }
    }

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
        chain,
        asset,
        address: wallet.address,
        derivation_path: wallet.derivationPath,
        encrypted_private_key: wallet.encryptedPrivateKey,
      })
      .select()
      .single();

    if (!error && data) {
      addresses.push({
        chain: data.chain,
        asset: data.asset,
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
        chain,
        asset,
        address: wallet.address,
        derivation_path: wallet.derivationPath,
        encrypted_private_key: wallet.encryptedPrivateKey,
      })
      .select()
      .single();

    if (!error && data) {
      addresses.push({
        chain: data.chain,
        asset: data.asset,
        address: data.address,
      });
    }
  }

  return addresses;
}

