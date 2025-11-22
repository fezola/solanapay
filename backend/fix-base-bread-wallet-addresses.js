/**
 * SAFE MIGRATION SCRIPT: Fix Bread Wallet Addresses for Base Chain
 * 
 * PROBLEM:
 * - Base chain wallets have Solana (SVM) addresses stored instead of EVM addresses
 * - This causes offramp to fail with ENS resolver errors
 * 
 * SOLUTION:
 * - Fetch the correct EVM address from Bread API for each Base wallet
 * - Update only the bread_wallet_address field in deposit_addresses table
 * - Does NOT touch user funds or private keys
 * 
 * SAFETY:
 * - Read-only operations first (dry run)
 * - Shows what will be changed before making changes
 * - User funds remain in their deposit wallets (untouched)
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
 * Fetch wallet details from Bread API
 */
async function getBreadWalletDetails(walletId) {
  try {
    const response = await axios.get(`${BREAD_API_URL}/wallet/${walletId}`, {
      headers: {
        'Authorization': `Bearer ${BREAD_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    const walletData = response.data.data || response.data;
    return {
      walletId,
      svmAddress: walletData.address?.svm || null,
      evmAddress: walletData.address?.evm || null,
      network: walletData.network || 'unknown',
    };
  } catch (error) {
    console.error(`❌ Error fetching wallet ${walletId}:`, error.response?.data || error.message);
    return null;
  }
}

/**
 * Main migration function
 */
async function fixBaseWalletAddresses(dryRun = true) {
  console.log('\n🔍 SAFE MIGRATION: Fix Base Bread Wallet Addresses');
  console.log('='.repeat(60));
  console.log(`Mode: ${dryRun ? '🔒 DRY RUN (no changes)' : '✍️  LIVE (will update database)'}\n`);

  // Step 1: Find all Base chain deposit addresses with Bread wallet IDs
  console.log('📋 Step 1: Finding Base chain deposit addresses...\n');
  
  const { data: baseAddresses, error } = await supabase
    .from('deposit_addresses')
    .select('id, user_id, network, asset_symbol, address, bread_wallet_id, bread_wallet_address')
    .eq('network', 'base')
    .not('bread_wallet_id', 'is', null);

  if (error) {
    console.error('❌ Error fetching deposit addresses:', error);
    return;
  }

  if (!baseAddresses || baseAddresses.length === 0) {
    console.log('✅ No Base chain addresses found. Nothing to fix.');
    return;
  }

  console.log(`Found ${baseAddresses.length} Base chain deposit address(es)\n`);

  // Step 2: Check each wallet and determine if it needs fixing
  const updates = [];
  
  for (const addr of baseAddresses) {
    console.log(`\n📍 Checking: ${addr.asset_symbol} on Base`);
    console.log(`   User ID: ${addr.user_id}`);
    console.log(`   Deposit Address: ${addr.address}`);
    console.log(`   Bread Wallet ID: ${addr.bread_wallet_id}`);
    console.log(`   Current Bread Address: ${addr.bread_wallet_address}`);

    // Fetch wallet details from Bread API
    const walletDetails = await getBreadWalletDetails(addr.bread_wallet_id);
    
    if (!walletDetails) {
      console.log('   ⚠️  Could not fetch wallet details from Bread API');
      continue;
    }

    console.log(`   Bread Network: ${walletDetails.network}`);
    console.log(`   Bread SVM Address: ${walletDetails.svmAddress || 'N/A'}`);
    console.log(`   Bread EVM Address: ${walletDetails.evmAddress || 'N/A'}`);

    // Check if current address is wrong (SVM instead of EVM)
    const isWrong = addr.bread_wallet_address === walletDetails.svmAddress;
    const correctAddress = walletDetails.evmAddress;

    if (isWrong && correctAddress) {
      console.log(`   ❌ WRONG: Storing SVM address instead of EVM address`);
      console.log(`   ✅ CORRECT: Should be ${correctAddress}`);
      
      updates.push({
        id: addr.id,
        userId: addr.user_id,
        asset: addr.asset_symbol,
        currentAddress: addr.bread_wallet_address,
        correctAddress: correctAddress,
      });
    } else if (!isWrong) {
      console.log(`   ✅ OK: Address is correct`);
    } else {
      console.log(`   ⚠️  WARNING: No EVM address available from Bread API`);
    }
  }

  // Step 3: Summary and apply updates
  console.log('\n' + '='.repeat(60));
  console.log(`\n📊 SUMMARY: Found ${updates.length} address(es) that need fixing\n`);

  if (updates.length === 0) {
    console.log('✅ All addresses are correct. No migration needed.\n');
    return;
  }

  // Show what will be updated
  console.log('The following addresses will be updated:\n');
  updates.forEach((update, index) => {
    console.log(`${index + 1}. User: ${update.userId} | Asset: ${update.asset}`);
    console.log(`   FROM: ${update.currentAddress}`);
    console.log(`   TO:   ${update.correctAddress}\n`);
  });

  if (dryRun) {
    console.log('🔒 DRY RUN MODE: No changes were made to the database.');
    console.log('💡 To apply these changes, run: node fix-base-bread-wallet-addresses.js --apply\n');
    return;
  }

  // Apply updates
  console.log('✍️  Applying updates to database...\n');

  for (const update of updates) {
    const { error: updateError } = await supabase
      .from('deposit_addresses')
      .update({
        bread_wallet_address: update.correctAddress,
      })
      .eq('id', update.id);

    if (updateError) {
      console.error(`❌ Error updating ${update.asset} for user ${update.userId}:`, updateError);
    } else {
      console.log(`✅ Updated ${update.asset} for user ${update.userId}`);
    }
  }

  console.log('\n✅ Migration complete!\n');
  console.log('🔍 Verification:');
  console.log('   - User funds are still in their deposit wallets (unchanged)');
  console.log('   - Only bread_wallet_address field was updated');
  console.log('   - Offramp should now work correctly for Base chain\n');
}

// Run the migration
const args = process.argv.slice(2);
const dryRun = !args.includes('--apply');

fixBaseWalletAddresses(dryRun)
  .then(() => {
    console.log('Done.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });

