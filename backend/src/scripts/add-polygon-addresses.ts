/**
 * Add Polygon deposit addresses for existing users
 *
 * This script creates Polygon (USDC, USDT) deposit addresses for users who don't have them.
 * Run this after adding Polygon support to the platform.
 */

import { supabaseAdmin } from '../utils/supabase.js';
import { polygonWalletService } from '../services/wallet/polygon.js';
import { BreadService } from '../services/bread/index.js';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

// Initialize Bread service
const breadService = new BreadService({
  apiKey: env.BREAD_API_KEY!,
  baseUrl: env.BREAD_API_URL,
});

async function addPolygonAddresses() {
  try {
    console.log('🔍 Finding users without Polygon addresses...\n');

    // Get all users
    const { data: users, error: usersError } = await supabaseAdmin
      .from('users')
      .select('id, email, offramp_mode');

    if (usersError) {
      throw new Error(`Failed to fetch users: ${usersError.message}`);
    }

    if (!users || users.length === 0) {
      console.log('❌ No users found');
      return;
    }

    console.log(`📊 Found ${users.length} total users\n`);

    let processedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const user of users) {
      try {
        // Check if user already has Polygon addresses
        const { data: existingAddresses } = await supabaseAdmin
          .from('deposit_addresses')
          .select('id, asset_symbol')
          .eq('user_id', user.id)
          .eq('network', 'polygon');

        if (existingAddresses && existingAddresses.length > 0) {
          console.log(`⏭️  Skipping ${user.email} - already has Polygon addresses`);
          skippedCount++;
          continue;
        }

        console.log(`\n🔧 Processing ${user.email}...`);

        // Get the highest account index for this user
        const { data: allAddresses } = await supabaseAdmin
          .from('deposit_addresses')
          .select('derivation_path')
          .eq('user_id', user.id);

        let accountIndex = 0;
        if (allAddresses && allAddresses.length > 0) {
          // Extract account indices from derivation paths
          const indices = allAddresses
            .map(addr => {
              const match = addr.derivation_path?.match(/m\/44'\/\d+'\/(\d+)'/);
              return match ? parseInt(match[1]) : 0;
            })
            .filter(idx => !isNaN(idx));
          
          accountIndex = indices.length > 0 ? Math.max(...indices) + 1 : 0;
        }

        console.log(`   📍 Using account index: ${accountIndex}`);

        // Create Bread wallet for Polygon
        console.log('   🍞 Creating Bread Polygon wallet...');
        let breadPolygonWalletId: string | undefined;

        try {
          const breadPolygonWallet = await breadService.wallet.createWallet(
            user.id,
            'polygon',
            'basic'
          );
          breadPolygonWalletId = (breadPolygonWallet as any).wallet_id || breadPolygonWallet.id;
          console.log(`   ✅ Bread Polygon wallet created: ${breadPolygonWalletId}`);
        } catch (breadError: any) {
          console.log(`   ⚠️  Failed to create Bread wallet: ${breadError.message}`);
          console.log('   ℹ️  Continuing without Bread wallet...');
        }

        // Generate Polygon wallet
        console.log('   🔑 Generating Polygon wallet...');
        const polygonWallet = await polygonWalletService.generateWallet(user.id, accountIndex);
        console.log(`   ✅ Polygon wallet generated: ${polygonWallet.address}`);

        // Create deposit addresses for USDC and USDT
        const polygonAssets = ['USDC', 'USDT'];
        const walletType = user.offramp_mode || 'basic';

        for (const asset of polygonAssets) {
          console.log(`   💾 Creating ${asset} deposit address...`);

          const { error: insertError } = await supabaseAdmin
            .from('deposit_addresses')
            .insert({
              user_id: user.id,
              network: 'polygon',
              asset_symbol: asset,
              address: polygonWallet.address,
              derivation_path: polygonWallet.derivationPath,
              private_key_encrypted: polygonWallet.encryptedPrivateKey,
              wallet_type: walletType,
              bread_wallet_id: breadPolygonWalletId,
              bread_wallet_type: breadPolygonWalletId ? 'basic' : null,
              bread_synced_at: breadPolygonWalletId ? new Date().toISOString() : null,
            });

          if (insertError) {
            throw new Error(`Failed to insert ${asset} address: ${insertError.message}`);
          }

          console.log(`   ✅ ${asset} deposit address created`);
        }

        console.log(`✅ Successfully added Polygon addresses for ${user.email}`);
        processedCount++;

      } catch (userError: any) {
        console.error(`❌ Error processing ${user.email}: ${userError.message}`);
        errorCount++;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 Summary:');
    console.log(`   ✅ Processed: ${processedCount} users`);
    console.log(`   ⏭️  Skipped: ${skippedCount} users (already have Polygon addresses)`);
    console.log(`   ❌ Errors: ${errorCount} users`);
    console.log('='.repeat(60));

  } catch (error: any) {
    console.error('❌ Script failed:', error.message);
    process.exit(1);
  }
}

// Run the script
addPolygonAddresses()
  .then(() => {
    console.log('\n✅ Script completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });

