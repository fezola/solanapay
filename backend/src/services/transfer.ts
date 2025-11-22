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
import { env } from '../config/env.js';

const SOLANA_RPC_URL = env.SOLANA_RPC_URL;

// Token mint addresses
const SOLANA_USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
const SOLANA_USDT_MINT = 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB';

// EVM Token Addresses
const EVM_TOKEN_ADDRESSES: Record<string, Record<string, string>> = {
  base: {
    USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    USDT: '0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2',
  },
  polygon: {
    USDC: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
    USDT: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
  },
  ethereum: {
    USDC: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    USDT: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
  },
  arbitrum: {
    USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
    USDT: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
  },
  optimism: {
    USDC: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
    USDT: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58',
  },
  bsc: {
    USDC: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d',
    USDT: '0x55d398326f99059fF775485246999027B3197955',
  },
};

// EVM RPC URLs
const EVM_RPC_URLS: Record<string, string> = {
  base: env.BASE_RPC_URL,
  polygon: env.POLYGON_RPC_URL,
  ethereum: 'https://eth.llamarpc.com', // Public RPC
  arbitrum: 'https://arb1.arbitrum.io/rpc', // Public RPC
  optimism: 'https://mainnet.optimism.io', // Public RPC
  bsc: 'https://bsc-dataseed.binance.org', // Public RPC
};

interface TransferRequest {
  chain: string;
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
  chain: string;
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
  } else if (['base', 'polygon', 'ethereum', 'arbitrum', 'optimism', 'bsc'].includes(request.chain)) {
    return checkEVMBalance(request);
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
  } else if (['base', 'polygon', 'ethereum', 'arbitrum', 'optimism', 'bsc'].includes(request.chain)) {
    return transferEVM(request);
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

  // Create transaction
  const transaction = new Transaction();

  // Add instruction to create destination token account if it doesn't exist
  if (!destinationAccountExists) {
    logger.info({
      msg: 'Adding instruction to create destination token account',
      payer: gasSponsorWallet.publicKey.toBase58(),
      ata: toTokenAccount.toBase58(),
      owner: toPubkey.toBase58(),
      mint: mintPubkey.toBase58(),
    });

    transaction.add(
      createAssociatedTokenAccountInstruction(
        gasSponsorWallet.publicKey,  // payer (gas sponsor pays for rent)
        toTokenAccount,              // ata to create
        toPubkey,                    // owner of that ata (Bread wallet)
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
 * Transfer native SOL with gas sponsorship
 * Platform pays for transaction fees so users can send their full SOL balance
 */
async function transferSolNative(
  connection: Connection,
  fromWallet: Keypair,
  toPubkey: PublicKey,
  amount: number
): Promise<TransferResult> {
  const lamports = Math.floor(amount * LAMPORTS_PER_SOL);

  logger.info({
    msg: '💰 Creating SOL transfer with gas sponsorship',
    from: fromWallet.publicKey.toBase58(),
    to: toPubkey.toBase58(),
    amount,
    lamports,
  });

  // Get gas sponsor wallet to pay for transaction fees
  const gasSponsorWallet = await gasSponsorService.getGasSponsorWallet();

  if (!gasSponsorWallet) {
    logger.error('Gas sponsor wallet not available - cannot proceed with SOL transfer');
    throw new Error(
      'Gas sponsorship not available. Platform must pay gas fees for user transactions.'
    );
  }

  const transaction = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: fromWallet.publicKey,
      toPubkey,
      lamports,
    })
  );

  // Set gas sponsor as fee payer
  transaction.feePayer = gasSponsorWallet.publicKey;

  // Get recent blockhash
  const { blockhash } = await connection.getLatestBlockhash();
  transaction.recentBlockhash = blockhash;

  // Both wallets need to sign:
  // - fromWallet: signs the SOL transfer (owner of SOL)
  // - gasSponsorWallet: signs as fee payer (pays gas)
  transaction.sign(fromWallet, gasSponsorWallet);

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
    msg: '✅ SOL transfer confirmed (platform sponsored gas)',
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
 * Transfer ERC20 tokens on any EVM chain (Base, Polygon, Ethereum, etc.)
 */
async function transferEVM(request: TransferRequest): Promise<TransferResult> {
  // Get RPC URL for the chain
  const rpcUrl = EVM_RPC_URLS[request.chain];
  if (!rpcUrl) {
    throw new Error(`No RPC URL configured for chain: ${request.chain}`);
  }

  const provider = new ethers.JsonRpcProvider(rpcUrl);

  // Get the encrypted private key from database
  const { data: depositAddress, error } = await supabaseAdmin
    .from('deposit_addresses')
    .select('private_key_encrypted')
    .eq('user_id', request.userId)
    .eq('network', request.chain)
    .eq('asset_symbol', request.asset.toUpperCase())
    .single();

  if (error || !depositAddress?.private_key_encrypted) {
    logger.error({
      msg: 'Failed to get private key from database',
      error: error?.message,
      userId: request.userId,
      network: request.chain,
      asset: request.asset,
    });
    throw new Error('Deposit wallet private key not found');
  }

  // Decrypt the user's private key (owns the tokens)
  const privateKeyHex = decrypt(depositAddress.private_key_encrypted);
  const userWallet = new ethers.Wallet(privateKeyHex, provider);

  // Get treasury wallet (will pay for gas by sending ETH to user wallet first)
  const treasuryPrivateKey = getTreasuryPrivateKey(request.chain);
  if (!treasuryPrivateKey) {
    throw new Error(`Treasury private key not configured for chain: ${request.chain}`);
  }
  const treasuryWallet = new ethers.Wallet(treasuryPrivateKey, provider);

  logger.info({
    msg: 'EVM transfer wallets initialized',
    chain: request.chain,
    userWallet: userWallet.address,
    treasuryWallet: treasuryWallet.address,
    gasSponsor: 'treasury',
  });

  // ERC20 ABI for transfer function
  const erc20Abi = [
    'function transfer(address to, uint256 amount) returns (bool)',
    'function decimals() view returns (uint8)',
  ];

  // Get token address for this chain and asset
  const tokenAddress = EVM_TOKEN_ADDRESSES[request.chain]?.[request.asset.toUpperCase()];
  if (!tokenAddress) {
    throw new Error(`Unsupported asset ${request.asset} on chain ${request.chain}`);
  }

  const tokenContract = new ethers.Contract(tokenAddress, erc20Abi, userWallet);

  // Get token decimals
  const decimals = await tokenContract.decimals();

  // Round amount to token decimals to avoid "too many decimals" error
  // This handles floating point precision issues from platform fee calculations
  const roundedAmount = parseFloat(request.amount.toFixed(Number(decimals)));
  const amountInTokenUnits = ethers.parseUnits(roundedAmount.toString(), decimals);

  logger.info({
    msg: `Creating ERC20 transfer on ${request.chain}`,
    from: request.fromAddress,
    to: request.toAddress,
    amount: request.amount,
    roundedAmount,
    amountInTokenUnits: amountInTokenUnits.toString(),
    tokenAddress,
    chain: request.chain,
  });

  // STEP 1: Send ETH from treasury to user wallet for gas
  const feeData = await provider.getFeeData();
  const gasLimit = 100000n; // Standard ERC20 transfer gas limit
  const maxGasCost = (feeData.maxFeePerGas || feeData.gasPrice || 0n) * gasLimit;

  // Add 20% buffer for gas price fluctuations
  const gasToSend = (maxGasCost * 120n) / 100n;

  logger.info({
    msg: 'Sending gas from treasury to user wallet',
    from: treasuryWallet.address,
    to: userWallet.address,
    gasToSend: ethers.formatEther(gasToSend),
    chain: request.chain,
  });

  const gasTx = await treasuryWallet.sendTransaction({
    to: userWallet.address,
    value: gasToSend,
  });

  await gasTx.wait();

  logger.info({
    msg: 'Gas sent to user wallet',
    txHash: gasTx.hash,
    amount: ethers.formatEther(gasToSend),
  });

  // STEP 2: Execute ERC20 transfer from user wallet (now has gas)
  const tx = await tokenContract.transfer(request.toAddress, amountInTokenUnits, {
    gasLimit,
  });

  logger.info({
    msg: 'ERC20 transfer submitted (gas paid by user wallet, funded by treasury)',
    txHash: tx.hash,
    chain: request.chain,
    gasFundedBy: treasuryWallet.address,
  });

  // Wait for confirmation
  const receipt = await tx.wait();

  if (!receipt) {
    throw new Error('Transaction receipt is null');
  }

  logger.info({
    msg: 'ERC20 transfer confirmed',
    txHash: receipt.hash,
    blockNumber: receipt.blockNumber,
    amount: request.amount,
    asset: request.asset,
    chain: request.chain,
    gasUsed: receipt.gasUsed.toString(),
    gasFundedBy: treasuryWallet.address,
  });

  return {
    txHash: receipt.hash,
    amount: request.amount,
    asset: request.asset,
    chain: request.chain,
  };
}

/**
 * Get treasury private key for a specific chain
 */
function getTreasuryPrivateKey(chain: string): string | undefined {
  switch (chain.toLowerCase()) {
    case 'base':
      return env.BASE_TREASURY_PRIVATE_KEY;
    case 'polygon':
      return env.POLYGON_TREASURY_PRIVATE_KEY;
    default:
      return undefined;
  }
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
 * Check EVM wallet balance for a specific token (Base, Polygon, Ethereum, etc.)
 */
async function checkEVMBalance(request: BalanceCheckRequest): Promise<number> {
  // Get RPC URL for the chain
  const rpcUrl = EVM_RPC_URLS[request.chain];
  if (!rpcUrl) {
    throw new Error(`No RPC URL configured for chain: ${request.chain}`);
  }

  const provider = new ethers.JsonRpcProvider(rpcUrl);

  // ERC20 ABI for balanceOf function
  const erc20Abi = [
    'function balanceOf(address owner) view returns (uint256)',
    'function decimals() view returns (uint8)',
  ];

  // Get token address for this chain and asset
  const tokenAddress = EVM_TOKEN_ADDRESSES[request.chain]?.[request.asset.toUpperCase()];
  if (!tokenAddress) {
    throw new Error(`Unsupported asset ${request.asset} on chain ${request.chain}`);
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

