/**
 * Platform Fee Collection Service
 * 
 * Handles collecting platform fees in cryptocurrency before sending to Bread Africa.
 * Fees are deducted from the crypto amount and sent to the platform treasury wallet.
 */

import { Connection, PublicKey, Transaction, SystemProgram, sendAndConfirmTransaction, Keypair, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { getAssociatedTokenAddress, createTransferInstruction, createAssociatedTokenAccountInstruction, TOKEN_PROGRAM_ID, getAccount } from '@solana/spl-token';
import { ethers } from 'ethers';
import { logger } from '../utils/logger.js';
import { supabaseAdmin } from '../utils/supabase.js';
import { decrypt } from '../utils/encryption.js';
import { calculatePlatformFeeInCrypto, calculateAmountAfterFee } from '../config/fees.js';

const SOLANA_RPC_URL = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
const BASE_RPC_URL = process.env.BASE_RPC_URL || 'https://mainnet.base.org';
const POLYGON_RPC_URL = process.env.POLYGON_RPC_URL || 'https://polygon-rpc.com';

// Treasury addresses per chain
const PLATFORM_TREASURY_ADDRESS_SOLANA = process.env.PLATFORM_TREASURY_ADDRESS_SOLANA || process.env.PLATFORM_TREASURY_ADDRESS;
const PLATFORM_TREASURY_ADDRESS_BASE = process.env.PLATFORM_TREASURY_ADDRESS_BASE;
const PLATFORM_TREASURY_ADDRESS_POLYGON = process.env.PLATFORM_TREASURY_ADDRESS_POLYGON;

if (!PLATFORM_TREASURY_ADDRESS_SOLANA) {
  logger.warn('⚠️  PLATFORM_TREASURY_ADDRESS_SOLANA not set - Solana platform fees will not be collected');
}
if (!PLATFORM_TREASURY_ADDRESS_BASE) {
  logger.warn('⚠️  PLATFORM_TREASURY_ADDRESS_BASE not set - Base platform fees will not be collected');
}
if (!PLATFORM_TREASURY_ADDRESS_POLYGON) {
  logger.warn('⚠️  PLATFORM_TREASURY_ADDRESS_POLYGON not set - Polygon platform fees will not be collected');
}

// Token mint addresses
const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
const USDT_MINT = 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB';

interface FeeCollectionParams {
  userId: string;
  cryptoAmount: number;
  asset: string;
  chain: string;
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

    // Transfer fee to treasury wallet based on chain
    let treasuryTxHash: string | null = null;
    const chainLower = chain.toLowerCase();

    logger.info({
      chain,
      chainLower,
      solanaTreasuryConfigured: !!PLATFORM_TREASURY_ADDRESS_SOLANA,
      baseTreasuryConfigured: !!PLATFORM_TREASURY_ADDRESS_BASE,
      polygonTreasuryConfigured: !!PLATFORM_TREASURY_ADDRESS_POLYGON,
      solanaTreasuryAddress: PLATFORM_TREASURY_ADDRESS_SOLANA ? 'SET' : 'NOT SET',
      baseTreasuryAddress: PLATFORM_TREASURY_ADDRESS_BASE ? 'SET' : 'NOT SET',
      polygonTreasuryAddress: PLATFORM_TREASURY_ADDRESS_POLYGON ? 'SET' : 'NOT SET',
    }, '🔍 Checking treasury configuration for fee collection');

    if (chainLower === 'solana' && PLATFORM_TREASURY_ADDRESS_SOLANA) {
      logger.info({ treasury: PLATFORM_TREASURY_ADDRESS_SOLANA }, '📤 Attempting to transfer fee to Solana treasury');
      treasuryTxHash = await transferFeeToTreasurySolana({
        fromAddress,
        amount: platformFee,
        asset,
        userId,
      });

      logger.info({
        treasuryTxHash,
        platformFee,
        asset,
        chain: 'solana',
      }, '✅ Platform fee transferred to Solana treasury');
    } else if (chainLower === 'base' && PLATFORM_TREASURY_ADDRESS_BASE) {
      logger.info({ treasury: PLATFORM_TREASURY_ADDRESS_BASE }, '📤 Attempting to transfer fee to Base treasury');
      treasuryTxHash = await transferFeeToTreasuryEVM({
        fromAddress,
        amount: platformFee,
        asset,
        userId,
        chain: 'base',
        rpcUrl: BASE_RPC_URL,
        treasuryAddress: PLATFORM_TREASURY_ADDRESS_BASE,
      });

      logger.info({
        treasuryTxHash,
        platformFee,
        asset,
        chain: 'base',
      }, '✅ Platform fee transferred to Base treasury');
    } else if (chainLower === 'polygon' && PLATFORM_TREASURY_ADDRESS_POLYGON) {
      logger.info({ treasury: PLATFORM_TREASURY_ADDRESS_POLYGON }, '📤 Attempting to transfer fee to Polygon treasury');
      treasuryTxHash = await transferFeeToTreasuryEVM({
        fromAddress,
        amount: platformFee,
        asset,
        userId,
        chain: 'polygon',
        rpcUrl: POLYGON_RPC_URL,
        treasuryAddress: PLATFORM_TREASURY_ADDRESS_POLYGON,
      });

      logger.info({
        treasuryTxHash,
        platformFee,
        asset,
        chain: 'polygon',
      }, '✅ Platform fee transferred to Polygon treasury');
    } else {
      logger.error({
        chain,
        chainLower,
        solanaTreasuryConfigured: !!PLATFORM_TREASURY_ADDRESS_SOLANA,
        baseTreasuryConfigured: !!PLATFORM_TREASURY_ADDRESS_BASE,
        polygonTreasuryConfigured: !!PLATFORM_TREASURY_ADDRESS_POLYGON,
      }, '❌ PLATFORM FEE NOT COLLECTED - Treasury not configured for this chain! Check environment variables.');
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
      errorStack: error.stack,
      userId,
      cryptoAmount,
      asset,
      chain,
      fromAddress,
    }, '❌ CRITICAL: Failed to collect platform fee - FEE WILL NOT BE COLLECTED!');

    // Return original amount if fee collection fails
    // This ensures the offramp can still proceed, but we lose the fee
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
async function transferFeeToTreasurySolana(params: {
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
    .eq('network', 'solana')
    .eq('asset_symbol', asset.toUpperCase())
    .single();

  if (error || !depositAddress) {
    logger.error({
      error: error?.message,
      fromAddress,
      userId,
      asset,
    }, '❌ Failed to find deposit address for fee collection');
    throw new Error('Deposit address not found');
  }

  // Decrypt private key
  const privateKeyArray = JSON.parse(decrypt(depositAddress.private_key_encrypted));
  const fromWallet = Keypair.fromSecretKey(Uint8Array.from(privateKeyArray));

  const fromPubkey = fromWallet.publicKey;
  const toPubkey = new PublicKey(PLATFORM_TREASURY_ADDRESS_SOLANA!);

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

  // Check if treasury token account exists
  let treasuryAccountExists = false;
  try {
    await getAccount(connection, toTokenAccount);
    treasuryAccountExists = true;
  } catch {
    logger.info({
      treasury: toPubkey.toBase58(),
      asset,
    }, '📝 Treasury token account does not exist - will create it');
  }

  // Convert amount to token units (6 decimals for USDC/USDT)
  const decimals = 6;
  const amountInTokenUnits = BigInt(Math.floor(amount * Math.pow(10, decimals)));

  logger.info({
    from: fromPubkey.toBase58(),
    to: toPubkey.toBase58(),
    amount,
    amountInTokenUnits: amountInTokenUnits.toString(),
    asset,
    treasuryAccountExists,
  }, '🔄 Transferring platform fee to treasury');

  // Use gas sponsor wallet to pay for transaction fees
  const { gasSponsorService } = await import('./gas-sponsor/index.js');
  const gasSponsorWallet = await gasSponsorService.getGasSponsorWallet();

  if (!gasSponsorWallet) {
    logger.error('Gas sponsor wallet not available for platform fee collection');
    throw new Error('Gas sponsorship not available. Cannot collect platform fee without SOL.');
  }

  // Create transaction
  const transaction = new Transaction();

  // Add instruction to create treasury token account if it doesn't exist (gas sponsor pays)
  if (!treasuryAccountExists) {
    logger.info({
      payer: gasSponsorWallet.publicKey.toBase58(),
      ata: toTokenAccount.toBase58(),
      owner: toPubkey.toBase58(),
      mint: mintPubkey.toBase58(),
    }, '📝 Adding instruction to create treasury token account');

    transaction.add(
      createAssociatedTokenAccountInstruction(
        gasSponsorWallet.publicKey,  // payer (gas sponsor pays for rent)
        toTokenAccount,              // ata to create
        toPubkey,                    // owner (treasury wallet)
        mintPubkey                   // token mint
      )
    );
  }

  // Add transfer instruction
  transaction.add(
    createTransferInstruction(
      fromTokenAccount,
      toTokenAccount,
      fromPubkey,
      amountInTokenUnits,
      [],
      TOKEN_PROGRAM_ID
    )
  );

  // Set gas sponsor as fee payer
  transaction.feePayer = gasSponsorWallet.publicKey;

  // Get recent blockhash
  const { blockhash } = await connection.getLatestBlockhash();
  transaction.recentBlockhash = blockhash;

  // Both wallets need to sign:
  // - fromWallet: signs the token transfer (owner of tokens)
  // - gasSponsorWallet: signs as fee payer (pays gas)
  transaction.sign(fromWallet, gasSponsorWallet);

  // Send and confirm transaction
  const signature = await sendAndConfirmTransaction(
    connection,
    transaction,
    [fromWallet, gasSponsorWallet],
    {
      commitment: 'confirmed',
      maxRetries: 3,
    }
  );

  logger.info({
    signature,
    amount,
    asset,
    feePayer: gasSponsorWallet.publicKey.toBase58(),
  }, '✅ Platform fee transferred (gas sponsored)');

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

/**
 * Get gas sponsor private key for a specific chain
 */
function getGasSponsorPrivateKey(chain: string): string | undefined {
  switch (chain.toLowerCase()) {
    case 'base':
      return process.env.BASE_GAS_SPONSOR_PRIVATE_KEY;
    case 'polygon':
      return process.env.POLYGON_GAS_SPONSOR_PRIVATE_KEY;
    default:
      return undefined;
  }
}

/**
 * Transfer platform fee to treasury wallet on EVM chains (Base, Polygon)
 * Uses gas sponsorship - gas sponsor wallet funds user wallet with gas, then user wallet sends fee
 */
async function transferFeeToTreasuryEVM(params: {
  fromAddress: string;
  amount: number;
  asset: string;
  userId: string;
  chain: 'base' | 'polygon';
  rpcUrl: string;
  treasuryAddress: string;
}): Promise<string> {
  const { fromAddress, amount, asset, userId, chain, rpcUrl, treasuryAddress } = params;

  logger.info({
    fromAddress,
    amount,
    asset,
    chain,
    treasuryAddress,
  }, `🔄 Transferring platform fee to ${chain} treasury`);

  // Get the encrypted private key from database
  const { data: depositAddress, error } = await supabaseAdmin
    .from('deposit_addresses')
    .select('private_key_encrypted')
    .eq('address', fromAddress)
    .eq('user_id', userId)
    .eq('network', chain)
    .eq('asset_symbol', asset.toUpperCase())
    .single();

  if (error || !depositAddress) {
    logger.error({
      error: error?.message,
      fromAddress,
      userId,
      asset,
      chain,
    }, `❌ Failed to find ${chain} deposit address for fee collection`);
    throw new Error('Deposit address not found');
  }

  // Decrypt private key
  const privateKey = decrypt(depositAddress.private_key_encrypted);

  // Connect to EVM network
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const userWallet = new ethers.Wallet(privateKey, provider);

  // Get gas sponsor wallet (pays for gas by sending ETH/MATIC to user wallet first)
  const gasSponsorPrivateKey = getGasSponsorPrivateKey(chain);
  if (!gasSponsorPrivateKey) {
    throw new Error(`Gas sponsor private key not configured for chain: ${chain}. Please set ${chain.toUpperCase()}_GAS_SPONSOR_PRIVATE_KEY in environment variables.`);
  }
  const gasSponsorWallet = new ethers.Wallet(gasSponsorPrivateKey, provider);

  logger.info({
    msg: 'Platform fee transfer wallets initialized',
    chain,
    userWallet: userWallet.address,
    gasSponsorWallet: gasSponsorWallet.address,
  });

  // Get token contract address
  let tokenAddress: string;
  if (chain === 'base') {
    if (asset === 'USDC') {
      tokenAddress = process.env.BASE_USDC_CONTRACT || '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
    } else {
      throw new Error(`Unsupported asset for Base fee collection: ${asset}`);
    }
  } else if (chain === 'polygon') {
    if (asset === 'USDC') {
      tokenAddress = process.env.POLYGON_USDC_CONTRACT || '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359';
    } else if (asset === 'USDT') {
      tokenAddress = process.env.POLYGON_USDT_CONTRACT || '0xc2132D05D31c914a87C6611C10748AEb04B58e8F';
    } else {
      throw new Error(`Unsupported asset for Polygon fee collection: ${asset}`);
    }
  } else {
    throw new Error(`Unsupported chain: ${chain}`);
  }

  // ERC20 ABI for transfer function
  const erc20Abi = [
    'function transfer(address to, uint256 amount) returns (bool)',
    'function decimals() view returns (uint8)',
  ];

  const tokenContract = new ethers.Contract(tokenAddress, erc20Abi, userWallet);

  // Get token decimals
  const decimals = await tokenContract.decimals();

  // Convert amount to token units (e.g., USDC has 6 decimals)
  const amountInTokenUnits = ethers.parseUnits(amount.toString(), decimals);

  logger.info({
    amount,
    decimals,
    amountInTokenUnits: amountInTokenUnits.toString(),
    tokenAddress,
  }, `💰 Transferring ${amount} ${asset} (${amountInTokenUnits.toString()} units)`);

  // STEP 1: Check if user wallet has enough gas, if not, send gas from sponsor
  const userGasBalance = await provider.getBalance(userWallet.address);
  const gasPrice = await provider.getFeeData();
  const estimatedGas = await tokenContract.transfer.estimateGas(treasuryAddress, amountInTokenUnits);
  const maxGasCost = estimatedGas * (gasPrice.maxFeePerGas || gasPrice.gasPrice || 50000000000n);

  if (userGasBalance < maxGasCost) {
    // Add 100% buffer for gas price fluctuations
    const gasToSend = maxGasCost * 2n;

    logger.info({
      msg: 'Sending gas from gas sponsor to user wallet for platform fee transfer',
      from: gasSponsorWallet.address,
      to: userWallet.address,
      gasToSend: ethers.formatEther(gasToSend),
      chain,
    });

    const gasTx = await gasSponsorWallet.sendTransaction({
      to: userWallet.address,
      value: gasToSend,
    });

    await gasTx.wait();

    logger.info({
      msg: '✅ Gas sent to user wallet for platform fee transfer',
      txHash: gasTx.hash,
      chain,
    });
  }

  // STEP 2: Execute ERC20 transfer from user wallet to treasury
  const tx = await tokenContract.transfer(treasuryAddress, amountInTokenUnits);

  logger.info({
    txHash: tx.hash,
    from: fromAddress,
    to: treasuryAddress,
    amount,
    asset,
    chain,
    gasFundedBy: gasSponsorWallet.address,
  }, `📤 Platform fee transfer transaction sent on ${chain}`);

  // Wait for confirmation
  const receipt = await tx.wait();

  logger.info({
    txHash: receipt.hash,
    blockNumber: receipt.blockNumber,
    status: receipt.status,
    gasFundedBy: gasSponsorWallet.address,
  }, `✅ Platform fee transfer confirmed on ${chain}`);

  return receipt.hash;
}
