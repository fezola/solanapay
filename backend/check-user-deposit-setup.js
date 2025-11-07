import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkUserSetup() {
  const userId = '3a6f2eb9-4138-4f3b-9c47-3fa26cdee341';
  
  console.log('\n🔍 Checking user deposit setup...\n');
  
  // Get deposit addresses
  const { data: addresses } = await supabase
    .from('deposit_addresses')
    .select('*')
    .eq('user_id', userId);
  
  console.log('📍 Deposit Addresses:');
  for (const addr of addresses || []) {
    console.log(`\n  ${addr.network} ${addr.asset_symbol}:`);
    console.log(`    Address shown to user: ${addr.address}`);
    console.log(`    Bread Wallet ID: ${addr.bread_wallet_id || 'NOT SET'}`);
  }
  
  // Get deposits
  const { data: deposits } = await supabase
    .from('onchain_deposits')
    .select('*')
    .eq('user_id', userId);
  
  console.log('\n\n💰 Onchain Deposits:');
  for (const dep of deposits || []) {
    console.log(`\n  ${dep.chain} ${dep.asset}:`);
    console.log(`    Amount: ${dep.amount}`);
    console.log(`    Status: ${dep.status}`);
    console.log(`    To Address: ${dep.to_address}`);
    console.log(`    TX: ${dep.tx_hash}`);
  }
  
  console.log('\n\n📊 Summary:');
  console.log(`  Total deposit addresses: ${addresses?.length || 0}`);
  console.log(`  Total deposits: ${deposits?.length || 0}`);
  console.log(`  Deposits with Bread wallet ID: ${addresses?.filter(a => a.bread_wallet_id).length || 0}`);
  
  const totalBalance = deposits
    ?.filter(d => d.status === 'confirmed')
    .reduce((sum, d) => sum + parseFloat(d.amount), 0) || 0;
  
  console.log(`  Total confirmed balance: ${totalBalance} USDC`);
  
  console.log('\n✅ Done!\n');
}

checkUserSetup();

