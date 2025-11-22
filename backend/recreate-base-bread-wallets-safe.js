/**
 * SAFE SCRIPT: Recreate Bread Wallets for Base Chain
 * 
 * PROBLEM:
 * - Old Bread wallet IDs don't exist in Bread's system (404 errors)
 * - Need to create new Bread wallets and update database
 * 
 * SOLUTION:
 * - Create new Bread wallets for each user's Base chain
 * - Update bread_wallet_id and bread_wallet_address in database
 * - Does NOT touch user funds or private keys
 * 
 * SAFETY:
 * - User funds remain in their deposit wallets (untouched)
 * - Only updates Bread wallet references
 * - Dry run mode by default
 */

import { createClient } from '@supabase/supabase-js';
import axios from 'axios';
import 'dotenv/config';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BREAD_API_KEY = process.env.BREAD_API_KEY;
const BREAD_API_URL = 'https://processor-prod.up.railway.app';

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !BREAD_API_KEY) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

/**
 * Create a new Bread wallet
 */
async function createBreadWallet(userId, chain = 'base') {
  try {
    const reference = `wallet_${userId}_${chain}_${Date.now()}`;
    
    const response = await axios.post(
      `${BREAD_API_URL}/wallet`,
      { reference },
      {
        headers: {
          'Authorization': `Bearer ${BREAD_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const walletData = response.data.data || response.data;
    const walletId = walletData.wallet_id || walletData.id;
    const evmAddress = walletData.address?.evm || null;
    const svmAddress = walletData.address?.svm || null;

    return {
      walletId,
      evmAddress,
      svmAddress,
      network: walletData.network || 'unknown',
    };
  } catch (error) {
    console.error(`❌ Error creating Bread wallet:`, error.response?.data || error.message);
    return null;
  }
}

/**
 * Main function
 */
async function recreateBaseWallets(dryRun = true) {
  console.log('\n🔧 SAFE SCRIPT: Recreate Bread Wallets for Base Chain');
  console.log('='.repeat(60));
  console.log(`Mode: ${dryRun ? '🔒 DRY RUN (no changes)' : '✍️  LIVE (will update database)'}\n`);

  // Step 1: Find all unique users with Base chain deposits
  console.log('📋 Step 1: Finding users with Base chain deposits...\n');
  
  const { data: baseAddresses, error } = await supabase
    .from('deposit_addresses')
    .select('user_id, network')
    .eq('network', 'base');

  if (error) {
    console.error('❌ Error fetching deposit addresses:', error);
    return;
  }

  if (!baseAddresses || baseAddresses.length === 0) {
    console.log('✅ No Base chain addresses found.');
    return;
  }

  // Get unique user IDs
  const uniqueUserIds = [...new Set(baseAddresses.map(addr => addr.user_id))];
  console.log(`Found ${uniqueUserIds.length} user(s) with Base chain deposits\n`);

  // Step 2: Create new Bread wallets for each user
  const updates = [];

  for (const userId of uniqueUserIds) {
    console.log(`\n👤 Processing user: ${userId}`);
    
    // Get current Base addresses for this user
    const { data: userAddresses } = await supabase
      .from('deposit_addresses')
      .select('id, asset_symbol, address, bread_wallet_id, bread_wallet_address')
      .eq('user_id', userId)
      .eq('network', 'base');

    if (!userAddresses || userAddresses.length === 0) continue;

    console.log(`   Found ${userAddresses.length} Base asset(s): ${userAddresses.map(a => a.asset_symbol).join(', ')}`);
    console.log(`   Deposit Address: ${userAddresses[0].address}`);
    console.log(`   Old Bread Wallet ID: ${userAddresses[0].bread_wallet_id || 'None'}`);
    console.log(`   Old Bread Address: ${userAddresses[0].bread_wallet_address || 'None'}`);

    if (dryRun) {
      console.log(`   🔒 DRY RUN: Would create new Bread wallet for Base`);
      updates.push({ userId, addressCount: userAddresses.length });
      continue;
    }

    // Create new Bread wallet
    console.log(`   🔨 Creating new Bread wallet for Base...`);
    const newWallet = await createBreadWallet(userId, 'base');

    if (!newWallet || !newWallet.walletId) {
      console.log(`   ❌ Failed to create Bread wallet`);
      continue;
    }

    console.log(`   ✅ New Bread Wallet Created:`);
    console.log(`      Wallet ID: ${newWallet.walletId}`);
    console.log(`      EVM Address: ${newWallet.evmAddress}`);
    console.log(`      Network: ${newWallet.network}`);

    // Update all Base addresses for this user
    const { error: updateError } = await supabase
      .from('deposit_addresses')
      .update({
        bread_wallet_id: newWallet.walletId,
        bread_wallet_address: newWallet.evmAddress,
        bread_wallet_type: 'basic',
        bread_synced_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .eq('network', 'base');

    if (updateError) {
      console.log(`   ❌ Error updating database:`, updateError);
    } else {
      console.log(`   ✅ Database updated for ${userAddresses.length} asset(s)`);
      updates.push({ userId, addressCount: userAddresses.length, walletId: newWallet.walletId });
    }
  }

  // Step 3: Summary
  console.log('\n' + '='.repeat(60));
  console.log(`\n📊 SUMMARY: ${updates.length} user(s) processed\n`);

  if (dryRun) {
    console.log('🔒 DRY RUN MODE: No changes were made.');
    console.log('💡 To apply these changes, run: node recreate-base-bread-wallets-safe.js --apply\n');
    console.log('⚠️  IMPORTANT: This will create NEW Bread wallets for Base chain.');
    console.log('   User funds will remain safe in their deposit wallets.\n');
    return;
  }

  if (updates.length > 0) {
    console.log('✅ Migration complete!\n');
    console.log('Updated users:');
    updates.forEach((update, index) => {
      console.log(`${index + 1}. User: ${update.userId}`);
      console.log(`   Assets updated: ${update.addressCount}`);
      console.log(`   New Bread Wallet ID: ${update.walletId}\n`);
    });

    console.log('🔍 Verification:');
    console.log('   - User funds are still in their deposit wallets (unchanged)');
    console.log('   - New Bread wallets created for Base chain');
    console.log('   - bread_wallet_id and bread_wallet_address updated');
    console.log('   - Offramp should now work correctly\n');
  } else {
    console.log('⚠️  No users were updated.\n');
  }
}

// Run the script
const args = process.argv.slice(2);
const dryRun = !args.includes('--apply');

recreateBaseWallets(dryRun)
  .then(() => {
    console.log('Done.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });

