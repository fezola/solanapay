/**
 * Refund USDC from SolPay deposit wallet back to source wallet
 */
import { createClient } from '@supabase/supabase-js';
import { Connection, PublicKey, Transaction, Keypair } from '@solana/web3.js';
import { getAssociatedTokenAddress, createTransferInstruction, TOKEN_PROGRAM_ID, getAccount } from '@solana/spl-token';
import * as crypto from 'crypto';
import 'dotenv/config';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
const SOLANA_RPC_URL = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const USDC_MINT = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');
const DESTINATION_WALLET = 'Ev5qto9pQt22QvWctTjV9muZt9BMRF1h4UPXBy4vEjDq';
const AMOUNT_USDC = 19.80; // Amount to refund

// Encryption settings (from backend/src/utils/encryption.ts)
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32;

function deriveKey(salt) {
  return crypto.pbkdf2Sync(ENCRYPTION_KEY, salt, 100000, KEY_LENGTH, 'sha512');
}

function decrypt(ciphertext) {
  const combined = Buffer.from(ciphertext, 'base64');
  const salt = combined.subarray(0, SALT_LENGTH);
  const iv = combined.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
  const tag = combined.subarray(SALT_LENGTH + IV_LENGTH, SALT_LENGTH + IV_LENGTH + TAG_LENGTH);
  const encrypted = combined.subarray(SALT_LENGTH + IV_LENGTH + TAG_LENGTH);
  const key = deriveKey(salt);
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  let decrypted = decipher.update(encrypted.toString('hex'), 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

async function refundUSDC() {
  console.log('🔄 Refunding USDC to source wallet...\n');
  
  const userId = '3a6f2eb9-4138-4f3b-9c47-3fa26cdee341';
  
  // Get deposit address with encrypted private key
  const { data: depositAddr, error } = await supabase
    .from('deposit_addresses')
    .select('*')
    .eq('user_id', userId)
    .eq('network', 'solana')
    .eq('asset_symbol', 'USDC')
    .single();
  
  if (error || !depositAddr) {
    console.error('❌ Failed to get deposit address:', error);
    return;
  }
  
  console.log('📍 Source (SolPay wallet):', depositAddr.address);
  console.log('📍 Destination:', DESTINATION_WALLET);
  console.log('💰 Amount:', AMOUNT_USDC, 'USDC\n');
  
  // Decrypt private key
  const privateKeyBase64 = decrypt(depositAddr.private_key_encrypted);
  const privateKeyBytes = Buffer.from(privateKeyBase64, 'base64');
  const keypair = Keypair.fromSecretKey(privateKeyBytes);
  
  // Connect to Solana
  const connection = new Connection(SOLANA_RPC_URL, 'confirmed');
  
  // Get token accounts
  const sourceWallet = new PublicKey(depositAddr.address);
  const destWallet = new PublicKey(DESTINATION_WALLET);
  
  const sourceTokenAccount = await getAssociatedTokenAddress(USDC_MINT, sourceWallet);
  const destTokenAccount = await getAssociatedTokenAddress(USDC_MINT, destWallet);
  
  // Check current balance
  const accountInfo = await getAccount(connection, sourceTokenAccount);
  const currentBalance = Number(accountInfo.amount) / 1_000_000;
  console.log('💰 Current balance:', currentBalance, 'USDC');
  
  if (currentBalance < AMOUNT_USDC) {
    console.error(`❌ Insufficient balance. Have ${currentBalance}, need ${AMOUNT_USDC}`);
    return;
  }
  
  // Create transfer instruction
  const amountInSmallestUnit = Math.floor(AMOUNT_USDC * 1_000_000);
  
  const transferIx = createTransferInstruction(
    sourceTokenAccount,
    destTokenAccount,
    sourceWallet,
    amountInSmallestUnit,
    [],
    TOKEN_PROGRAM_ID
  );
  
  // Build transaction
  const transaction = new Transaction().add(transferIx);
  transaction.feePayer = keypair.publicKey;
  transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
  
  // Sign and send
  console.log('📤 Sending transaction...');
  transaction.sign(keypair);
  
  const signature = await connection.sendRawTransaction(transaction.serialize());
  console.log('📝 Transaction sent:', signature);
  
  // Wait for confirmation
  console.log('⏳ Waiting for confirmation...');
  await connection.confirmTransaction(signature, 'confirmed');
  
  console.log('\n✅ Refund complete!');
  console.log('🔗 https://solscan.io/tx/' + signature);
}

refundUSDC().catch(console.error);

