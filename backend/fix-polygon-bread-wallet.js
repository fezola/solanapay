/**
 * Fix Polygon Bread Wallet Addresses
 * 
 * This script updates deposit_addresses table to add bread_wallet_address
 * for Polygon deposits that have bread_wallet_id but missing bread_wallet_address
 */

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const BREAD_API_URL = 'https://processor-prod.up.railway.app';
const BREAD_API_KEY = process.env.BREAD_API_KEY;

async function getBreadWalletAddress(walletId) {
  try {
    const response = await fetch(`${BREAD_API_URL}/wallet/${walletId}`, {
      headers: {
        'x-api-key': BREAD_API_KEY,
      },
    });

    if (!response.ok) {
      throw new Error(`Bread API error: ${response.status}`);
    }

    const data = await response.json();
    
    // Extract EVM address from Bread wallet response
    const evmAddress = data.data?.address?.evm || data.data?.address;
    
    return evmAddress;
  } catch (error) {
    console.error(`Failed to get wallet ${walletId}:`, error.message);
    return null;
  }
}

async function fixPolygonBreadWallets() {
  console.log('🔍 Finding Polygon addresses with missing bread_wallet_address...\n');

  // Find all Polygon deposit addresses that have bread_wallet_id but no bread_wallet_address
  const { data: addresses, error } = await supabase
    .from('deposit_addresses')
    .select('*')
    .eq('network', 'polygon')
    .not('bread_wallet_id', 'is', null)
    .is('bread_wallet_address', null);

  if (error) {
    console.error('❌ Error fetching addresses:', error);
    return;
  }

  if (!addresses || addresses.length === 0) {
    console.log('✅ No Polygon addresses need fixing!');
    return;
  }

  console.log(`Found ${addresses.length} Polygon addresses to fix:\n`);

  // Group by bread_wallet_id to avoid duplicate API calls
  const walletGroups = {};
  for (const addr of addresses) {
    if (!walletGroups[addr.bread_wallet_id]) {
      walletGroups[addr.bread_wallet_id] = [];
    }
    walletGroups[addr.bread_wallet_id].push(addr);
  }

  // Fix each wallet group
  for (const [walletId, addrs] of Object.entries(walletGroups)) {
    console.log(`\n📍 Wallet ID: ${walletId}`);
    console.log(`   Addresses to update: ${addrs.length}`);

    // Get the Bread wallet address from API
    const breadWalletAddress = await getBreadWalletAddress(walletId);

    if (!breadWalletAddress) {
      console.log(`   ❌ Could not get wallet address from Bread API`);
      continue;
    }

    console.log(`   ✅ Bread wallet address: ${breadWalletAddress}`);

    // Update all addresses for this wallet
    for (const addr of addrs) {
      const { error: updateError } = await supabase
        .from('deposit_addresses')
        .update({
          bread_wallet_address: breadWalletAddress,
        })
        .eq('id', addr.id);

      if (updateError) {
        console.log(`   ❌ Failed to update ${addr.asset_symbol}: ${updateError.message}`);
      } else {
        console.log(`   ✅ Updated ${addr.asset_symbol} (${addr.address})`);
      }
    }
  }

  console.log('\n✅ Fix complete!');
}

// Run the fix
fixPolygonBreadWallets()
  .then(() => {
    console.log('\n=== Script completed ===');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  });

