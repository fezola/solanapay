/**
 * Test Base USDT rate from Bread Africa
 */

import axios from 'axios';

const BREAD_API_URL = 'https://processor-prod.up.railway.app';
const BREAD_API_KEY = process.env.BREAD_API_KEY;

async function testBaseUSDTRate() {
  console.log('🧪 Testing Base USDT Rate from Bread Africa\n');

  if (!BREAD_API_KEY) {
    console.error('❌ BREAD_API_KEY not set in environment');
    process.exit(1);
  }

  try {
    // Test 1: Get rate for base:usdt
    console.log('1️⃣  Testing GET /rate/offramp for base:usdt');
    const rateResponse = await axios.get(`${BREAD_API_URL}/rate/offramp`, {
      params: {
        currency: 'NGN',
        asset: 'base:usdt',
      },
      headers: {
        'x-api-key': BREAD_API_KEY,
      },
    });

    console.log('✅ Rate Response:');
    console.log(JSON.stringify(rateResponse.data, null, 2));
    console.log(`\n💱 Base USDT Rate: ₦${rateResponse.data.data.rate.toLocaleString()}\n`);

    // Test 2: Get quote for 1 USDT
    console.log('2️⃣  Testing POST /quote/offramp for 1 base:usdt');
    const quoteResponse = await axios.post(
      `${BREAD_API_URL}/quote/offramp`,
      {
        asset: 'base:usdt',
        amount: 1,
        currency: 'NGN',
        is_exact_output: false,
      },
      {
        headers: {
          'x-api-key': BREAD_API_KEY,
          'Content-Type': 'application/json',
        },
      }
    );

    console.log('✅ Quote Response:');
    console.log(JSON.stringify(quoteResponse.data, null, 2));
    console.log(`\n💰 1 USDT (Base) = ₦${quoteResponse.data.data.output_amount.toLocaleString()}\n`);

    // Test 3: Compare with base:usdc
    console.log('3️⃣  Testing base:usdc for comparison');
    const usdcRateResponse = await axios.get(`${BREAD_API_URL}/rate/offramp`, {
      params: {
        currency: 'NGN',
        asset: 'base:usdc',
      },
      headers: {
        'x-api-key': BREAD_API_KEY,
      },
    });

    console.log('✅ Base USDC Rate: ₦' + usdcRateResponse.data.data.rate.toLocaleString());
    console.log('✅ Base USDT Rate: ₦' + rateResponse.data.data.rate.toLocaleString());
    console.log('\n📊 Comparison:');
    console.log(`   USDC: ₦${usdcRateResponse.data.data.rate}`);
    console.log(`   USDT: ₦${rateResponse.data.data.rate}`);
    console.log(`   Difference: ₦${Math.abs(usdcRateResponse.data.data.rate - rateResponse.data.data.rate).toFixed(2)}`);

  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Headers:', error.response.headers);
    }
  }
}

testBaseUSDTRate();

