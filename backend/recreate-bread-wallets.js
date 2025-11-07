/**
 * Recreate Bread wallets and save the deposit addresses
 * The previous wallet IDs exist but the /wallet/{id} endpoint returns 404
 * So we'll create new wallets and save the addresses this time
 */

import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';
import 'dotenv/config';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const BREAD_API_URL = 'https://processor-prod.up.railway.app';
const BREAD_API_KEY = process.env.BREAD_API_KEY;
const USER_ID = '3a6f2eb9-4138-4f3b-9c47-3fa26cdee341';
const BREAD_IDENTITY_ID = '690cd240196a18d7bd587965';

async function createBreadWallet(chain) {
  console.log(`\n📝 Creating Bread wallet for ${chain}...`);
  
  const reference = `wallet_${BREAD_IDENTITY_ID}_${chain}_${Date.now()}`;
  
  const response = await fetch(`${BREAD_API_URL}/wallet`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-service-key': BREAD_API_KEY,
    },
    body: JSON.stringify({ reference }),
  });
  
  const data = await response.json();
  
  if (!response.ok) {
    console.error('❌ Bread API error:', data);
    throw new Error(`Failed to create Bread wallet: ${data.message}`);
  }
  
  console.log('✅ Wallet created!');
  console.log('   Wallet ID:', data.data.wallet_id);
  console.log('   SVM Address:', data.data.address.svm);
  console.log('   EVM Address:', data.data.address.evm);
  
  return data.data;
}

async function recreateWallets() {
  console.log('\n🔄 Recreating Bread wallets with saved addresses...\n');
  
  // Create Solana wallet (for USDC, USDT, SOL)
  const solanaWallet = await createBreadWallet('solana');
  
  // Create Base wallet (for USDC)
  const baseWallet = await createBreadWallet('base');
  
  console.log('\n📊 Summary:');
  console.log('\nSolana Wallet:');
  console.log('  ID:', solanaWallet.wallet_id);
  console.log('  Address:', solanaWallet.address.svm);
  console.log('\nBase Wallet:');
  console.log('  ID:', baseWallet.wallet_id);
  console.log('  Address:', baseWallet.address.evm);
  
  // Update database with new wallet IDs and addresses
  console.log('\n💾 Updating database...');
  
  // Update Solana addresses (USDC, USDT, SOL)
  const { error: solanaError } = await supabase
    .from('deposit_addresses')
    .update({
      bread_wallet_id: solanaWallet.wallet_id,
      bread_wallet_address: solanaWallet.address.svm,
      bread_synced_at: new Date().toISOString(),
    })
    .eq('user_id', USER_ID)
    .eq('network', 'solana');
  
  if (solanaError) {
    console.error('❌ Error updating Solana addresses:', solanaError);
  } else {
    console.log('✅ Updated Solana addresses');
  }
  
  // Update Base addresses (USDC)
  const { error: baseError } = await supabase
    .from('deposit_addresses')
    .update({
      bread_wallet_id: baseWallet.wallet_id,
      bread_wallet_address: baseWallet.address.evm,
      bread_synced_at: new Date().toISOString(),
    })
    .eq('user_id', USER_ID)
    .eq('network', 'base');
  
  if (baseError) {
    console.error('❌ Error updating Base addresses:', baseError);
  } else {
    console.log('✅ Updated Base addresses');
  }
  
  console.log('\n✅ Done!');
  console.log('\n📋 Next Steps:');
  console.log('1. Transfer crypto from old deposit addresses to new Bread wallet addresses');
  console.log(`   Solana: ${solanaWallet.address.svm}`);
  console.log(`   Base: ${baseWallet.address.evm}`);
  console.log('2. Try offramp again');
}

recreateWallets().catch(console.error);

