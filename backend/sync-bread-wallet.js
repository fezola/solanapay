/**
 * One-time script to sync existing deposit addresses with Bread Africa wallets
 * 
 * This creates Bread wallets for users who already have deposit addresses
 * but don't have bread_wallet_id set.
 */

import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const BREAD_API_URL = process.env.BREAD_API_URL || 'https://processor-prod.up.railway.app';
const BREAD_API_KEY = process.env.BREAD_API_KEY;

async function createBreadWallet(identityId, chain, asset) {
  console.log(`Creating Bread wallet for chain=${chain}, asset=${asset}`);

  // Generate a unique reference for the wallet
  const reference = `wallet_${identityId}_${chain}_${asset}_${Date.now()}`;

  const requestBody = {
    reference,
  };

  console.log('Request body:', JSON.stringify(requestBody, null, 2));

  const response = await fetch(`${BREAD_API_URL}/wallet`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-service-key': BREAD_API_KEY,
    },
    body: JSON.stringify(requestBody),
  });

  const data = await response.json();

  if (!response.ok) {
    console.error('Bread API error:', data);
    throw new Error(`Failed to create Bread wallet: ${data.message || response.statusText}`);
  }

  console.log('Bread wallet created:', data.data);
  return data.data;
}

async function syncUserWallets(userId) {
  console.log(`\n=== Syncing wallets for user ${userId} ===`);
  
  // Get user's Bread identity ID
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('bread_identity_id, email')
    .eq('id', userId)
    .single();
  
  if (userError || !user) {
    console.error('User not found:', userError);
    return;
  }
  
  if (!user.bread_identity_id) {
    console.error('User does not have a Bread identity ID. Please complete KYC first.');
    return;
  }
  
  console.log(`User: ${user.email}`);
  console.log(`Bread Identity ID: ${user.bread_identity_id}`);
  
  // Get all deposit addresses without bread_wallet_id
  const { data: addresses, error: addressError } = await supabase
    .from('deposit_addresses')
    .select('*')
    .eq('user_id', userId)
    .is('bread_wallet_id', null);
  
  if (addressError) {
    console.error('Error fetching addresses:', addressError);
    return;
  }
  
  if (!addresses || addresses.length === 0) {
    console.log('✅ All wallets already synced with Bread!');
    return;
  }
  
  console.log(`Found ${addresses.length} addresses to sync`);
  
  // Group addresses by chain (since Bread wallets are per-chain, not per-asset)
  const chainGroups = {};
  for (const addr of addresses) {
    if (!chainGroups[addr.network]) {
      chainGroups[addr.network] = [];
    }
    chainGroups[addr.network].push(addr);
  }
  
  // Create one Bread wallet per chain
  for (const [chain, addrs] of Object.entries(chainGroups)) {
    try {
      console.log(`\nCreating Bread wallet for ${chain}...`);
      const breadWallet = await createBreadWallet(user.bread_identity_id, chain, addrs[0].asset_symbol);
      
      // Update all addresses for this chain with the same bread_wallet_id
      for (const addr of addrs) {
        const { error: updateError } = await supabase
          .from('deposit_addresses')
          .update({
            bread_wallet_id: breadWallet.wallet_id,  // Fixed: use wallet_id not id
            bread_wallet_type: 'basic',
            bread_synced_at: new Date().toISOString(),
          })
          .eq('id', addr.id);

        if (updateError) {
          console.error(`Error updating address ${addr.id}:`, updateError);
        } else {
          console.log(`✅ Synced ${chain} ${addr.asset_symbol} address with Bread wallet ${breadWallet.wallet_id}`);
        }
      }
    } catch (error) {
      console.error(`Error creating Bread wallet for ${chain}:`, error.message);
    }
  }
  
  console.log('\n✅ Wallet sync complete!');
}

// Run for the specific user
const USER_ID = '3a6f2eb9-4138-4f3b-9c47-3fa26cdee341';
syncUserWallets(USER_ID)
  .then(() => {
    console.log('\n=== Script completed ===');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  });

