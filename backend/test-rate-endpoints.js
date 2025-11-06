/**
 * Test script for rate and quote endpoints
 * 
 * Usage:
 * 1. Start the backend server: npm run dev
 * 2. Get an auth token by logging in
 * 3. Run: node test-rate-endpoints.js YOUR_AUTH_TOKEN
 */

const BASE_URL = 'http://localhost:3001';

async function testRateEndpoint(authToken) {
  console.log('\n🧪 Testing GET /api/payouts/rate...\n');

  try {
    const response = await fetch(`${BASE_URL}/api/payouts/rate?asset=USDC&chain=solana&currency=NGN`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (response.ok) {
      console.log('✅ Rate endpoint successful!');
      console.log('📊 Response:', JSON.stringify(data, null, 2));
      console.log(`\n💱 Current Rate: 1 ${data.asset} = ₦${data.rate.toLocaleString('en-NG')}`);
      return data.rate;
    } else {
      console.log('❌ Rate endpoint failed!');
      console.log('Error:', JSON.stringify(data, null, 2));
      return null;
    }
  } catch (error) {
    console.error('❌ Network error:', error.message);
    return null;
  }
}

async function testQuoteEndpoint(authToken) {
  console.log('\n🧪 Testing POST /api/payouts/quote...\n');

  const testAmount = 50; // 50 USDC

  try {
    const response = await fetch(`${BASE_URL}/api/payouts/quote`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        asset: 'USDC',
        chain: 'solana',
        amount: testAmount,
        currency: 'NGN',
      }),
    });

    const data = await response.json();

    if (response.ok) {
      console.log('✅ Quote endpoint successful!');
      console.log('📊 Response:', JSON.stringify(data, null, 2));
      console.log('\n💰 Quote Summary:');
      console.log(`   You send: ${data.display.you_send}`);
      console.log(`   You receive: ${data.display.you_receive}`);
      console.log(`   Rate: ${data.display.rate_display}`);
      console.log(`   Fee: ${data.display.fee_display}`);
      console.log(`   Expires in: ${data.display.expires_in}`);
      return data;
    } else {
      console.log('❌ Quote endpoint failed!');
      console.log('Error:', JSON.stringify(data, null, 2));
      return null;
    }
  } catch (error) {
    console.error('❌ Network error:', error.message);
    return null;
  }
}

async function testDifferentAssets(authToken) {
  console.log('\n🧪 Testing different assets...\n');

  const assets = [
    { asset: 'USDC', chain: 'solana' },
    { asset: 'USDC', chain: 'base' },
    { asset: 'SOL', chain: 'solana' },
  ];

  for (const { asset, chain } of assets) {
    console.log(`\n📍 Testing ${asset} on ${chain}...`);
    
    try {
      const response = await fetch(`${BASE_URL}/api/payouts/rate?asset=${asset}&chain=${chain}&currency=NGN`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (response.ok) {
        console.log(`   ✅ 1 ${asset} = ₦${data.rate.toLocaleString('en-NG')}`);
      } else {
        console.log(`   ❌ Failed: ${data.message}`);
        if (data.bread_error) {
          console.log(`   Bread error:`, data.bread_error);
        }
      }
    } catch (error) {
      console.log(`   ❌ Network error: ${error.message}`);
    }
  }
}

async function main() {
  const authToken = process.argv[2];

  if (!authToken) {
    console.log('❌ Error: No auth token provided');
    console.log('\nUsage: node test-rate-endpoints.js YOUR_AUTH_TOKEN');
    console.log('\nTo get an auth token:');
    console.log('1. Start the backend: npm run dev');
    console.log('2. Login via your app or API');
    console.log('3. Copy the JWT token from the response');
    console.log('4. Run: node test-rate-endpoints.js <token>');
    process.exit(1);
  }

  console.log('🚀 Starting rate endpoint tests...');
  console.log(`📡 Backend URL: ${BASE_URL}`);

  // Test 1: Get current rate
  const rate = await testRateEndpoint(authToken);

  // Test 2: Get precise quote
  if (rate) {
    await testQuoteEndpoint(authToken);
  }

  // Test 3: Test different assets
  await testDifferentAssets(authToken);

  console.log('\n✅ All tests completed!\n');
}

main().catch(console.error);

