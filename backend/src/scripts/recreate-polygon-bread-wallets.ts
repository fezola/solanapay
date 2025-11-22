/**
 * Recreate Polygon Bread Wallets
 * 
 * This script creates new Bread wallets for Polygon and updates deposit_addresses
 */

import { supabaseAdmin } from '../utils/supabase.js';
import { env } from '../config/env.js';
import { BreadService } from '../services/bread/index.js';

// Initialize Bread service
const breadService = new BreadService({
  apiKey: env.BREAD_API_KEY!,
  baseUrl: env.BREAD_API_URL,
});

async function recreatePolygonBreadWallets() {
  console.log('🔍 Finding users with Polygon addresses...\n');

  // Find all unique users with Polygon deposit addresses
  const { data: addresses, error } = await supabaseAdmin
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
  const userGroups: Record<string, typeof addresses> = {};
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
      const newWallet = await breadService.wallet.createWallet(
        userId, // Use userId as reference (no KYC required)
        'polygon',
        'basic' // Manual offramp mode
      );
      
      const walletId = (newWallet as any).wallet_id || newWallet.id;
      const evmAddress = (newWallet.address as any)?.evm || newWallet.address;
      
      console.log(`   ✅ New Bread Wallet Created:`);
      console.log(`      Wallet ID: ${walletId}`);
      console.log(`      EVM Address: ${evmAddress}`);

      // Update all Polygon addresses for this user
      const { error: updateError } = await supabaseAdmin
        .from('deposit_addresses')
        .update({
          bread_wallet_id: walletId,
          bread_wallet_address: evmAddress,
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
    } catch (error: any) {
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

