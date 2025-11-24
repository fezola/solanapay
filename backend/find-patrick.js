/**
 * Find Patrick C in the database
 */

import { createClient } from '@supabase/supabase-js';
import { ethers } from 'ethers';
import 'dotenv/config';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const BASE_RPC_URL = process.env.BASE_RPC_URL || 'https://mainnet.base.org';
const BASE_USDC_CONTRACT = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
const EXTERNAL_WALLET = '0xD526b36b8eb47695e56DCc84c73a6207d51dc158';

const ERC20_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
];

async function findPatrick() {
  console.log('\n🔍 Searching for Patrick C...\n');

  // Search by full_name containing "patrick"
  const { data: users, error } = await supabase
    .from('users')
    .select('*')
    .ilike('full_name', '%patrick%');

  if (error) {
    console.error('Error:', error);
    return;
  }

  if (!users || users.length === 0) {
    console.log('❌ No users found with name containing "patrick"');
    console.log('\nSearching for users with name containing "c"...');

    const { data: usersC } = await supabase
      .from('users')
      .select('*')
      .ilike('full_name', '%c%')
      .limit(20);

    console.log(`Found ${usersC?.length || 0} users with "c" in name`);
    for (const u of usersC || []) {
      console.log(`  - ${u.full_name || u.email} (${u.email})`);
    }
    return;
  }

  console.log(`✅ Found ${users.length} user(s):\n`);

  for (const user of users) {
    console.log('='.repeat(60));
    console.log(`👤 User: ${user.full_name || user.email}`);
    console.log(`   ID: ${user.id}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Created: ${new Date(user.created_at).toLocaleString()}`);

    // Get deposit addresses
    const { data: addresses } = await supabase
      .from('deposit_addresses')
      .select('*')
      .eq('user_id', user.id);

    console.log(`\n   📍 Deposit Addresses (${addresses?.length || 0}):`);
    if (addresses && addresses.length > 0) {
      for (const addr of addresses) {
        console.log(`      ${addr.network} ${addr.asset_symbol}: ${addr.address}`);
        
        // Check balance for Base USDC
        if (addr.network === 'base' && addr.asset_symbol === 'USDC') {
          try {
            const provider = new ethers.JsonRpcProvider(BASE_RPC_URL);
            const usdcContract = new ethers.Contract(BASE_USDC_CONTRACT, ERC20_ABI, provider);
            const balance = await usdcContract.balanceOf(addr.address);
            const decimals = await usdcContract.decimals();
            const balanceFormatted = ethers.formatUnits(balance, decimals);
            console.log(`         Balance: ${balanceFormatted} USDC`);
          } catch (e) {
            console.log(`         Balance: Error checking`);
          }
        }
      }
    } else {
      console.log('      None');
    }

    // Check transactions
    const { data: transactions } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5);

    console.log(`\n   📜 Recent Transactions (${transactions?.length || 0}):`);
    if (transactions && transactions.length > 0) {
      for (const tx of transactions) {
        console.log(`      ${tx.type} - ${tx.amount} ${tx.asset} (${tx.network}) - ${tx.status}`);
      }
    } else {
      console.log('      None');
    }

    console.log('');
  }

  // Also check if the external wallet has any USDC
  console.log('\n' + '='.repeat(60));
  console.log('🔍 Checking external wallet balance...');
  console.log(`   Wallet: ${EXTERNAL_WALLET}`);
  
  try {
    const provider = new ethers.JsonRpcProvider(BASE_RPC_URL);
    const usdcContract = new ethers.Contract(BASE_USDC_CONTRACT, ERC20_ABI, provider);
    const balance = await usdcContract.balanceOf(EXTERNAL_WALLET);
    const decimals = await usdcContract.decimals();
    const balanceFormatted = ethers.formatUnits(balance, decimals);
    console.log(`   Balance: ${balanceFormatted} USDC`);
    
    if (parseFloat(balanceFormatted) > 0) {
      console.log('\n⚠️  IMPORTANT: This wallet has USDC but is NOT in our database!');
      console.log('   This means the user sent funds to the wrong address.');
      console.log('   They may have used a personal wallet instead of the deposit address.');
    }
  } catch (e) {
    console.log(`   Error checking balance: ${e.message}`);
  }

  console.log('\n🔗 Check on BaseScan:');
  console.log(`   https://basescan.org/address/${EXTERNAL_WALLET}`);
}

findPatrick()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });

