/**
 * Test Bread Africa API
 * Simple test to verify API connectivity and basic operations
 */

import axios from 'axios';
import { env } from '../config/env.js';

async function testBreadAPI() {
  console.log('🍞 Testing Bread Africa API\n');

  // Check if Bread is configured
  if (!env.BREAD_API_KEY) {
    console.error('❌ BREAD_API_KEY not configured in .env');
    process.exit(1);
  }

  const client = axios.create({
    baseURL: env.BREAD_API_URL,
    headers: {
      'x-service-key': env.BREAD_API_KEY,
      'Content-Type': 'application/json',
    },
    timeout: 30000,
  });

  console.log('📍 API Base URL:', env.BREAD_API_URL);
  console.log('🔑 API Key:', env.BREAD_API_KEY.substring(0, 10) + '...\n');

  try {
    // Test 1: Get Offramp Quote
    console.log('1️⃣  Testing Offramp Quote API...');
    const quoteResponse = await client.post('/quote/offramp', {
      amount: 1000,
      currency: 'NGN',
      asset: 'base:usdc',
      is_exact_output: false,
    });
    console.log('✅ Offramp Quote Response:');
    console.log(JSON.stringify(quoteResponse.data, null, 2));
    console.log('');

    // Test 2: Get Offramp Rate
    console.log('2️⃣  Testing Offramp Rate API...');
    const rateResponse = await client.get('/rate/offramp', {
      params: {
        currency: 'NGN',
        asset: 'base:usdc',
      },
    });
    console.log('✅ Offramp Rate Response:');
    console.log(JSON.stringify(rateResponse.data, null, 2));
    console.log('');

    // Test 3: Get Supported Assets
    console.log('3️⃣  Testing Get Assets API...');
    const assetsResponse = await client.get('/assets');
    console.log('✅ Supported Assets:');
    console.log(JSON.stringify(assetsResponse.data, null, 2));
    console.log('');

    // Test 4: Get Supported Banks
    console.log('4️⃣  Testing Get Banks API...');
    const banksResponse = await client.get('/banks', {
      params: {
        currency: 'NGN',
      },
    });
    console.log('✅ Supported Banks (first 5):');
    const banks = banksResponse.data.data || banksResponse.data;
    console.log(JSON.stringify(banks.slice(0, 5), null, 2));
    console.log('');

    console.log('🎉 All tests passed!\n');
    console.log('✅ Bread API is working correctly');
    console.log('✅ API Key: Valid');
    console.log('✅ Base URL: ' + env.BREAD_API_URL);
    console.log('✅ You can now integrate Bread into your app\n');

    process.exit(0);
  } catch (error: any) {
    console.error('\n❌ Test failed:', error.message);
    if (error.response?.data) {
      console.error('Response:', JSON.stringify(error.response.data, null, 2));
    }
    if (error.response?.status) {
      console.error('Status:', error.response.status);
    }
    console.log('\n💡 Troubleshooting:');
    console.log('   - Check your API key is correct');
    console.log('   - Check your internet connection');
    console.log('   - Contact Bread Africa support: hello@bread.africa');
    process.exit(1);
  }
}

// Run the test
testBreadAPI();

