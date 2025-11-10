/**
 * Platform Fee Collection Service
 * 
 * Handles collecting platform fees in cryptocurrency before sending to Bread Africa.
 * Fees are deducted from the crypto amount and sent to the platform treasury wallet.
 */

import { Connection, PublicKey, Transaction, SystemProgram, sendAndConfirmTransaction, Keypair, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { getAssociatedTokenAddress, createTransferInstruction, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { logger } from '../utils/logger.js';
import { supabaseAdmin } from '../utils/supabase.js';
import { decrypt } from '../utils/encryption.js';
import { calculatePlatformFeeInCrypto, calculateAmountAfterFee } from '../config/fees.js';

const SOLANA_RPC_URL = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
const PLATFORM_TREASURY_ADDRESS = process.env.PLATFORM_TREASURY_ADDRESS;

if (!PLATFORM_TREASURY_ADDRESS) {
  logger.warn('⚠️  PLATFORM_TREASURY_ADDRESS not set - platform fees will not be collected');
}

// Token mint addresses
const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
const USDT_MINT = 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB';

interface FeeCollectionParams {
  userId: string;
  cryptoAmount: number;
  asset: string;
  chain: 'solana' | 'base';
  exchangeRate: number;
  fromAddress: string;
  quoteId?: string;
}

interface FeeCollectionResult {
  platformFee: number;
  amountToBread: number;
  treasuryTxHash: string | null;
  feeRecordId: string | null;
}

/**
 * Collect platform fee in cryptocurrency
 * 
 * This function:
 * 1. Calculates the platform fee in crypto based on exchange rate
 * 2. Transfers the fee from user's deposit wallet to platform treasury
 * 3. Records the fee in the database
 * 4. Returns the remaining amount to send to Bread
 */
export async function collectPlatformFee(
  params: FeeCollectionParams
): Promise<FeeCollectionResult> {
  const { userId, cryptoAmount, asset, chain, exchangeRate, fromAddress, quoteId } = params;

  logger.info({
    userId,
    cryptoAmount,
    asset,
    chain,
    exchangeRate,
  }, '💰 Collecting platform fee in crypto');

  try {
    // Calculate fee and amount to send to Bread
    const { platformFee, amountToBread } = calculateAmountAfterFee(
      cryptoAmount,
      asset,
      exchangeRate
    );

    logger.info({
      originalAmount: cryptoAmount,
      platformFee,
      amountToBread,
      feePercentage: ((platformFee / cryptoAmount) * 100).toFixed(4) + '%',
    }, '📊 Fee calculation complete');

    // Transfer fee to treasury wallet
    let treasuryTxHash: string | null = null;

    if (PLATFORM_TREASURY_ADDRESS && chain === 'solana') {
      treasuryTxHash = await transferFeeToTreasury({
        fromAddress,
        amount: platformFee,
        asset,
        userId,
      });

      logger.info({
        treasuryTxHash,
        platformFee,
        asset,
      }, '✅ Platform fee transferred to treasury');
    } else {
      logger.warn({
        chain,
        treasuryConfigured: !!PLATFORM_TREASURY_ADDRESS,
      }, '⚠️  Platform fee not collected - treasury not configured or unsupported chain');
    }

    // Record fee in database
    const feeRecordId = await recordPlatformFee({
      userId,
      amountNGN: platformFee * exchangeRate,
      cryptoAmount: platformFee,
      cryptoAsset: asset,
      exchangeRate,
      treasuryTxHash,
      quoteId,
    });

    logger.info({
      feeRecordId,
      platformFee,
      amountToBread,
      treasuryTxHash,
    }, '💾 Platform fee recorded in database');

    return {
      platformFee,
      amountToBread,
      treasuryTxHash,
      feeRecordId,
    };
  } catch (error: any) {
    logger.error({
      error: error.message,
      userId,
      cryptoAmount,
      asset,
    }, '❌ Failed to collect platform fee');

    // Return original amount if fee collection fails
    // This ensures the offramp can still proceed
    return {
      platformFee: 0,
      amountToBread: cryptoAmount,
      treasuryTxHash: null,
      feeRecordId: null,
    };
  }
}

/**
 * Transfer platform fee to treasury wallet on Solana
 */
async function transferFeeToTreasury(params: {
  fromAddress: string;
  amount: number;
  asset: string;
  userId: string;
}): Promise<string> {
  const { fromAddress, amount, asset, userId } = params;

  const connection = new Connection(SOLANA_RPC_URL, 'confirmed');

  // Get the encrypted private key from database
  const { data: depositAddress, error } = await supabaseAdmin
    .from('deposit_addresses')
    .select('private_key_encrypted')
    .eq('address', fromAddress)
    .eq('user_id', userId)
    .single();

  if (error || !depositAddress) {
    throw new Error('Deposit address not found');
  }

  // Decrypt private key
  const privateKeyArray = JSON.parse(decrypt(depositAddress.private_key_encrypted));
  const fromWallet = Keypair.fromSecretKey(Uint8Array.from(privateKeyArray));

  const fromPubkey = fromWallet.publicKey;
  const toPubkey = new PublicKey(PLATFORM_TREASURY_ADDRESS!);

  // Get token mint address
  let mintAddress: string;
  if (asset === 'USDC') {
    mintAddress = USDC_MINT;
  } else if (asset === 'USDT') {
    mintAddress = USDT_MINT;
  } else {
    throw new Error(`Unsupported asset for fee collection: ${asset}`);
  }

  const mintPubkey = new PublicKey(mintAddress);

  // Get associated token accounts
  const fromTokenAccount = await getAssociatedTokenAddress(mintPubkey, fromPubkey);
  const toTokenAccount = await getAssociatedTokenAddress(mintPubkey, toPubkey);

  // Convert amount to token units (6 decimals for USDC/USDT)
  const decimals = 6;
  const amountInTokenUnits = BigInt(Math.floor(amount * Math.pow(10, decimals)));

  logger.info({
    from: fromPubkey.toBase58(),
    to: toPubkey.toBase58(),
    amount,
    amountInTokenUnits: amountInTokenUnits.toString(),
    asset,
  }, '🔄 Transferring platform fee to treasury');

  // Create transaction
  const transaction = new Transaction().add(
    createTransferInstruction(
      fromTokenAccount,
      toTokenAccount,
      fromPubkey,
      amountInTokenUnits,
      [],
      TOKEN_PROGRAM_ID
    )
  );

  // Send and confirm transaction
  const signature = await sendAndConfirmTransaction(
    connection,
    transaction,
    [fromWallet],
    {
      commitment: 'confirmed',
      maxRetries: 3,
    }
  );

  return signature;
}

/**
 * Record platform fee in database
 */
async function recordPlatformFee(params: {
  userId: string;
  amountNGN: number;
  cryptoAmount: number;
  cryptoAsset: string;
  exchangeRate: number;
  treasuryTxHash: string | null;
  quoteId?: string;
}): Promise<string | null> {
  const { userId, amountNGN, cryptoAmount, cryptoAsset, exchangeRate, treasuryTxHash, quoteId } = params;

  try {
    const { data, error } = await supabaseAdmin
      .from('platform_fees')
      .insert({
        user_id: userId,
        amount: Math.round(amountNGN * 100), // Convert to kobo
        currency: 'NGN',
        fee_type: 'offramp',
        crypto_amount: cryptoAmount,
        crypto_asset: cryptoAsset,
        exchange_rate: exchangeRate,
        treasury_tx_hash: treasuryTxHash,
        quote_id: quoteId,
        description: `Platform fee for off-ramp (${cryptoAsset} → NGN)${treasuryTxHash ? ` - TX: ${treasuryTxHash.substring(0, 8)}...` : ''}`,
      })
      .select('id')
      .single();

    if (error) {
      logger.error({ error }, 'Failed to record platform fee in database');
      return null;
    }

    return data.id;
  } catch (error: any) {
    logger.error({ error: error.message }, 'Failed to record platform fee');
    return null;
  }
}

/**
 * Get platform fee collection stats
 */
export async function getPlatformFeeStats(): Promise<{
  totalFeesNaira: number;
  totalFeesCrypto: number;
  totalTransactions: number;
  cryptoCollectedCount: number;
  virtualFeesCount: number;
  collectionRate: number;
}> {
  const { data, error } = await supabaseAdmin.rpc('get_fee_collection_stats');

  if (error || !data || data.length === 0) {
    return {
      totalFeesNaira: 0,
      totalFeesCrypto: 0,
      totalTransactions: 0,
      cryptoCollectedCount: 0,
      virtualFeesCount: 0,
      collectionRate: 0,
    };
  }

  const stats = data[0];
  return {
    totalFeesNaira: parseFloat(stats.total_fees_naira || 0),
    totalFeesCrypto: parseFloat(stats.total_fees_crypto || 0),
    totalTransactions: parseInt(stats.total_transactions || 0),
    cryptoCollectedCount: parseInt(stats.crypto_collected_count || 0),
    virtualFeesCount: parseInt(stats.virtual_fees_count || 0),
    collectionRate: parseFloat(stats.collection_rate || 0),
  };
}

