/**
 * Transfer crypto from user's deposit wallet to Bread wallet
 * This is needed before executing offramps since Bread can only offramp from their own wallets
 */

import { Connection, PublicKey, Transaction, SystemProgram, Keypair } from '@solana/web3.js';
import { getAssociatedTokenAddress, createTransferInstruction, createAssociatedTokenAccountInstruction, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import 'dotenv/config';

// Decryption function (copied from backend/src/utils/encryption.ts)
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32;

function deriveKey(salt) {
  return crypto.pbkdf2Sync(
    process.env.ENCRYPTION_KEY,
    salt,
    100000,
    KEY_LENGTH,
    'sha512'
  );
}

function decrypt(ciphertext) {
  const combined = Buffer.from(ciphertext, 'base64');
  const salt = combined.subarray(0, SALT_LENGTH);
  const iv = combined.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
  const tag = combined.subarray(
    SALT_LENGTH + IV_LENGTH,
    SALT_LENGTH + IV_LENGTH + TAG_LENGTH
  );
  const encrypted = combined.subarray(SALT_LENGTH + IV_LENGTH + TAG_LENGTH);
  const key = deriveKey(salt);
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  let decrypted = decipher.update(encrypted.toString('hex'), 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const SOLANA_RPC = process.env.SOLANA_RPC_URL || 'https://mainnet.helius-rpc.com/?api-key=4418d794-039b-4530-a9c4-6f8e325faa18';
const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'; // Mainnet USDC

const BREAD_WALLET_ADDRESS_SVM = '4FarMy3oddViSn6PKXjjAcf3TkwS5Gc32hvtQnBZqtAd'; // From recreate-bread-wallets.js

async function transferToBreadWallet() {
  console.log('\n🔄 Transferring crypto to Bread wallet...\n');
  
  const userId = '3a6f2eb9-4138-4f3b-9c47-3fa26cdee341';
  
  // Get user's Solana USDC deposit address
  const { data: depositAddr } = await supabase
    .from('deposit_addresses')
    .select('*')
    .eq('user_id', userId)
    .eq('network', 'solana')
    .eq('asset_symbol', 'USDC')
    .single();
  
  if (!depositAddr) {
    console.error('❌ No Solana USDC deposit address found');
    return;
  }
  
  console.log('📍 From Address:', depositAddr.address);
  console.log('📍 To Address (Bread):', BREAD_WALLET_ADDRESS_SVM);
  console.log('📍 Bread Wallet ID:', depositAddr.bread_wallet_id);
  
  // Decrypt private key
  const privateKeyEncrypted = depositAddr.private_key_encrypted;
  const decryptedPrivateKey = decrypt(privateKeyEncrypted);
  const secretKey = Buffer.from(decryptedPrivateKey, 'base64');
  const fromKeypair = Keypair.fromSecretKey(secretKey);

  console.log('\n✅ Private key decrypted and loaded');
  
  // Connect to Solana
  const connection = new Connection(SOLANA_RPC, 'confirmed');
  
  // Get token accounts
  const fromPubkey = new PublicKey(depositAddr.address);
  const toPubkey = new PublicKey(BREAD_WALLET_ADDRESS_SVM);
  const mintPubkey = new PublicKey(USDC_MINT);
  
  const fromTokenAccount = await getAssociatedTokenAddress(mintPubkey, fromPubkey);
  const toTokenAccount = await getAssociatedTokenAddress(mintPubkey, toPubkey);
  
  console.log('\n📊 Token Accounts:');
  console.log('  From:', fromTokenAccount.toString());
  console.log('  To:', toTokenAccount.toString());
  
  // Get balance
  const balance = await connection.getTokenAccountBalance(fromTokenAccount);
  console.log('\n💰 Balance:', balance.value.uiAmount, 'USDC');
  
  if (!balance.value.uiAmount || balance.value.uiAmount === 0) {
    console.error('❌ No USDC to transfer!');
    return;
  }
  
  // Transfer amount (in smallest units - USDC has 6 decimals)
  const amount = balance.value.amount; // Transfer all

  console.log('\n🔄 Creating transfer transaction...');
  console.log('  Amount:', balance.value.uiAmount, 'USDC');

  // Check if destination token account exists
  console.log('\n🔍 Checking if destination token account exists...');
  const toAccountInfo = await connection.getAccountInfo(toTokenAccount);

  // Create transaction
  const transaction = new Transaction();

  // If destination account doesn't exist, create it first
  if (!toAccountInfo) {
    console.log('⚠️  Destination token account does not exist, creating it...');
    transaction.add(
      createAssociatedTokenAccountInstruction(
        fromPubkey, // payer
        toTokenAccount, // associated token account
        toPubkey, // owner
        mintPubkey, // mint
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      )
    );
  } else {
    console.log('✅ Destination token account exists');
  }

  // Add transfer instruction
  transaction.add(
    createTransferInstruction(
      fromTokenAccount,
      toTokenAccount,
      fromPubkey,
      BigInt(amount),
      [],
      TOKEN_PROGRAM_ID
    )
  );
  
  // Get recent blockhash
  const { blockhash } = await connection.getLatestBlockhash();
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = fromPubkey;
  
  // Sign transaction
  transaction.sign(fromKeypair);
  
  console.log('\n📤 Sending transaction...');
  
  // Send transaction
  const signature = await connection.sendRawTransaction(transaction.serialize());
  
  console.log('✅ Transaction sent!');
  console.log('📝 Signature:', signature);
  console.log('🔗 Explorer:', `https://solscan.io/tx/${signature}`);
  
  // Wait for confirmation
  console.log('\n⏳ Waiting for confirmation...');
  const confirmation = await connection.confirmTransaction(signature, 'confirmed');
  
  if (confirmation.value.err) {
    console.error('❌ Transaction failed:', confirmation.value.err);
  } else {
    console.log('✅ Transaction confirmed!');
    console.log(`\n🎉 Successfully transferred ${balance.value.uiAmount} USDC to Bread wallet!`);
  }
}

transferToBreadWallet().catch(console.error);

