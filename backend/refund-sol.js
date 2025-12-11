/**
 * Refund SOL from User Wallet to Original Sender
 * 
 * Usage: node refund-sol.js
 * 
 * This script refunds SOL from a user's deposit wallet back to the original sender.
 */

import { Connection, Keypair, PublicKey, SystemProgram, Transaction, LAMPORTS_PER_SOL, sendAndConfirmTransaction } from '@solana/web3.js';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import 'dotenv/config';

// ============= CONFIGURATION =============
const USER_EMAIL = 'adedejijoshua41@gmail.com';
const REFUND_TO_ADDRESS = 'D2guPiqN8Aqir7VDJncYBKvj4sbqiZx31xzKBZig4aJ6'; // Original sender
const AMOUNT_SOL = 0.38; // Slightly less than full balance to cover gas fees
// ==========================================

const SOLANA_RPC = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;

// Encryption constants (must match backend/src/utils/encryption.ts)
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

async function refundSOL() {
  console.log('\n🔄 SOL REFUND SCRIPT\n');
  console.log('='.repeat(60));

  // Validate config
  if (REFUND_TO_ADDRESS === 'PASTE_DESTINATION_WALLET_HERE') {
    console.error('❌ ERROR: Please set REFUND_TO_ADDRESS in the script!');
    process.exit(1);
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !ENCRYPTION_KEY) {
    console.error('❌ Missing environment variables. Check .env file.');
    process.exit(1);
  }

  // Connect to Supabase
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  // Get user
  console.log(`\n📧 Finding user: ${USER_EMAIL}`);
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('id, email, full_name')
    .eq('email', USER_EMAIL)
    .single();

  if (userError || !user) {
    console.error('❌ User not found:', userError);
    process.exit(1);
  }
  console.log(`   Found: ${user.full_name} (${user.id})`);

  // Get SOL wallet
  console.log('\n🔑 Fetching SOL wallet...');
  const { data: wallet, error: walletError } = await supabase
    .from('deposit_addresses')
    .select('*')
    .eq('user_id', user.id)
    .eq('asset_symbol', 'SOL')
    .eq('network', 'solana')
    .single();

  if (walletError || !wallet) {
    console.error('❌ Wallet not found:', walletError);
    process.exit(1);
  }
  console.log(`   Wallet: ${wallet.address}`);

  // Decrypt private key
  console.log('\n🔓 Decrypting private key...');
  const privateKeyBase58 = decrypt(wallet.private_key_encrypted);
  const privateKeyBytes = Buffer.from(privateKeyBase58, 'base64');
  const keypair = Keypair.fromSecretKey(privateKeyBytes);
  console.log(`   ✅ Decrypted successfully`);

  // Connect to Solana
  const connection = new Connection(SOLANA_RPC, 'confirmed');

  // Check balance
  const balance = await connection.getBalance(keypair.publicKey);
  const balanceSOL = balance / LAMPORTS_PER_SOL;
  console.log(`\n💰 Current balance: ${balanceSOL} SOL`);

  if (balanceSOL < AMOUNT_SOL) {
    console.error(`❌ Insufficient balance. Have ${balanceSOL}, need ${AMOUNT_SOL}`);
    process.exit(1);
  }

  // Prepare transfer
  const toPublicKey = new PublicKey(REFUND_TO_ADDRESS);
  const lamportsToSend = Math.floor(AMOUNT_SOL * LAMPORTS_PER_SOL);

  console.log(`\n📤 REFUND DETAILS:`);
  console.log(`   FROM: ${wallet.address}`);
  console.log(`   TO:   ${REFUND_TO_ADDRESS}`);
  console.log(`   AMOUNT: ${AMOUNT_SOL} SOL (~$${(AMOUNT_SOL * 170).toFixed(2)})`);

  // Create transaction
  const transaction = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: keypair.publicKey,
      toPubkey: toPublicKey,
      lamports: lamportsToSend,
    })
  );

  // Send
  console.log('\n⏳ Sending transaction...');
  try {
    const signature = await sendAndConfirmTransaction(connection, transaction, [keypair], {
      commitment: 'confirmed',
    });
    console.log('\n✅ REFUND SUCCESSFUL!');
    console.log(`   TX: ${signature}`);
    console.log(`   View: https://solscan.io/tx/${signature}`);
  } catch (error) {
    console.error('\n❌ Transaction failed:', error.message);
    process.exit(1);
  }
}

refundSOL().catch(console.error);

