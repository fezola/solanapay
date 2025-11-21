/**
 * Script to create missing Bread wallets for existing users
 * Run this after removing KYC requirement to ensure all users have Bread wallets
 */

import { createClient } from '@supabase/supabase-js';
import { BreadService } from '../services/bread/index.js';
import { env } from '../config/env.js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// Initialize Bread service
const breadService = new BreadService({
  apiKey: env.BREAD_API_KEY!,
  baseUrl: env.BREAD_API_URL,
});

async function createMissingBreadWallets() {
  console.log('🔍 Finding users with missing Bread wallets...\n');

  // Get all users
  const { data: users, error: usersError } = await supabaseAdmin
    .from('users')
    .select('id, email');

  if (usersError) {
    console.error('❌ Error fetching users:', usersError);
    return;
  }

  console.log(`📊 Found ${users.length} total users\n`);

  let fixed = 0;
  let skipped = 0;
  let errors = 0;

  for (const user of users) {
    console.log(`\n👤 Processing user: ${user.email} (${user.id})`);

    // Check each network for missing Bread wallets
    const networks = ['solana', 'base', 'polygon'];

    for (const network of networks) {
      // Get deposit addresses for this network
      const { data: addresses } = await supabaseAdmin
        .from('deposit_addresses')
        .select('*')
        .eq('user_id', user.id)
        .eq('network', network);

      if (!addresses || addresses.length === 0) {
        console.log(`   ⏭️  No deposit addresses for ${network} - skipping`);
        continue;
      }

      // Check if any address is missing bread_wallet_id
      const missingWallet = addresses.some(addr => !addr.bread_wallet_id);

      if (!missingWallet) {
        console.log(`   ✅ ${network}: Bread wallet already exists`);
        skipped++;
        continue;
      }

      console.log(`   🔧 ${network}: Creating Bread wallet...`);

      try {
        // Create Bread wallet (no identity required)
        const breadWallet = await breadService.wallet.createWallet(
          user.id, // Use userId as reference
          network as any,
          'basic'
        );

        const walletId = (breadWallet as any).wallet_id || breadWallet.id;
        const walletAddress = breadWallet.address;

        console.log(`   ✅ Created wallet: ${walletId}`);
        console.log(`   📍 Address: ${walletAddress}`);

        // Update all deposit_addresses for this user/network
        const { error: updateError } = await supabaseAdmin
          .from('deposit_addresses')
          .update({
            bread_wallet_id: walletId,
            bread_wallet_address: walletAddress,
            bread_wallet_type: 'basic',
            bread_synced_at: new Date().toISOString(),
          })
          .eq('user_id', user.id)
          .eq('network', network);

        if (updateError) {
          console.error(`   ❌ Error updating deposit addresses:`, updateError);
          errors++;
        } else {
          console.log(`   ✅ Updated deposit addresses for ${network}`);
          fixed++;
        }
      } catch (error: any) {
        console.error(`   ❌ Error creating Bread wallet for ${network}:`, error.message);
        errors++;
      }
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 Summary:');
  console.log(`   ✅ Wallets created: ${fixed}`);
  console.log(`   ⏭️  Skipped (already exists): ${skipped}`);
  console.log(`   ❌ Errors: ${errors}`);
  console.log('='.repeat(60));
}

// Run the script
createMissingBreadWallets()
  .then(() => {
    console.log('\n✅ Script completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });

