import { FastifyPluginAsync } from 'fastify';
import { authMiddleware } from '../middleware/auth.js';
import { supabaseAdmin } from '../utils/supabase.js';
import { solanaWalletService } from '../services/wallet/solana.js';
import { baseWalletService } from '../services/wallet/base.js';
import { polygonWalletService } from '../services/wallet/polygon.js';
import { BreadService } from '../services/bread/index.js';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import type { Asset } from '../types/index.js';

// Initialize Bread service
const breadService = new BreadService({
  apiKey: env.BREAD_API_KEY!,
  baseUrl: env.BREAD_API_URL,
});

// Balance cache to prevent rate limiting
interface BalanceCacheEntry {
  balances: any;
  timestamp: number;
}
const balanceCache = new Map<string, BalanceCacheEntry>();
const BALANCE_CACHE_TTL = 30000; // 30 seconds cache

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
   * This fetches REAL-TIME balances from the blockchain:
   * 1. Gets user's deposit addresses from database
   * 2. Queries Solana/Base blockchain for actual token balances
   * 3. ALSO checks Bread wallet balances (where funds go after deposit)
   * 4. Returns COMBINED balances (deposit address + Bread wallet)
   *
   * NOTE: Results are cached for 30 seconds to prevent RPC rate limiting
   */
  fastify.get('/balances', async (request, reply) => {
    const userId = request.userId!;

    try {
      // Check cache first to prevent rate limiting
      const cached = balanceCache.get(userId);
      if (cached && Date.now() - cached.timestamp < BALANCE_CACHE_TTL) {
        logger.debug({ userId }, 'Returning cached balances');
        return { balances: cached.balances };
      }

      // Get user's deposit addresses (need bread_wallet_address too)
      const { data: addresses, error } = await supabaseAdmin
        .from('deposit_addresses')
        .select('network, asset_symbol, address, bread_wallet_address')
        .eq('user_id', userId);

      if (error) {
        logger.error({ error, userId }, 'Failed to fetch deposit addresses');
        return reply.status(500).send({ error: 'Failed to fetch addresses' });
      }

      // Initialize balances
      const balances: any = {
        usdcSolana: 0,
        usdcBase: 0,
        usdcPolygon: 0,
        sol: 0,
        usdtSolana: 0,
        usdtBase: 0,
        usdtPolygon: 0,
        eth: 0,
        matic: 0,
      };

      // If no addresses, return zero balances
      if (!addresses || addresses.length === 0) {
        return { balances };
      }

      // Fetch real-time balances from blockchain
      for (const addr of addresses) {
        const { network, asset_symbol, address, bread_wallet_address } = addr;

        try {
          let depositBalance = 0;

          // Fetch deposit address balance based on network and asset
          if (network === 'solana') {
            if (asset_symbol === 'SOL') {
              depositBalance = await solanaWalletService.getSOLBalance(address);
            } else if (asset_symbol === 'USDC') {
              depositBalance = await solanaWalletService.getUSDCBalance(address);
            } else if (asset_symbol === 'USDT') {
              depositBalance = await solanaWalletService.getUSDTBalance(address);
            }
          } else if (network === 'base') {
            if (asset_symbol === 'USDC') {
              depositBalance = await baseWalletService.getUSDCBalance(address);
            } else if (asset_symbol === 'USDT') {
              depositBalance = await baseWalletService.getUSDTBalance(address);
            } else if (asset_symbol === 'ETH') {
              depositBalance = await baseWalletService.getETHBalance(address);
            }
          } else if (network === 'polygon') {
            if (asset_symbol === 'USDC') {
              depositBalance = await polygonWalletService.getUSDCBalance(address);
            } else if (asset_symbol === 'USDT') {
              depositBalance = await polygonWalletService.getUSDTBalance(address);
            } else if (asset_symbol === 'MATIC') {
              depositBalance = await polygonWalletService.getMATICBalance(address);
            }
          }

          // NOTE: We intentionally do NOT include Bread wallet on-chain balance
          // Bread tracks balance internally and may not recognize on-chain deposits immediately
          // Including it would show a balance users can't actually offramp, causing confusion
          // The deposit wallet balance is what users can actually use

          logger.debug({
            network,
            asset: asset_symbol,
            depositBalance,
            breadWalletAddress: bread_wallet_address,
          }, '💰 Deposit wallet balance (Bread balance excluded)');

          // Only use deposit wallet balance
          const totalBalance = depositBalance;

          // Set combined balance
          if (network === 'solana') {
            if (asset_symbol === 'SOL') {
              balances.sol = totalBalance;
            } else if (asset_symbol === 'USDC') {
              balances.usdcSolana = totalBalance;
            } else if (asset_symbol === 'USDT') {
              balances.usdtSolana = totalBalance;
            }
          } else if (network === 'base') {
            if (asset_symbol === 'USDC') {
              balances.usdcBase = totalBalance;
            } else if (asset_symbol === 'USDT') {
              balances.usdtBase = totalBalance;
            } else if (asset_symbol === 'ETH') {
              balances.eth = totalBalance;
            }
          } else if (network === 'polygon') {
            if (asset_symbol === 'USDC') {
              balances.usdcPolygon = totalBalance;
            } else if (asset_symbol === 'USDT') {
              balances.usdtPolygon = totalBalance;
            } else if (asset_symbol === 'MATIC') {
              balances.matic = totalBalance;
            }
          }

          logger.debug({
            network,
            asset: asset_symbol,
            address,
            depositBalance,
            totalBalance,
          }, 'Fetched balance for asset');

        } catch (balanceError: any) {
          logger.error({
            error: balanceError.message,
            network,
            asset: asset_symbol,
            address,
          }, 'Failed to fetch balance for asset');
          // Continue with other assets even if one fails
        }
      }

      // Cache the balances to prevent rate limiting
      balanceCache.set(userId, {
        balances,
        timestamp: Date.now(),
      });

      return { balances };

    } catch (error: any) {
      logger.error({ error: error.message, userId }, 'Failed to fetch balances');
      return reply.status(500).send({ error: 'Failed to fetch balances' });
    }
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
 * Also creates Bread Africa wallets for offramp functionality
 */
async function generateUserAddresses(userId: string) {
  const addresses = [];
  let accountIndex = 0;

  // Get user's offramp mode preference and Bread identity ID
  const { data: user } = await supabaseAdmin
    .from('users')
    .select('offramp_mode, bread_identity_id')
    .eq('id', userId)
    .single();

  const walletType = user?.offramp_mode || 'basic';

  // Create Bread wallets for all users (no KYC/identity required)
  let breadSolanaWalletId: string | undefined;
  let breadSolanaWalletAddress: string | undefined;
  let breadBaseWalletId: string | undefined;
  let breadBaseWalletAddress: string | undefined;
  let breadPolygonWalletId: string | undefined;
  let breadPolygonWalletAddress: string | undefined;

  try {
    // Create Bread wallet for Solana (shared by SOL, USDC, USDT)
    // Use userId as identityId since Bread API doesn't actually require identity
    logger.info({ msg: 'Creating Bread wallet for Solana (no KYC required)', userId });
    const breadSolanaWallet = await breadService.wallet.createWallet(
      userId, // Use userId instead of bread_identity_id
      'solana',
      'basic' // Always use 'basic' type - user can enable automation later
    );
    // Note: Bread API returns wallet_id but our type interface uses id
    breadSolanaWalletId = (breadSolanaWallet as any).wallet_id || breadSolanaWallet.id;
    breadSolanaWalletAddress = breadSolanaWallet.address;
    logger.info({ msg: 'Bread Solana wallet created', walletId: breadSolanaWalletId, address: breadSolanaWalletAddress });

    // Create Bread wallet for Base (shared by USDC, USDT)
    logger.info({ msg: 'Creating Bread wallet for Base (no KYC required)', userId });
    const breadBaseWallet = await breadService.wallet.createWallet(
      userId, // Use userId instead of bread_identity_id
      'base',
      'basic'
    );
    // Note: Bread API returns wallet_id but our type interface uses id
    breadBaseWalletId = (breadBaseWallet as any).wallet_id || breadBaseWallet.id;
    breadBaseWalletAddress = breadBaseWallet.address;
    logger.info({ msg: 'Bread Base wallet created', walletId: breadBaseWalletId, address: breadBaseWalletAddress });

    // Create Bread wallet for Polygon (shared by USDC, USDT)
    logger.info({ msg: 'Creating Bread wallet for Polygon (no KYC required)', userId });
    const breadPolygonWallet = await breadService.wallet.createWallet(
      userId, // Use userId instead of bread_identity_id
      'polygon',
      'basic'
    );
    // Note: Bread API returns wallet_id but our type interface uses id
    breadPolygonWalletId = (breadPolygonWallet as any).wallet_id || breadPolygonWallet.id;
    breadPolygonWalletAddress = breadPolygonWallet.address;
    logger.info({ msg: 'Bread Polygon wallet created', walletId: breadPolygonWalletId, address: breadPolygonWalletAddress });
  } catch (error: any) {
    logger.error({
      msg: 'Failed to create Bread wallets',
      error: error.message,
      userId,
    });
    // Continue anyway - Bread wallets can be created later via sync script
  }

  // Generate ONE Solana wallet for SOL, USDC, and USDT
  const solanaWallet = await solanaWalletService.generateWallet(userId, accountIndex++);
  const solAssets: Asset[] = ['SOL', 'USDC', 'USDT'];

  for (const asset of solAssets) {
    const { data, error } = await supabaseAdmin
      .from('deposit_addresses')
      .insert({
        user_id: userId,
        network: 'solana',
        asset_symbol: asset,
        address: solanaWallet.address, // SAME address for all Solana assets
        derivation_path: solanaWallet.derivationPath,
        private_key_encrypted: solanaWallet.encryptedPrivateKey,
        wallet_type: walletType,
        bread_wallet_id: breadSolanaWalletId, // Link to Bread wallet
        bread_wallet_address: breadSolanaWalletAddress, // Store Bread wallet address
        bread_wallet_type: breadSolanaWalletId ? 'basic' : null,
        bread_synced_at: breadSolanaWalletId ? new Date().toISOString() : null,
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

  // Generate ONE Base wallet for USDC and USDT (ETH gas is paid by gas sponsor)
  const baseWallet = await baseWalletService.generateWallet(userId, accountIndex++);
  const baseAssets: Asset[] = ['USDC', 'USDT'];

  for (const asset of baseAssets) {
    const { data, error } = await supabaseAdmin
      .from('deposit_addresses')
      .insert({
        user_id: userId,
        network: 'base',
        asset_symbol: asset,
        address: baseWallet.address, // SAME address for all Base assets
        derivation_path: baseWallet.derivationPath,
        private_key_encrypted: baseWallet.encryptedPrivateKey,
        wallet_type: walletType,
        bread_wallet_id: breadBaseWalletId, // Link to Bread wallet
        bread_wallet_address: breadBaseWalletAddress, // Store Bread wallet address (EVM format)
        bread_wallet_type: breadBaseWalletId ? 'basic' : null,
        bread_synced_at: breadBaseWalletId ? new Date().toISOString() : null,
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

  // Generate ONE Polygon wallet for USDC and USDT (MATIC gas is paid by gas sponsor)
  const polygonWallet = await polygonWalletService.generateWallet(userId, accountIndex++);
  const polygonAssets: Asset[] = ['USDC', 'USDT'];

  for (const asset of polygonAssets) {
    const { data, error } = await supabaseAdmin
      .from('deposit_addresses')
      .insert({
        user_id: userId,
        network: 'polygon',
        asset_symbol: asset,
        address: polygonWallet.address, // SAME address for all Polygon assets
        derivation_path: polygonWallet.derivationPath,
        private_key_encrypted: polygonWallet.encryptedPrivateKey,
        wallet_type: walletType,
        bread_wallet_id: breadPolygonWalletId, // Link to Bread wallet
        bread_wallet_address: breadPolygonWalletAddress, // Store Bread wallet address (EVM format)
        bread_wallet_type: breadPolygonWalletId ? 'basic' : null,
        bread_synced_at: breadPolygonWalletId ? new Date().toISOString() : null,
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

