/**
 * Fix users with 'offramp' type Bread wallets
 * 
 * Problem: Offramp wallets are hardcoded to ONE beneficiary, so users can't choose
 * which bank account to send money to.
 * 
 * Solution: Create new 'basic' wallets and update deposit_addresses to use them.
 */

import { supabaseAdmin } from '../utils/supabase.js';
import { BreadService } from '../services/bread/index.js';
import { env } from '../config/env.js';

// Initialize Bread service
const breadService = new BreadService({
  apiKey: env.BREAD_API_KEY!,
  baseUrl: env.BREAD_API_URL,
});

async function fixOfframpWallets() {
  console.log('🔧 Finding users with offramp-type Bread wallets...\n');

  // Get all users with offramp wallets
  const { data: offrampAddresses, error } = await supabaseAdmin
    .from('deposit_addresses')
    .select('user_id, network, bread_wallet_id, bread_wallet_type')
    .eq('bread_wallet_type', 'offramp')
    .not('bread_wallet_id', 'is', null);

  if (error) {
    console.error('❌ Error fetching offramp wallets:', error);
    return;
  }

  if (!offrampAddresses || offrampAddresses.length === 0) {
    console.log('✅ No offramp wallets found - all users are using basic wallets!');
    return;
  }

  // Group by user_id and network
  const userNetworks = new Map<string, Set<string>>();
  for (const addr of offrampAddresses) {
    if (!userNetworks.has(addr.user_id)) {
      userNetworks.set(addr.user_id, new Set());
    }
    userNetworks.get(addr.user_id)!.add(addr.network);
  }

  console.log(`Found ${userNetworks.size} users with offramp wallets\n`);

  for (const [userId, networks] of userNetworks.entries()) {
    console.log(`\n👤 Processing user: ${userId}`);
    console.log(`   Networks: ${Array.from(networks).join(', ')}`);

    // Get user's Bread identity ID
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('bread_identity_id, email')
      .eq('id', userId)
      .single();

    if (!user?.bread_identity_id) {
      console.log('   ⚠️  User has no Bread identity ID - skipping');
      continue;
    }

    console.log(`   Email: ${user.email}`);
    console.log(`   Bread Identity: ${user.bread_identity_id}`);

    // Create new basic wallets for each network
    for (const network of networks) {
      try {
        console.log(`\n   🔄 Creating new basic wallet for ${network}...`);

        const newWallet = await breadService.wallet.createWallet(
          user.bread_identity_id,
          network as any,
          'basic' // No beneficiary - user can choose at offramp time
        );

        const walletId = (newWallet as any).wallet_id || newWallet.id;
        const walletAddress = newWallet.address;

        console.log(`   ✅ Created basic wallet: ${walletId}`);
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
          .eq('user_id', userId)
          .eq('network', network);

        if (updateError) {
          console.error(`   ❌ Error updating deposit addresses:`, updateError);
        } else {
          console.log(`   ✅ Updated deposit addresses for ${network}`);
        }
      } catch (error: any) {
        console.error(`   ❌ Error creating wallet for ${network}:`, error.message);
      }
    }
  }

  console.log('\n\n✅ Migration complete!');
  console.log('Users can now select any bank account when off-ramping.\n');
}

// Run the script
fixOfframpWallets()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });

