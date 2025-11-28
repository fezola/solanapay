import { Connection, Keypair, PublicKey, SystemProgram, Transaction, LAMPORTS_PER_SOL, sendAndConfirmTransaction } from '@solana/web3.js';
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
const WALLET_ENCRYPTION_KEY = process.env.WALLET_ENCRYPTION_KEY; // Used for referral wallet

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !WALLET_ENCRYPTION_KEY) {
  console.error('❌ Missing required environment variables!');
  console.error('   SUPABASE_URL:', SUPABASE_URL ? '✅' : '❌');
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', SUPABASE_SERVICE_KEY ? '✅' : '❌');
  console.error('   WALLET_ENCRYPTION_KEY:', WALLET_ENCRYPTION_KEY ? '✅' : '❌');
  process.exit(1);
}

const PLATFORM_TREASURY = 'CB7GgQd7nYJmXiVvHRRNsMX2bUYn6Z3roBgLg2DrZdGG';
const GAS_SPONSOR = 'CmZzUSAux8ahGDrPfLEx8c3oJMKSisycMqUdx8ZSDRbW';
const AMOUNT_TO_TRANSFER = 0.1; // SOL

// Decrypt function for referral wallet (uses WALLET_ENCRYPTION_KEY)
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

async function transferSOL() {
  console.log('\n🔄 TRANSFERRING SOL FROM PLATFORM TREASURY TO GAS SPONSOR\n');
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

  // Check balances
  console.log('\n💰 Checking balances...');
  const fromBalance = await connection.getBalance(keypair.publicKey);
  const fromBalanceSOL = fromBalance / LAMPORTS_PER_SOL;
  console.log(`   Platform Treasury: ${fromBalanceSOL.toFixed(6)} SOL`);

  const toPublicKey = new PublicKey(GAS_SPONSOR);
  const toBalance = await connection.getBalance(toPublicKey);
  const toBalanceSOL = toBalance / LAMPORTS_PER_SOL;
  console.log(`   Gas Sponsor: ${toBalanceSOL.toFixed(6)} SOL`);

  if (fromBalanceSOL < AMOUNT_TO_TRANSFER) {
    console.error(`\n❌ Insufficient balance! Need ${AMOUNT_TO_TRANSFER} SOL but only have ${fromBalanceSOL.toFixed(6)} SOL`);
    process.exit(1);
  }

  // Create transfer transaction
  console.log(`\n📤 Transferring ${AMOUNT_TO_TRANSFER} SOL...`);
  console.log(`   FROM: ${PLATFORM_TREASURY}`);
  console.log(`   TO:   ${GAS_SPONSOR}`);

  const lamportsToSend = AMOUNT_TO_TRANSFER * LAMPORTS_PER_SOL;

  const transaction = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: keypair.publicKey,
      toPubkey: toPublicKey,
      lamports: lamportsToSend,
    })
  );

  // Send transaction
  try {
    const signature = await sendAndConfirmTransaction(
      connection,
      transaction,
      [keypair],
      { commitment: 'confirmed' }
    );

    console.log('\n✅ TRANSFER SUCCESSFUL!');
    console.log('   Transaction:', signature);
    console.log('   View:', `https://solscan.io/tx/${signature}`);

    // Check new balances
    console.log('\n💰 New balances:');
    const newFromBalance = await connection.getBalance(keypair.publicKey);
    const newFromBalanceSOL = newFromBalance / LAMPORTS_PER_SOL;
    console.log(`   Platform Treasury: ${newFromBalanceSOL.toFixed(6)} SOL`);

    const newToBalance = await connection.getBalance(toPublicKey);
    const newToBalanceSOL = newToBalance / LAMPORTS_PER_SOL;
    console.log(`   Gas Sponsor: ${newToBalanceSOL.toFixed(6)} SOL`);

    console.log('\n✅ Gas sponsor wallet is now funded!');
    console.log('   Solana offramps should work now.');

  } catch (error) {
    console.error('\n❌ Transfer failed:', error.message);
    if (error.logs) {
      console.error('   Logs:', error.logs);
    }
    process.exit(1);
  }
}

transferSOL();

