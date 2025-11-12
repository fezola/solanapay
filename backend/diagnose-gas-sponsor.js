/**
 * Diagnose Gas Sponsor Wallet Issues
 * 
 * This script checks:
 * 1. If WALLET_ENCRYPTION_KEY is set
 * 2. If gas sponsor wallet exists in database
 * 3. If wallet can be decrypted
 * 4. SOL balance on-chain
 */

import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { createClient } from '@supabase/supabase-js';
import * as crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

const SOLANA_RPC_URL = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const WALLET_ENCRYPTION_KEY = process.env.WALLET_ENCRYPTION_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const connection = new Connection(SOLANA_RPC_URL, 'confirmed');

/**
 * Decrypt data using AES-256-GCM
 */
function decrypt(encrypted, key, iv, tag) {
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

async function diagnose() {
  console.log('\n🔍 Diagnosing Gas Sponsor Wallet...\n');
  console.log('='.repeat(60));

  // Step 1: Check environment variable
  console.log('\n1️⃣  Checking WALLET_ENCRYPTION_KEY...');
  if (!WALLET_ENCRYPTION_KEY) {
    console.log('   ❌ WALLET_ENCRYPTION_KEY is NOT set in .env');
    console.log('   🚨 This is the problem! Gas sponsorship cannot work without this key.');
    console.log('\n   💡 Solution:');
    console.log('      Add this to your .env file:');
    console.log(`      WALLET_ENCRYPTION_KEY=${process.env.WALLET_ENCRYPTION_KEY || 'd3bd8bf5be806825fefa3077b0fa8b72ff0c49869636668189a25b8e22c7d064'}`);
    return;
  }
  console.log('   ✅ WALLET_ENCRYPTION_KEY is set');
  console.log(`      Length: ${WALLET_ENCRYPTION_KEY.length} characters`);

  // Step 2: Check database
  console.log('\n2️⃣  Checking database for gas sponsor wallet...');
  const { data: wallet, error } = await supabase
    .from('referral_funding_wallet')
    .select('*')
    .eq('is_active', true)
    .single();

  if (error || !wallet) {
    console.log('   ❌ No active gas sponsor wallet found in database');
    console.log(`      Error: ${error?.message}`);
    return;
  }

  console.log('   ✅ Gas sponsor wallet found in database');
  console.log(`      Address: ${wallet.wallet_address}`);
  console.log(`      Network: ${wallet.network}`);
  console.log(`      Created: ${wallet.created_at}`);

  // Step 3: Check encryption data
  console.log('\n3️⃣  Checking encryption data...');
  if (!wallet.encrypted_private_key || !wallet.encryption_iv || !wallet.encryption_tag) {
    console.log('   ❌ Missing encryption data in database');
    console.log(`      encrypted_private_key: ${!!wallet.encrypted_private_key}`);
    console.log(`      encryption_iv: ${!!wallet.encryption_iv}`);
    console.log(`      encryption_tag: ${!!wallet.encryption_tag}`);
    return;
  }
  console.log('   ✅ All encryption data present');

  // Step 4: Try to decrypt
  console.log('\n4️⃣  Attempting to decrypt private key...');
  try {
    const privateKeyHex = decrypt(
      wallet.encrypted_private_key,
      WALLET_ENCRYPTION_KEY,
      wallet.encryption_iv,
      wallet.encryption_tag
    );
    console.log('   ✅ Successfully decrypted private key');
    console.log(`      Private key length: ${privateKeyHex.length} characters`);
  } catch (error) {
    console.log('   ❌ Failed to decrypt private key');
    console.log(`      Error: ${error.message}`);
    console.log('\n   🚨 This means WALLET_ENCRYPTION_KEY is WRONG!');
    console.log('      The key in .env does not match the key used to encrypt the wallet.');
    return;
  }

  // Step 5: Check on-chain SOL balance
  console.log('\n5️⃣  Checking on-chain SOL balance...');
  try {
    const pubkey = new PublicKey(wallet.wallet_address);
    const balance = await connection.getBalance(pubkey);
    const solBalance = balance / LAMPORTS_PER_SOL;

    console.log(`   💰 SOL Balance: ${solBalance.toFixed(6)} SOL`);
    console.log(`      Lamports: ${balance.toLocaleString()}`);

    if (solBalance === 0) {
      console.log('\n   ❌ NO SOL FOR GAS FEES!');
      console.log('   🚨 This is the problem! The wallet has no SOL to pay for gas.');
      console.log('\n   💡 Solution:');
      console.log(`      Send SOL to: ${wallet.wallet_address}`);
      console.log('      Recommended: 0.1 SOL (~$20) - covers ~20,000 transactions');
      console.log('      Minimum: 0.01 SOL (~$2) - covers ~2,000 transactions');
    } else if (solBalance < 0.01) {
      console.log('\n   ⚠️  SOL balance is LOW!');
      console.log('      You may run out soon. Consider adding more SOL.');
    } else {
      console.log('   ✅ Sufficient SOL for gas sponsorship');
    }
  } catch (error) {
    console.log(`   ❌ Failed to check balance: ${error.message}`);
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('\n📊 DIAGNOSIS SUMMARY:\n');
  
  const issues = [];
  if (!WALLET_ENCRYPTION_KEY) issues.push('WALLET_ENCRYPTION_KEY not set');
  if (!wallet) issues.push('No gas sponsor wallet in database');
  
  if (issues.length === 0) {
    console.log('✅ Gas sponsor wallet is properly configured!');
    console.log('\n💡 If users still can\'t offramp, check:');
    console.log('   1. Backend logs for "Gas sponsor wallet not available" errors');
    console.log('   2. Ensure backend is redeployed with correct WALLET_ENCRYPTION_KEY');
    console.log('   3. Check if SOL balance is sufficient');
  } else {
    console.log('❌ Issues found:');
    issues.forEach(issue => console.log(`   - ${issue}`));
  }

  console.log('\n' + '='.repeat(60) + '\n');
}

diagnose().catch(console.error);

