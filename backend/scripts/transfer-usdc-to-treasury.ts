/**
 * Transfer USDC from gas sponsor wallet to new treasury wallet
 * This also creates the USDC token account on the new treasury
 */

import { Connection, Keypair, PublicKey, Transaction, sendAndConfirmTransaction } from '@solana/web3.js';
import { getAssociatedTokenAddress, createAssociatedTokenAccountInstruction, createTransferInstruction, TOKEN_PROGRAM_ID, getAccount } from '@solana/spl-token';
import { createClient } from '@supabase/supabase-js';
import * as crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

const SOLANA_RPC_URL = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
const USDC_MINT = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');

const FROM_WALLET = 'CB7GgQd7nYJmXiVvHRRNsMX2bUYn6Z3roBgLg2DrZdGG'; // Gas sponsor wallet
const TO_WALLET = 'CmZzUSAux8ahGDrPfLEx8c3oJMKSisycMqUdx8ZSDRbW';   // New treasury wallet

// Decrypt function
function decrypt(encryptedData: string, key: string, iv: string, authTag: string): string {
  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    Buffer.from(key, 'hex'),
    Buffer.from(iv, 'hex')
  );
  decipher.setAuthTag(Buffer.from(authTag, 'hex'));
  let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

async function main() {
  console.log('\n🔄 Transferring USDC from gas sponsor to new treasury...\n');

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const encryptionKey = process.env.WALLET_ENCRYPTION_KEY;

  if (!supabaseUrl || !supabaseKey || !encryptionKey) {
    throw new Error('Missing SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, or WALLET_ENCRYPTION_KEY');
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // Get gas sponsor wallet from database
  const { data, error } = await supabase
    .from('referral_funding_wallet')
    .select('encrypted_private_key, encryption_iv, encryption_tag, wallet_address')
    .eq('is_active', true)
    .single();

  if (error || !data) {
    throw new Error(`Failed to get gas sponsor wallet: ${error?.message}`);
  }

  console.log(`📤 From: ${data.wallet_address}`);
  console.log(`📥 To: ${TO_WALLET}`);

  // Decrypt private key
  const privateKeyHex = decrypt(
    data.encrypted_private_key,
    encryptionKey,
    data.encryption_iv,
    data.encryption_tag
  );

  const fromWallet = Keypair.fromSecretKey(Buffer.from(privateKeyHex, 'hex'));
  const connection = new Connection(SOLANA_RPC_URL, 'confirmed');

  const fromPubkey = fromWallet.publicKey;
  const toPubkey = new PublicKey(TO_WALLET);

  // Get token accounts
  const fromTokenAccount = await getAssociatedTokenAddress(USDC_MINT, fromPubkey);
  const toTokenAccount = await getAssociatedTokenAddress(USDC_MINT, toPubkey);

  // Check source balance
  const fromAccountInfo = await getAccount(connection, fromTokenAccount);
  const balance = Number(fromAccountInfo.amount) / 1e6;
  console.log(`💰 Source balance: ${balance} USDC`);

  // Check if destination token account exists
  let destinationExists = false;
  try {
    await getAccount(connection, toTokenAccount);
    destinationExists = true;
    console.log('✅ Destination token account exists');
  } catch {
    console.log('⚠️ Destination token account does not exist - will create it');
  }

  // Build transaction
  const transaction = new Transaction();

  // Add create ATA instruction if needed
  if (!destinationExists) {
    transaction.add(
      createAssociatedTokenAccountInstruction(
        fromPubkey,      // payer
        toTokenAccount,  // ata to create
        toPubkey,        // owner
        USDC_MINT        // mint
      )
    );
  }

  // Transfer all USDC (leave nothing behind)
  const amountToTransfer = fromAccountInfo.amount;
  console.log(`📤 Transferring ${Number(amountToTransfer) / 1e6} USDC...`);

  transaction.add(
    createTransferInstruction(
      fromTokenAccount,
      toTokenAccount,
      fromPubkey,
      amountToTransfer,
      [],
      TOKEN_PROGRAM_ID
    )
  );

  // Send transaction
  const { blockhash } = await connection.getLatestBlockhash();
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = fromPubkey;

  const signature = await sendAndConfirmTransaction(connection, transaction, [fromWallet]);

  console.log(`\n✅ Transfer complete!`);
  console.log(`📝 Transaction: https://solscan.io/tx/${signature}`);
  console.log(`\n🎉 Treasury wallet now has USDC token account and ${balance} USDC`);
}

main().catch(console.error);

