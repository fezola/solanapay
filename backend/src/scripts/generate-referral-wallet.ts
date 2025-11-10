/**
 * Generate Referral Funding Wallet
 * 
 * This script generates a new Solana wallet to be used for funding referral rewards.
 * The wallet's private key is encrypted and stored securely in the database.
 * 
 * Usage:
 *   npm run generate-referral-wallet
 */

import { Keypair } from '@solana/web3.js';
import * as bip39 from 'bip39';
import { createClient } from '@supabase/supabase-js';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Encryption key from environment (you should set this in your .env file)
const ENCRYPTION_KEY = process.env.WALLET_ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');

/**
 * Encrypt data using AES-256-GCM
 */
function encrypt(text: string, key: string): { encrypted: string; iv: string; tag: string } {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', Buffer.from(key, 'hex'), iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const tag = cipher.getAuthTag();
  
  return {
    encrypted,
    iv: iv.toString('hex'),
    tag: tag.toString('hex'),
  };
}

/**
 * Decrypt data using AES-256-GCM
 */
function decrypt(encrypted: string, key: string, iv: string, tag: string): string {
  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    Buffer.from(key, 'hex'),
    Buffer.from(iv, 'hex')
  );
  
  decipher.setAuthTag(Buffer.from(tag, 'hex'));
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

/**
 * Generate a new Solana wallet
 */
async function generateReferralWallet() {
  console.log('🔐 Generating new Solana wallet for referral funding...\n');

  // Generate mnemonic (12 words)
  const mnemonic = bip39.generateMnemonic();
  
  // Generate keypair from mnemonic
  const seed = await bip39.mnemonicToSeed(mnemonic);
  const keypair = Keypair.fromSeed(seed.slice(0, 32));
  
  const publicKey = keypair.publicKey.toBase58();
  const privateKey = Buffer.from(keypair.secretKey).toString('hex');
  
  console.log('✅ Wallet generated successfully!\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📍 PUBLIC ADDRESS (Solana):');
  console.log(`   ${publicKey}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  console.log('🔑 MNEMONIC PHRASE (12 words):');
  console.log(`   ${mnemonic}`);
  console.log('\n⚠️  IMPORTANT: Save this mnemonic phrase in a secure location!');
  console.log('   You will need it to recover the wallet if needed.\n');
  
  // Encrypt the private key
  const encryptedData = encrypt(privateKey, ENCRYPTION_KEY);
  
  // Check if encryption key was auto-generated
  if (!process.env.WALLET_ENCRYPTION_KEY) {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔐 ENCRYPTION KEY (Add this to your .env file):');
    console.log(`   WALLET_ENCRYPTION_KEY=${ENCRYPTION_KEY}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  }
  
  // Store in database
  console.log('💾 Storing wallet in database...');
  
  const { data, error } = await supabase
    .from('referral_funding_wallet')
    .insert({
      wallet_address: publicKey,
      network: 'solana',
      asset: 'USDC',
      initial_balance_usd: 0.00, // Will be updated after funding
      current_balance_usd: 0.00,
      low_balance_threshold_usd: 10.00,
      is_active: true,
      encrypted_private_key: encryptedData.encrypted,
      encryption_iv: encryptedData.iv,
      encryption_tag: encryptedData.tag,
    })
    .select()
    .single();
  
  if (error) {
    console.error('❌ Failed to store wallet in database:', error);
    process.exit(1);
  }
  
  console.log('✅ Wallet stored in database successfully!\n');
  
  // Save wallet info to file
  const walletInfo = {
    publicKey,
    mnemonic,
    encryptionKey: ENCRYPTION_KEY,
    createdAt: new Date().toISOString(),
    network: 'solana',
    asset: 'USDC',
  };
  
  const outputDir = path.join(__dirname, '../../wallet-backups');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  const filename = `referral-wallet-${Date.now()}.json`;
  const filepath = path.join(outputDir, filename);
  
  fs.writeFileSync(filepath, JSON.stringify(walletInfo, null, 2));
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('💾 Wallet backup saved to:');
  console.log(`   ${filepath}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  console.log('📋 NEXT STEPS:\n');
  console.log('1. ✅ Save the mnemonic phrase in a secure password manager');
  console.log('2. ✅ Add WALLET_ENCRYPTION_KEY to your .env file (if not already set)');
  console.log('3. 💰 Send $50 USDC to the wallet address on Solana network:');
  console.log(`      ${publicKey}`);
  console.log('4. 🔄 After funding, update the balance in database:');
  console.log('      SELECT add_funds_to_wallet(50.00);');
  console.log('5. ✅ Verify setup:');
  console.log('      SELECT * FROM check_funding_wallet_balance();\n');
  
  console.log('⚠️  SECURITY NOTES:');
  console.log('   - Keep the mnemonic phrase PRIVATE and SECURE');
  console.log('   - Keep the encryption key in .env file PRIVATE');
  console.log('   - Add wallet-backups/ to .gitignore');
  console.log('   - Never commit wallet backups to version control\n');
  
  return {
    publicKey,
    mnemonic,
  };
}

// Run the script
generateReferralWallet()
  .then(() => {
    console.log('✅ Referral wallet generation complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error generating wallet:', error);
    process.exit(1);
  });

