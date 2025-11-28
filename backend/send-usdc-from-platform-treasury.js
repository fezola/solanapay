import { Connection, Keypair, PublicKey, Transaction } from '@solana/web3.js';
import { getAssociatedTokenAddress, createTransferInstruction, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env from backend directory
dotenv.config({ path: join(__dirname, '.env') });

const SOLANA_RPC = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const WALLET_ENCRYPTION_KEY = process.env.WALLET_ENCRYPTION_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !WALLET_ENCRYPTION_KEY) {
  console.error('❌ Missing required environment variables!');
  process.exit(1);
}

const PLATFORM_TREASURY = 'CB7GgQd7nYJmXiVvHRRNsMX2bUYn6Z3roBgLg2DrZdGG';
const RECIPIENT = 'Ev5qto9pQt22QvWctTjV9muZt9BMRF1h4UPXBy4vEjDq';
const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'; // USDC on Solana
const AMOUNT_USDC = 20; // $20 USDC

// Decrypt function for referral wallet
function decrypt(encryptedData, iv, tag) {
  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    Buffer.from(WALLET_ENCRYPTION_KEY, 'hex'),
    Buffer.from(iv, 'hex')
  );
  decipher.setAuthTag(Buffer.from(tag, 'hex'));
  
  let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

async function sendUSDC() {
  console.log('\n💸 SENDING USDC FROM PLATFORM TREASURY\n');
  console.log('='.repeat(80));

  // Connect to Supabase
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  // Get encrypted private key from database
  console.log('\n📥 Fetching encrypted private key from database...');
  const { data: wallet, error } = await supabase
    .from('referral_funding_wallet')
    .select('*')
    .eq('wallet_address', PLATFORM_TREASURY)
    .single();

  if (error || !wallet) {
    console.error('❌ Failed to fetch wallet from database:', error);
    process.exit(1);
  }

  console.log('✅ Found platform treasury wallet in database');

  // Decrypt private key
  console.log('\n🔓 Decrypting private key...');
  const decryptedPrivateKeyHex = decrypt(
    wallet.encrypted_private_key,
    wallet.encryption_iv,
    wallet.encryption_tag
  );

  // Convert hex string to Uint8Array
  const privateKeyBytes = Buffer.from(decryptedPrivateKeyHex, 'hex');
  const keypair = Keypair.fromSecretKey(privateKeyBytes);

  console.log('✅ Private key decrypted successfully');
  console.log('   Address:', keypair.publicKey.toBase58());

  if (keypair.publicKey.toBase58() !== PLATFORM_TREASURY) {
    console.error('❌ Decrypted address does not match expected address!');
    process.exit(1);
  }

  // Connect to Solana
  const connection = new Connection(SOLANA_RPC, 'confirmed');

  // Get token accounts
  const usdcMint = new PublicKey(USDC_MINT);
  const fromTokenAccount = await getAssociatedTokenAddress(
    usdcMint,
    keypair.publicKey
  );
  
  const recipientPubkey = new PublicKey(RECIPIENT);
  const toTokenAccount = await getAssociatedTokenAddress(
    usdcMint,
    recipientPubkey
  );

  console.log('\n📤 Transfer Details:');
  console.log('   FROM:', PLATFORM_TREASURY);
  console.log('   TO:  ', RECIPIENT);
  console.log('   AMOUNT:', AMOUNT_USDC, 'USDC');

  // USDC has 6 decimals
  const amountInSmallestUnit = AMOUNT_USDC * 1_000_000;

  // Create transfer instruction
  const transferInstruction = createTransferInstruction(
    fromTokenAccount,
    toTokenAccount,
    keypair.publicKey,
    amountInSmallestUnit,
    [],
    TOKEN_PROGRAM_ID
  );

  // Create transaction
  const transaction = new Transaction().add(transferInstruction);

  // Get recent blockhash
  const { blockhash } = await connection.getLatestBlockhash('confirmed');
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = keypair.publicKey;

  // Sign and send transaction
  try {
    console.log('\n⏳ Sending transaction...');
    transaction.sign(keypair);
    
    const signature = await connection.sendRawTransaction(transaction.serialize(), {
      skipPreflight: false,
      preflightCommitment: 'confirmed',
    });

    console.log('   Transaction sent:', signature);
    console.log('   Waiting for confirmation...');

    await connection.confirmTransaction(signature, 'confirmed');

    console.log('\n✅ TRANSFER SUCCESSFUL!');
    console.log('   Transaction:', signature);
    console.log('   View:', `https://solscan.io/tx/${signature}`);
    console.log('\n💰 Sent $20 USDC to', RECIPIENT);

  } catch (error) {
    console.error('\n❌ Transfer failed:', error.message);
    if (error.logs) {
      console.error('   Logs:', error.logs);
    }
    process.exit(1);
  }
}

sendUSDC();

