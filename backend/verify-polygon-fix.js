/**
 * Verify Polygon Bread Wallet Fix
 */

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const USER_ID = '3a6f2eb9-4138-4f3b-9c47-3fa26cdee341'; // The user who was trying to offramp

async function verifyFix() {
  console.log(`\n🔍 Checking Polygon addresses for user ${USER_ID}...\n`);

  const { data: addresses, error } = await supabase
    .from('deposit_addresses')
    .select('*')
    .eq('user_id', USER_ID)
    .eq('network', 'polygon');

  if (error) {
    console.error('❌ Error:', error);
    return;
  }

  console.log(`Found ${addresses.length} Polygon addresses:\n`);

  for (const addr of addresses) {
    console.log(`${addr.asset_symbol}:`);
    console.log(`  User Wallet: ${addr.address}`);
    console.log(`  Bread Wallet ID: ${addr.bread_wallet_id || '❌ NULL'}`);
    console.log(`  Bread Wallet Address: ${addr.bread_wallet_address || '❌ NULL'}`);
    console.log(`  Bread Wallet Type: ${addr.bread_wallet_type || '❌ NULL'}`);
    console.log(`  Synced At: ${addr.bread_synced_at || '❌ NULL'}`);
    console.log('');
  }

  // Check if all addresses have bread_wallet_address
  const allValid = addresses.every(addr => addr.bread_wallet_address);

  if (allValid) {
    console.log('✅ All Polygon addresses have valid Bread wallet addresses!');
    console.log('✅ User can now offramp Polygon USDT/USDC!');
  } else {
    console.log('❌ Some addresses still missing Bread wallet addresses');
  }
}

verifyFix()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });

