/**
 * Recreate Polygon Bread Wallets
 * 
 * This script creates new Bread wallets for Polygon and updates deposit_addresses
 */

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const BREAD_API_URL = 'https://processor-prod.up.railway.app';
const BREAD_API_KEY = process.env.BREAD_API_KEY;

async function createBreadWallet(userId, network) {
  try {
    const response = await fetch(`${BREAD_API_URL}/wallet`, {
      method: 'POST',
      headers: {
        'x-api-key': BREAD_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        reference: userId, // Use userId as reference (no KYC required)
        network: network,
        type: 'basic', // Manual offramp mode
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Bread API error: ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();
    
    // Extract wallet details
    const walletId = data.data?.wallet_id || data.data?.id;
    const evmAddress = data.data?.address?.evm || data.data?.address;
    
    return {
      walletId,
      evmAddress,
      network: data.data?.network,
    };
  } catch (error) {
    console.error(`Failed to create Bread wallet:`, error.message);
    throw error;
  }
}

async function recreatePolygonBreadWallets() {
  console.log('🔍 Finding users with Polygon addresses...\n');

  // Find all unique users with Polygon deposit addresses
  const { data: addresses, error } = await supabase
    .from('deposit_addresses')
    .select('user_id, network, asset_symbol, address, bread_wallet_id, bread_wallet_address')
    .eq('network', 'polygon')
    .order('user_id');

  if (error) {
    console.error('❌ Error fetching addresses:', error);
    return;
  }

  if (!addresses || addresses.length === 0) {
    console.log('✅ No Polygon addresses found!');
    return;
  }

  // Group by user_id
  const userGroups = {};
  for (const addr of addresses) {
    if (!userGroups[addr.user_id]) {
      userGroups[addr.user_id] = [];
    }
    userGroups[addr.user_id].push(addr);
  }

  console.log(`Found ${Object.keys(userGroups).length} users with Polygon addresses\n`);

  // Process each user
  for (const [userId, userAddrs] of Object.entries(userGroups)) {
    console.log(`\n👤 User: ${userId}`);
    console.log(`   Polygon addresses: ${userAddrs.length}`);
    
    // Check if they already have a valid bread_wallet_address
    const hasValidWallet = userAddrs.some(addr => addr.bread_wallet_address);
    
    if (hasValidWallet) {
      console.log(`   ✅ Already has valid Bread wallet address`);
      continue;
    }

    try {
      // Create new Bread wallet for Polygon
      console.log(`   🍞 Creating new Bread Polygon wallet...`);
      const newWallet = await createBreadWallet(userId, 'polygon');
      
      console.log(`   ✅ New Bread Wallet Created:`);
      console.log(`      Wallet ID: ${newWallet.walletId}`);
      console.log(`      EVM Address: ${newWallet.evmAddress}`);
      console.log(`      Network: ${newWallet.network}`);

      // Update all Polygon addresses for this user
      const { error: updateError } = await supabase
        .from('deposit_addresses')
        .update({
          bread_wallet_id: newWallet.walletId,
          bread_wallet_address: newWallet.evmAddress,
          bread_wallet_type: 'basic',
          bread_synced_at: new Date().toISOString(),
        })
        .eq('user_id', userId)
        .eq('network', 'polygon');

      if (updateError) {
        console.log(`   ❌ Failed to update addresses: ${updateError.message}`);
      } else {
        console.log(`   ✅ Updated ${userAddrs.length} Polygon addresses`);
      }
    } catch (error) {
      console.log(`   ❌ Failed to create wallet: ${error.message}`);
    }
  }

  console.log('\n✅ Recreation complete!');
}

// Run the script
recreatePolygonBreadWallets()
  .then(() => {
    console.log('\n=== Script completed ===');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  });

