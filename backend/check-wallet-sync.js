import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const USER_ID = '3a6f2eb9-4138-4f3b-9c47-3fa26cdee341';

async function checkWalletSync() {
  const { data, error } = await supabase
    .from('deposit_addresses')
    .select('*')
    .eq('user_id', USER_ID)
    .order('network', { ascending: true })
    .order('asset_symbol', { ascending: true });
  
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  console.log('\n=== Deposit Addresses ===\n');
  for (const addr of data) {
    console.log(`${addr.network} ${addr.asset_symbol}:`);
    console.log(`  Address: ${addr.address}`);
    console.log(`  Bread Wallet ID: ${addr.bread_wallet_id || 'NOT SET'}`);
    console.log(`  Bread Wallet Type: ${addr.bread_wallet_type || 'NOT SET'}`);
    console.log(`  Synced At: ${addr.bread_synced_at || 'NOT SET'}`);
    console.log('');
  }
}

checkWalletSync().then(() => process.exit(0));

