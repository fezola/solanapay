/**
 * Test Balance API for Patrick C
 */

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const USER_ID = 'c273483b-d9e2-4832-9a2d-6eae7c10116f'; // Patrick C
const API_URL = process.env.API_URL || 'https://solanapay-xmli.onrender.com';

async function testBalanceAPI() {
  console.log('\n🔍 Testing Balance API for Patrick C...\n');

  // Step 1: Get user's auth token
  console.log('Step 1: Getting user auth info...');
  const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(USER_ID);

  if (authError || !authUser) {
    console.log('❌ Could not get auth user');
    console.log('   Trying to create a test token...');
    
    // Create a service role token for testing
    const { data: { session }, error: sessionError } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email: 'hairdo_peep.1n@icloud.com',
    });

    if (sessionError) {
      console.log('❌ Could not create session:', sessionError);
      return;
    }

    console.log('✅ Created test session');
  }

  // Step 2: Call the balance API directly using service role
  console.log('\nStep 2: Calling balance API...');
  
  try {
    const response = await fetch(`${API_URL}/api/deposits/balances`, {
      headers: {
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    console.log('\n📊 Balance API Response:');
    console.log('Status:', response.status);
    console.log('Data:', JSON.stringify(data, null, 2));

    if (data.balances) {
      console.log('\n💰 Balances:');
      console.log(`   USDC (Solana): ${data.balances.usdcSolana}`);
      console.log(`   USDC (Base): ${data.balances.usdcBase}`);
      console.log(`   USDC (Polygon): ${data.balances.usdcPolygon}`);
      console.log(`   USDT (Solana): ${data.balances.usdtSolana}`);
      console.log(`   USDT (Base): ${data.balances.usdtBase}`);
      console.log(`   USDT (Polygon): ${data.balances.usdtPolygon}`);
      console.log(`   SOL: ${data.balances.sol}`);

      if (data.balances.usdcBase === 2.0) {
        console.log('\n✅ SUCCESS: Base USDC balance is showing correctly!');
      } else if (data.balances.usdcBase === 0) {
        console.log('\n❌ PROBLEM: Base USDC balance is 0 but should be 2.0');
        console.log('   This means the balance API is not fetching correctly.');
      } else {
        console.log(`\n⚠️  Base USDC balance is ${data.balances.usdcBase} (expected 2.0)`);
      }
    }

  } catch (error) {
    console.error('❌ Error calling API:', error.message);
  }

  // Step 3: Check deposit addresses in database
  console.log('\n\nStep 3: Checking deposit addresses in database...');
  const { data: addresses } = await supabase
    .from('deposit_addresses')
    .select('*')
    .eq('user_id', USER_ID)
    .eq('network', 'base');

  console.log(`Found ${addresses?.length || 0} Base addresses:`);
  for (const addr of addresses || []) {
    console.log(`   ${addr.asset_symbol}: ${addr.address}`);
  }
}

testBalanceAPI()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });

