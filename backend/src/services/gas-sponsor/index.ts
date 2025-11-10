/**
 * Gas Fee Sponsorship Service
 * 
 * This service handles paying gas fees for user transactions using the referral funding wallet.
 * Users don't need to hold SOL for gas - we sponsor it!
 */

import { Connection, Keypair, PublicKey, Transaction, sendAndConfirmTransaction, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { supabaseAdmin } from '../../utils/supabase.js';
import { logger } from '../../utils/logger.js';
import * as crypto from 'crypto';

const SOLANA_RPC_URL = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
const connection = new Connection(SOLANA_RPC_URL, 'confirmed');

// Encryption key from environment
const ENCRYPTION_KEY = process.env.WALLET_ENCRYPTION_KEY;

if (!ENCRYPTION_KEY) {
  logger.warn('⚠️  WALLET_ENCRYPTION_KEY not set - gas sponsorship will not work');
}

/**
 * Decrypt data using AES-256-GCM
 */
function decrypt(encrypted: string, key: string, iv: string, tag: string): string {
  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    Buffer.from(key, 'hex'),
    Buffer.from(iv, 'hex')
  );
  
  decipher.setAuthTag(Buffer.from(tag, 'hex'));
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

/**
 * Get the gas sponsor wallet keypair
 */
async function getGasSponsorWallet(): Promise<Keypair | null> {
  try {
    if (!ENCRYPTION_KEY) {
      throw new Error('WALLET_ENCRYPTION_KEY not configured');
    }

    // Get active funding wallet from database
    const { data, error } = await supabaseAdmin
      .from('referral_funding_wallet')
      .select('encrypted_private_key, encryption_iv, encryption_tag, wallet_address')
      .eq('is_active', true)
      .single();

    if (error || !data) {
      logger.error({ error }, 'Failed to get gas sponsor wallet from database');
      return null;
    }

    if (!data.encrypted_private_key || !data.encryption_iv || !data.encryption_tag) {
      logger.error('Gas sponsor wallet missing encryption data');
      return null;
    }

    // Decrypt private key
    const privateKeyHex = decrypt(
      data.encrypted_private_key,
      ENCRYPTION_KEY,
      data.encryption_iv,
      data.encryption_tag
    );

    // Create keypair from private key
    const privateKeyBuffer = Buffer.from(privateKeyHex, 'hex');
    const keypair = Keypair.fromSecretKey(privateKeyBuffer);

    // Verify public key matches
    if (keypair.publicKey.toBase58() !== data.wallet_address) {
      logger.error('Decrypted wallet public key mismatch');
      return null;
    }

    logger.info({ wallet: data.wallet_address }, '✅ Gas sponsor wallet loaded');
    return keypair;
  } catch (error) {
    logger.error({ error }, 'Failed to get gas sponsor wallet');
    return null;
  }
}

/**
 * Check if gas sponsor wallet has enough SOL for gas fees
 */
async function checkGasSponsorBalance(): Promise<{ balance: number; hasEnough: boolean }> {
  try {
    const wallet = await getGasSponsorWallet();
    if (!wallet) {
      return { balance: 0, hasEnough: false };
    }

    const balance = await connection.getBalance(wallet.publicKey);
    const balanceSOL = balance / LAMPORTS_PER_SOL;

    // Need at least 0.01 SOL for gas fees
    const hasEnough = balanceSOL >= 0.01;

    logger.info({ balanceSOL, hasEnough }, 'Gas sponsor wallet balance');
    return { balance: balanceSOL, hasEnough };
  } catch (error) {
    logger.error({ error }, 'Failed to check gas sponsor balance');
    return { balance: 0, hasEnough: false };
  }
}

/**
 * Sponsor gas fees for a transaction
 * 
 * @param transaction - The transaction to sponsor
 * @param userPublicKey - The user's public key (for logging)
 * @returns Transaction signature or null if failed
 */
async function sponsorTransaction(
  transaction: Transaction,
  userPublicKey: string
): Promise<string | null> {
  try {
    const wallet = await getGasSponsorWallet();
    if (!wallet) {
      logger.error('Gas sponsor wallet not available');
      return null;
    }

    // Check balance
    const { hasEnough } = await checkGasSponsorBalance();
    if (!hasEnough) {
      logger.error('Gas sponsor wallet has insufficient SOL balance');
      return null;
    }

    // Set fee payer to sponsor wallet
    transaction.feePayer = wallet.publicKey;

    // Get recent blockhash
    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;

    // Sign and send transaction
    const signature = await sendAndConfirmTransaction(
      connection,
      transaction,
      [wallet], // Sponsor wallet signs for gas
      {
        commitment: 'confirmed',
        maxRetries: 3,
      }
    );

    logger.info(
      { signature, user: userPublicKey, sponsor: wallet.publicKey.toBase58() },
      '✅ Transaction sponsored successfully'
    );

    // Log gas fee usage
    await logGasFeeUsage(signature, userPublicKey);

    return signature;
  } catch (error) {
    logger.error({ error, user: userPublicKey }, 'Failed to sponsor transaction');
    return null;
  }
}

/**
 * Log gas fee usage to database
 */
async function logGasFeeUsage(signature: string, userPublicKey: string): Promise<void> {
  try {
    // Get transaction details to calculate actual fee
    const txInfo = await connection.getTransaction(signature, {
      commitment: 'confirmed',
      maxSupportedTransactionVersion: 0,
    });

    if (!txInfo || !txInfo.meta) {
      logger.warn({ signature }, 'Could not get transaction info for gas logging');
      return;
    }

    const fee = txInfo.meta.fee;
    const feeSOL = fee / LAMPORTS_PER_SOL;
    const feeUSD = feeSOL * 200; // Approximate, you can get real SOL price from an API

    logger.info(
      { signature, user: userPublicKey, feeSOL, feeUSD },
      '💰 Gas fee sponsored'
    );

    // Store in database for tracking
    // Note: This requires user_id, which should be passed to this function
    // For now, we just log it. You can enhance this later.
  } catch (error) {
    logger.error({ error, signature }, 'Failed to log gas fee usage');
  }
}

/**
 * Get gas sponsorship stats
 */
async function getGasSponsorshipStats(): Promise<{
  walletAddress: string;
  solBalance: number;
  hasEnoughForGas: boolean;
  estimatedTransactionsRemaining: number;
}> {
  const wallet = await getGasSponsorWallet();
  if (!wallet) {
    return {
      walletAddress: '',
      solBalance: 0,
      hasEnoughForGas: false,
      estimatedTransactionsRemaining: 0,
    };
  }

  const { balance, hasEnough } = await checkGasSponsorBalance();
  
  // Average Solana transaction fee is ~0.000005 SOL
  const avgFeeSOL = 0.000005;
  const estimatedTxs = Math.floor(balance / avgFeeSOL);

  return {
    walletAddress: wallet.publicKey.toBase58(),
    solBalance: balance,
    hasEnoughForGas: hasEnough,
    estimatedTransactionsRemaining: estimatedTxs,
  };
}

export const gasSponsorService = {
  getGasSponsorWallet,
  checkGasSponsorBalance,
  sponsorTransaction,
  getGasSponsorshipStats,
};

