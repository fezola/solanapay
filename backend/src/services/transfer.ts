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
  createAssociatedTokenAccountInstruction,
  TOKEN_PROGRAM_ID,
  getAccount,
} from '@solana/spl-token';
import { ethers } from 'ethers';
import { logger } from '../utils/logger.js';
import { supabaseAdmin } from '../utils/supabase.js';
import { decrypt } from '../utils/encryption.js';
import { gasSponsorService } from './gas-sponsor/index.js';

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

interface BalanceCheckRequest {
  chain: 'solana' | 'base';
  asset: string;
  walletAddress: string;
}

/**
 * Check Bread wallet balance
 */
export async function checkBreadWalletBalance(
  request: BalanceCheckRequest
): Promise<number> {
  logger.info({
    msg: 'Checking Bread wallet balance',
    chain: request.chain,
    asset: request.asset,
    walletAddress: request.walletAddress,
  });

  if (request.chain === 'solana') {
    return checkSolanaBalance(request);
  } else if (request.chain === 'base') {
    return checkBaseBalance(request);
  } else {
    throw new Error(`Unsupported chain: ${request.chain}`);
  }
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
    .select('private_key_encrypted')
    .eq('user_id', request.userId)
    .eq('network', 'solana')
    .eq('asset_symbol', request.asset.toUpperCase())
    .single();

  if (error || !depositAddress?.private_key_encrypted) {
    logger.error({
      msg: 'Failed to get private key from database',
      error: error?.message,
      userId: request.userId,
      network: 'solana',
      asset: request.asset,
    });
    throw new Error('Deposit wallet private key not found');
  }

  // Decrypt the private key (stored as base64)
  const privateKeyBase64 = decrypt(depositAddress.private_key_encrypted);
  const privateKeyBytes = Buffer.from(privateKeyBase64, 'base64');
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

  // Check source token account balance
  let fromAccountInfo;
  try {
    fromAccountInfo = await getAccount(connection, fromTokenAccount);
    logger.info({
      msg: 'Source token account info',
      tokenAccount: fromTokenAccount.toBase58(),
      balance: fromAccountInfo.amount.toString(),
      owner: fromAccountInfo.owner.toBase58(),
    });
  } catch (error) {
    throw new Error(
      `Source token account does not exist for ${request.fromAddress}. ` +
      `Wallet may not have any ${request.asset}.`
    );
  }

  // Check if destination token account exists, create if it doesn't
  let destinationAccountExists = false;
  try {
    await getAccount(connection, toTokenAccount);
    destinationAccountExists = true;
    logger.info({ msg: 'Destination token account exists', toTokenAccount: toTokenAccount.toBase58() });
  } catch (error) {
    logger.warn({
      msg: 'Destination token account does not exist, will create it',
      toTokenAccount: toTokenAccount.toBase58(),
      toAddress: request.toAddress,
      asset: request.asset,
    });
  }

  // Convert amount to token units (USDC/USDT have 6 decimals)
  const decimals = 6;
  const amountInTokenUnits = Math.floor(request.amount * Math.pow(10, decimals));

  // Check if source has enough balance
  if (BigInt(fromAccountInfo.amount) < BigInt(amountInTokenUnits)) {
    throw new Error(
      `Insufficient ${request.asset} balance. ` +
      `Available: ${Number(fromAccountInfo.amount) / Math.pow(10, decimals)} ${request.asset}, ` +
      `Requested: ${request.amount} ${request.asset}`
    );
  }

  logger.info({
    msg: 'Creating SPL token transfer',
    from: fromTokenAccount.toBase58(),
    to: toTokenAccount.toBase58(),
    amount: request.amount,
    amountInTokenUnits,
    availableBalance: Number(fromAccountInfo.amount) / Math.pow(10, decimals),
    willCreateDestinationAccount: !destinationAccountExists,
  });

  // Create transaction
  const transaction = new Transaction();

  // Add instruction to create destination token account if it doesn't exist
  if (!destinationAccountExists) {
    logger.info({
      msg: 'Adding instruction to create destination token account',
      payer: fromPubkey.toBase58(),
      ata: toTokenAccount.toBase58(),
      owner: toPubkey.toBase58(),
      mint: mintPubkey.toBase58(),
    });

    transaction.add(
      createAssociatedTokenAccountInstruction(
        fromPubkey,      // payer (must have SOL for rent)
        toTokenAccount,  // ata to create
        toPubkey,        // owner of that ata (Bread wallet)
        mintPubkey       // token mint
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

  // Get gas sponsor wallet to pay for transaction fees
  logger.info({
    msg: '💰 Using gas sponsorship for transaction',
    userWallet: fromPubkey.toBase58(),
    amount: request.amount,
    asset: request.asset,
  });

  const gasSponsorWallet = await gasSponsorService.getGasSponsorWallet();

  if (!gasSponsorWallet) {
    logger.error('Gas sponsor wallet not available - cannot proceed with transfer');
    throw new Error(
      'Gas sponsorship not available. Platform must pay gas fees for user transactions. ' +
      'Please ensure WALLET_ENCRYPTION_KEY is configured and gas sponsor wallet has sufficient SOL balance.'
    );
  }

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
    msg: '✅ SPL token transfer confirmed (platform sponsored gas)',
    signature,
    amount: request.amount,
    asset: request.asset,
    feePayer: gasSponsorWallet.publicKey.toBase58(),
  });

  // Log gas fee to database
  try {
    const txInfo = await connection.getTransaction(signature, {
      commitment: 'confirmed',
      maxSupportedTransactionVersion: 0,
    });

    if (txInfo?.meta) {
      const feeInLamports = txInfo.meta.fee;
      const feeInSOL = feeInLamports / LAMPORTS_PER_SOL;
      const feeInUSD = feeInSOL * 200; // Approximate

      await supabaseAdmin.rpc('log_gas_fee_sponsored', {
        p_user_id: request.userId,
        p_transaction_signature: signature,
        p_blockchain_network: 'solana',
        p_fee_amount_native: feeInLamports,
        p_fee_amount_usd: feeInUSD,
        p_transaction_type: 'offramp',
        p_sponsor_wallet_address: gasSponsorWallet.publicKey.toBase58(),
      });

      logger.info({
        msg: '💰 Gas fee logged',
        signature,
        feeSOL: feeInSOL,
        feeUSD: feeInUSD,
      });
    }
  } catch (error) {
    logger.error({ error }, 'Failed to log gas fee');
  }

  return {
    txHash: signature,
    amount: request.amount,
    asset: request.asset,
    chain: 'solana',
  };
}

/**
 * Transfer native SOL
 * Note: For SOL transfers, the user must pay gas from their own SOL balance
 * Gas sponsorship is not applicable for native SOL transfers
 */
async function transferSolNative(
  connection: Connection,
  fromWallet: Keypair,
  toPubkey: PublicKey,
  amount: number
): Promise<TransferResult> {
  const lamports = Math.floor(amount * LAMPORTS_PER_SOL);

  logger.info({
    msg: 'Creating SOL transfer (user pays gas from SOL balance)',
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
    .select('private_key_encrypted')
    .eq('user_id', request.userId)
    .eq('network', 'base')
    .eq('asset_symbol', request.asset.toUpperCase())
    .single();

  if (error || !depositAddress?.private_key_encrypted) {
    logger.error({
      msg: 'Failed to get private key from database',
      error: error?.message,
      userId: request.userId,
      network: 'base',
      asset: request.asset,
    });
    throw new Error('Deposit wallet private key not found');
  }

  // Decrypt the private key
  const privateKeyHex = decrypt(depositAddress.private_key_encrypted);
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

/**
 * Check Solana wallet balance for a specific token
 */
async function checkSolanaBalance(request: BalanceCheckRequest): Promise<number> {
  const connection = new Connection(SOLANA_RPC_URL, 'confirmed');
  const walletPubkey = new PublicKey(request.walletAddress);

  // Determine token mint based on asset
  let mintAddress: string;
  if (request.asset.toUpperCase() === 'USDC') {
    mintAddress = SOLANA_USDC_MINT;
  } else if (request.asset.toUpperCase() === 'USDT') {
    mintAddress = SOLANA_USDT_MINT;
  } else if (request.asset.toUpperCase() === 'SOL') {
    // Check native SOL balance
    const balance = await connection.getBalance(walletPubkey);
    const solBalance = balance / LAMPORTS_PER_SOL;
    logger.info({
      msg: 'Solana native SOL balance',
      walletAddress: request.walletAddress,
      balance: solBalance,
    });
    return solBalance;
  } else {
    throw new Error(`Unsupported asset: ${request.asset}`);
  }

  const mintPubkey = new PublicKey(mintAddress);

  // Get token account
  const tokenAccount = await getAssociatedTokenAddress(
    mintPubkey,
    walletPubkey
  );

  // Check token account balance
  try {
    const accountInfo = await getAccount(connection, tokenAccount);
    const decimals = 6; // USDC/USDT have 6 decimals
    const balance = Number(accountInfo.amount) / Math.pow(10, decimals);

    logger.info({
      msg: 'Solana token balance',
      walletAddress: request.walletAddress,
      tokenAccount: tokenAccount.toBase58(),
      asset: request.asset,
      balance,
    });

    return balance;
  } catch (error) {
    logger.warn({
      msg: 'Token account does not exist or has no balance',
      walletAddress: request.walletAddress,
      asset: request.asset,
      error: error instanceof Error ? error.message : String(error),
    });
    return 0;
  }
}

/**
 * Check Base wallet balance for a specific token
 */
async function checkBaseBalance(request: BalanceCheckRequest): Promise<number> {
  const provider = new ethers.JsonRpcProvider(BASE_RPC_URL);

  // ERC20 ABI for balanceOf function
  const erc20Abi = [
    'function balanceOf(address owner) view returns (uint256)',
    'function decimals() view returns (uint8)',
  ];

  // Determine token address based on asset
  let tokenAddress: string;
  if (request.asset.toUpperCase() === 'USDC') {
    tokenAddress = BASE_USDC_ADDRESS;
  } else {
    throw new Error(`Unsupported asset on Base: ${request.asset}`);
  }

  const tokenContract = new ethers.Contract(tokenAddress, erc20Abi, provider);

  try {
    const [balance, decimals] = await Promise.all([
      tokenContract.balanceOf(request.walletAddress),
      tokenContract.decimals(),
    ]);

    const balanceFormatted = Number(ethers.formatUnits(balance, decimals));

    logger.info({
      msg: 'Base token balance',
      walletAddress: request.walletAddress,
      asset: request.asset,
      balance: balanceFormatted,
      tokenAddress,
    });

    return balanceFormatted;
  } catch (error) {
    logger.error({
      msg: 'Failed to check Base balance',
      walletAddress: request.walletAddress,
      asset: request.asset,
      error: error instanceof Error ? error.message : String(error),
    });
    return 0;
  }
}

