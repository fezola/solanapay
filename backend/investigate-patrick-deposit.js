/**
 * Investigate Patrick C's Missing $2 Base USDC Deposit
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
const WALLET_ADDRESS = '0xD526b36b8eb47695e56DCc84c73a6207d51dc158';

const ERC20_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
];

async function investigate() {
  console.log('\n🔍 Investigating Patrick C\'s Missing Deposit...\n');
  console.log('='.repeat(60));

  // Step 1: Find user by wallet address
  console.log('\n📋 Step 1: Finding user by wallet address...');
  const { data: depositAddress, error: addrError } = await supabase
    .from('deposit_addresses')
    .select('*, users(id, username, email)')
    .eq('address', WALLET_ADDRESS)
    .single();

  if (addrError || !depositAddress) {
    console.log('❌ Wallet address not found in database!');
    console.log('   This might not be a valid deposit address.');
    return;
  }

  console.log(`✅ Found user: ${depositAddress.users.username || depositAddress.users.email}`);
  console.log(`   User ID: ${depositAddress.users.id}`);
  console.log(`   Network: ${depositAddress.network}`);
  console.log(`   Asset: ${depositAddress.asset_symbol}`);

  const userId = depositAddress.users.id;

  // Step 2: Check on-chain balance
  console.log('\n💰 Step 2: Checking on-chain balance...');
  const provider = new ethers.JsonRpcProvider(BASE_RPC_URL);
  const usdcContract = new ethers.Contract(BASE_USDC_CONTRACT, ERC20_ABI, provider);
  
  const balance = await usdcContract.balanceOf(WALLET_ADDRESS);
  const decimals = await usdcContract.decimals();
  const balanceFormatted = ethers.formatUnits(balance, decimals);

  console.log(`   On-chain USDC balance: ${balanceFormatted} USDC`);

  if (parseFloat(balanceFormatted) > 0) {
    console.log('   ✅ Funds are in the wallet!');
  } else {
    console.log('   ⚠️  Wallet is empty - funds may have been moved');
  }

  // Step 3: Check all deposit addresses for this user
  console.log('\n📍 Step 3: Checking all deposit addresses for user...');
  const { data: allAddresses } = await supabase
    .from('deposit_addresses')
    .select('*')
    .eq('user_id', userId)
    .order('network');

  console.log(`   Found ${allAddresses?.length || 0} deposit addresses:\n`);
  for (const addr of allAddresses || []) {
    console.log(`   ${addr.network} ${addr.asset_symbol}: ${addr.address}`);
  }

  // Step 4: Check transaction history
  console.log('\n📜 Step 4: Checking transaction history...');
  const { data: transactions } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(10);

  if (!transactions || transactions.length === 0) {
    console.log('   ❌ No transactions found in database');
  } else {
    console.log(`   Found ${transactions.length} transactions:\n`);
    for (const tx of transactions) {
      console.log(`   ${tx.type} - ${tx.amount} ${tx.asset} (${tx.network})`);
      console.log(`   Status: ${tx.status}`);
      console.log(`   Date: ${new Date(tx.created_at).toLocaleString()}`);
      console.log('');
    }
  }

  // Step 5: Check payout history
  console.log('\n💸 Step 5: Checking payout history...');
  const { data: payouts } = await supabase
    .from('payouts')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (!payouts || payouts.length === 0) {
    console.log('   ✅ No payouts - funds should still be in wallet');
  } else {
    console.log(`   Found ${payouts.length} payouts:\n`);
    for (const payout of payouts) {
      console.log(`   ${payout.crypto_amount} ${payout.asset} → ₦${payout.fiat_amount}`);
      console.log(`   Status: ${payout.status}`);
      console.log(`   Date: ${new Date(payout.created_at).toLocaleString()}`);
      console.log('');
    }
  }

  // Step 6: Check Base Etherscan for incoming transactions
  console.log('\n🔗 Step 6: Check Base Etherscan for transaction history:');
  console.log(`   https://basescan.org/address/${WALLET_ADDRESS}`);
  console.log(`   https://basescan.org/token/${BASE_USDC_CONTRACT}?a=${WALLET_ADDRESS}`);

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 SUMMARY:');
  console.log('='.repeat(60));
  console.log(`User: ${depositAddress.users.username || depositAddress.users.email}`);
  console.log(`Wallet: ${WALLET_ADDRESS}`);
  console.log(`Current Balance: ${balanceFormatted} USDC`);
  console.log(`Transactions in DB: ${transactions?.length || 0}`);
  console.log(`Payouts in DB: ${payouts?.length || 0}`);
  console.log('');

  if (parseFloat(balanceFormatted) >= 2) {
    console.log('✅ FUNDS FOUND: $2 USDC is in the wallet!');
    console.log('   The user should be able to see it in the app.');
  } else if (parseFloat(balanceFormatted) > 0 && parseFloat(balanceFormatted) < 2) {
    console.log('⚠️  PARTIAL FUNDS: Less than $2 found in wallet.');
    console.log('   Some funds may have been used for offramp or fees.');
  } else {
    console.log('❌ NO FUNDS: Wallet is empty.');
    console.log('   Possible reasons:');
    console.log('   1. Funds were already off-ramped');
    console.log('   2. Deposit was sent to wrong address');
    console.log('   3. Transaction not yet confirmed on-chain');
  }
}

investigate()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });

