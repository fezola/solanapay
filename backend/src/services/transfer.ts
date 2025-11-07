import {
  Connection,
  PublicKey,
  Transaction,
  SystemProgram,
  sendAndConfirmTransaction,
  Keypair,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js';
import {
  getAssociatedTokenAddress,
  createTransferInstruction,
  TOKEN_PROGRAM_ID,
  getAccount,
} from '@solana/spl-token';
import { ethers } from 'ethers';
import { logger } from '../utils/logger.js';
import { supabaseAdmin } from '../utils/supabase.js';
import { decrypt } from '../utils/encryption.js';

const SOLANA_RPC_URL = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
const BASE_RPC_URL = process.env.BASE_RPC_URL || 'https://mainnet.base.org';

// Token mint addresses
const SOLANA_USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
const SOLANA_USDT_MINT = 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB';
const BASE_USDC_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';

interface TransferRequest {
  chain: 'solana' | 'base';
  asset: string;
  amount: number;
  fromAddress: string;
  toAddress: string;
  userId: string;
}

interface TransferResult {
  txHash: string;
  amount: number;
  asset: string;
  chain: string;
}

/**
 * Transfer crypto from SolPay deposit wallet to Bread wallet
 */
export async function transferToBreadWallet(
  request: TransferRequest
): Promise<TransferResult> {
  logger.info({
    msg: 'Starting transfer to Bread wallet',
    chain: request.chain,
    asset: request.asset,
    amount: request.amount,
    from: request.fromAddress,
    to: request.toAddress,
  });

  if (request.chain === 'solana') {
    return transferSolana(request);
  } else if (request.chain === 'base') {
    return transferBase(request);
  } else {
    throw new Error(`Unsupported chain: ${request.chain}`);
  }
}

/**
 * Transfer SPL tokens on Solana
 */
async function transferSolana(request: TransferRequest): Promise<TransferResult> {
  const connection = new Connection(SOLANA_RPC_URL, 'confirmed');

  // Get the encrypted private key from database
  const { data: depositAddress, error } = await supabaseAdmin
    .from('deposit_addresses')
    .select('encrypted_private_key')
    .eq('user_id', request.userId)
    .eq('network', 'solana')
    .single();

  if (error || !depositAddress?.encrypted_private_key) {
    throw new Error('Deposit wallet private key not found');
  }

  // Decrypt the private key
  const privateKeyHex = decrypt(depositAddress.encrypted_private_key);
  const privateKeyBytes = Buffer.from(privateKeyHex, 'hex');
  const fromWallet = Keypair.fromSecretKey(privateKeyBytes);

  const fromPubkey = new PublicKey(request.fromAddress);
  const toPubkey = new PublicKey(request.toAddress);

  // Determine token mint based on asset
  let mintAddress: string;
  if (request.asset.toUpperCase() === 'USDC') {
    mintAddress = SOLANA_USDC_MINT;
  } else if (request.asset.toUpperCase() === 'USDT') {
    mintAddress = SOLANA_USDT_MINT;
  } else if (request.asset.toUpperCase() === 'SOL') {
    // Transfer native SOL
    return transferSolNative(connection, fromWallet, toPubkey, request.amount);
  } else {
    throw new Error(`Unsupported asset: ${request.asset}`);
  }

  const mintPubkey = new PublicKey(mintAddress);

  // Get token accounts
  const fromTokenAccount = await getAssociatedTokenAddress(
    mintPubkey,
    fromPubkey
  );

  const toTokenAccount = await getAssociatedTokenAddress(
    mintPubkey,
    toPubkey
  );

  // Check if destination token account exists
  try {
    await getAccount(connection, toTokenAccount);
    logger.info({ msg: 'Destination token account exists', toTokenAccount: toTokenAccount.toBase58() });
  } catch (error) {
    throw new Error(
      `Destination token account does not exist for ${request.toAddress}. ` +
      `Bread wallet may not be initialized for ${request.asset}.`
    );
  }

  // Convert amount to token units (USDC/USDT have 6 decimals)
  const decimals = 6;
  const amountInTokenUnits = Math.floor(request.amount * Math.pow(10, decimals));

  logger.info({
    msg: 'Creating SPL token transfer',
    from: fromTokenAccount.toBase58(),
    to: toTokenAccount.toBase58(),
    amount: request.amount,
    amountInTokenUnits,
  });

  // Create transfer instruction
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

  logger.info({
    msg: 'SPL token transfer confirmed',
    signature,
    amount: request.amount,
    asset: request.asset,
  });

  return {
    txHash: signature,
    amount: request.amount,
    asset: request.asset,
    chain: 'solana',
  };
}

/**
 * Transfer native SOL
 */
async function transferSolNative(
  connection: Connection,
  fromWallet: Keypair,
  toPubkey: PublicKey,
  amount: number
): Promise<TransferResult> {
  const lamports = Math.floor(amount * LAMPORTS_PER_SOL);

  logger.info({
    msg: 'Creating SOL transfer',
    from: fromWallet.publicKey.toBase58(),
    to: toPubkey.toBase58(),
    amount,
    lamports,
  });

  const transaction = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: fromWallet.publicKey,
      toPubkey,
      lamports,
    })
  );

  const signature = await sendAndConfirmTransaction(
    connection,
    transaction,
    [fromWallet],
    {
      commitment: 'confirmed',
      maxRetries: 3,
    }
  );

  logger.info({
    msg: 'SOL transfer confirmed',
    signature,
    amount,
  });

  return {
    txHash: signature,
    amount,
    asset: 'SOL',
    chain: 'solana',
  };
}

/**
 * Transfer ERC20 tokens on Base
 */
async function transferBase(request: TransferRequest): Promise<TransferResult> {
  const provider = new ethers.JsonRpcProvider(BASE_RPC_URL);

  // Get the encrypted private key from database
  const { data: depositAddress, error } = await supabaseAdmin
    .from('deposit_addresses')
    .select('encrypted_private_key')
    .eq('user_id', request.userId)
    .eq('network', 'base')
    .single();

  if (error || !depositAddress?.encrypted_private_key) {
    throw new Error('Deposit wallet private key not found');
  }

  // Decrypt the private key
  const privateKeyHex = decrypt(depositAddress.encrypted_private_key);
  const wallet = new ethers.Wallet(privateKeyHex, provider);

  // ERC20 ABI for transfer function
  const erc20Abi = [
    'function transfer(address to, uint256 amount) returns (bool)',
    'function decimals() view returns (uint8)',
  ];

  // Determine token address based on asset
  let tokenAddress: string;
  if (request.asset.toUpperCase() === 'USDC') {
    tokenAddress = BASE_USDC_ADDRESS;
  } else {
    throw new Error(`Unsupported asset on Base: ${request.asset}`);
  }

  const tokenContract = new ethers.Contract(tokenAddress, erc20Abi, wallet);

  // Get token decimals
  const decimals = await tokenContract.decimals();
  const amountInTokenUnits = ethers.parseUnits(request.amount.toString(), decimals);

  logger.info({
    msg: 'Creating ERC20 transfer on Base',
    from: request.fromAddress,
    to: request.toAddress,
    amount: request.amount,
    amountInTokenUnits: amountInTokenUnits.toString(),
    tokenAddress,
  });

  // Execute transfer
  const tx = await tokenContract.transfer(request.toAddress, amountInTokenUnits);

  logger.info({
    msg: 'ERC20 transfer submitted',
    txHash: tx.hash,
  });

  // Wait for confirmation
  const receipt = await tx.wait();

  logger.info({
    msg: 'ERC20 transfer confirmed',
    txHash: receipt.hash,
    blockNumber: receipt.blockNumber,
    amount: request.amount,
    asset: request.asset,
  });

  return {
    txHash: receipt.hash,
    amount: request.amount,
    asset: request.asset,
    chain: 'base',
  };
}

