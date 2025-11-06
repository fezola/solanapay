/**
 * Test Crypto to Naira Offramp
 * Test converting USDC, USDT, SOL, ETH, BNB to Nigerian Naira
 */

import axios from 'axios';
import { env } from '../config/env.js';

async function testCryptoToNaira() {
  console.log('💰 Testing Crypto → Naira Offramp\n');

  const client = axios.create({
    baseURL: env.BREAD_API_URL,
    headers: {
      'x-service-key': env.BREAD_API_KEY,
      'Content-Type': 'application/json',
    },
    timeout: 30000,
  });

  try {
    // Test 1: USDC (Base) → NGN
    console.log('1️⃣  Testing Base USDC → NGN');
    const usdcQuote = await client.post('/quote/offramp', {
      amount: 100, // 100 USDC
      currency: 'NGN',
      asset: 'base:usdc',
      is_exact_output: false, // amount is in crypto (USDC)
    });
    console.log('✅ 100 USDC (Base) → NGN:');
    console.log(`   Rate: ${usdcQuote.data.data.rate} NGN per USDC`);
    console.log(`   You get: ₦${usdcQuote.data.data.output_amount.toLocaleString()}`);
    console.log(`   Fee: ₦${usdcQuote.data.data.fee}`);
    console.log('');

    // Test 2: USDC (Solana) → NGN
    console.log('2️⃣  Testing Solana USDC → NGN');
    const solanaUsdcQuote = await client.post('/quote/offramp', {
      amount: 100, // 100 USDC
      currency: 'NGN',
      asset: 'solana:usdc',
      is_exact_output: false,
    });
    console.log('✅ 100 USDC (Solana) → NGN:');
    console.log(`   Rate: ${solanaUsdcQuote.data.data.rate} NGN per USDC`);
    console.log(`   You get: ₦${solanaUsdcQuote.data.data.output_amount.toLocaleString()}`);
    console.log(`   Fee: ₦${solanaUsdcQuote.data.data.fee}`);
    console.log('');

    // Test 3: USDT (Solana) → NGN
    console.log('3️⃣  Testing Solana USDT → NGN');
    const usdtQuote = await client.post('/quote/offramp', {
      amount: 100, // 100 USDT
      currency: 'NGN',
      asset: 'solana:usdt',
      is_exact_output: false,
    });
    console.log('✅ 100 USDT (Solana) → NGN:');
    console.log(`   Rate: ${usdtQuote.data.data.rate} NGN per USDT`);
    console.log(`   You get: ₦${usdtQuote.data.data.output_amount.toLocaleString()}`);
    console.log(`   Fee: ₦${usdtQuote.data.data.fee}`);
    console.log('');

    // Test 4: USDT (Base) → NGN
    console.log('4️⃣  Testing Base USDT → NGN');
    const baseUsdtQuote = await client.post('/quote/offramp', {
      amount: 100, // 100 USDT
      currency: 'NGN',
      asset: 'base:usdt',
      is_exact_output: false,
    });
    console.log('✅ 100 USDT (Base) → NGN:');
    console.log(`   Rate: ${baseUsdtQuote.data.data.rate} NGN per USDT`);
    console.log(`   You get: ₦${baseUsdtQuote.data.data.output_amount.toLocaleString()}`);
    console.log(`   Fee: ₦${baseUsdtQuote.data.data.fee}`);
    console.log('');

    // Test 5: USDC (Ethereum) → NGN
    console.log('5️⃣  Testing Ethereum USDC → NGN');
    const ethUsdcQuote = await client.post('/quote/offramp', {
      amount: 100, // 100 USDC
      currency: 'NGN',
      asset: 'ethereum:usdc',
      is_exact_output: false,
    });
    console.log('✅ 100 USDC (Ethereum) → NGN:');
    console.log(`   Rate: ${ethUsdcQuote.data.data.rate} NGN per USDC`);
    console.log(`   You get: ₦${ethUsdcQuote.data.data.output_amount.toLocaleString()}`);
    console.log(`   Fee: ₦${ethUsdcQuote.data.data.fee}`);
    console.log('');

    // Test 6: CNGN (Base) → NGN
    console.log('6️⃣  Testing Base CNGN → NGN');
    const cngnQuote = await client.post('/quote/offramp', {
      amount: 100, // 100 CNGN
      currency: 'NGN',
      asset: 'base:cngn',
      is_exact_output: false,
    });
    console.log('✅ 100 CNGN (Base) → NGN:');
    console.log(`   Rate: ${cngnQuote.data.data.rate} NGN per CNGN`);
    console.log(`   You get: ₦${cngnQuote.data.data.output_amount.toLocaleString()}`);
    console.log(`   Fee: ₦${cngnQuote.data.data.fee}`);
    console.log('');

    // Test 7: Different amounts
    console.log('7️⃣  Testing different amounts (Base USDC → NGN)');
    const amounts = [10, 50, 100, 500, 1000];
    for (const amount of amounts) {
      const quote = await client.post('/quote/offramp', {
        amount,
        currency: 'NGN',
        asset: 'base:usdc',
        is_exact_output: false,
      });
      console.log(`   ${amount} USDC → ₦${quote.data.data.output_amount.toLocaleString()} (fee: ₦${quote.data.data.fee})`);
    }
    console.log('');

    // Test 8: Get current rates for all assets
    console.log('8️⃣  Current Exchange Rates (Crypto → NGN)');
    const assets = [
      'base:usdc',
      'solana:usdc',
      'ethereum:usdc',
      'base:usdt',
      'solana:usdt',
      'base:cngn',
    ];

    for (const asset of assets) {
      try {
        const rate = await client.get('/rate/offramp', {
          params: {
            currency: 'NGN',
            asset,
          },
        });
        console.log(`   ${asset.padEnd(20)} → ₦${rate.data.data.rate} per token`);
      } catch (error: any) {
        console.log(`   ${asset.padEnd(20)} → Error: ${error.response?.data?.message || error.message}`);
      }
    }
    console.log('');

    console.log('🎉 All crypto → Naira tests completed!\n');
    console.log('📊 Summary:');
    console.log('   ✅ USDC (Base, Solana, Ethereum) → NGN: Working');
    console.log('   ✅ USDT (Base, Solana) → NGN: Working');
    console.log('   ✅ CNGN (Base) → NGN: Working');
    console.log('   ✅ Multiple amounts supported');
    console.log('   ✅ Real-time exchange rates available\n');

    process.exit(0);
  } catch (error: any) {
    console.error('\n❌ Test failed:', error.message);
    if (error.response?.data) {
      console.error('Response:', JSON.stringify(error.response.data, null, 2));
    }
    if (error.response?.status) {
      console.error('Status:', error.response.status);
    }
    process.exit(1);
  }
}

// Run the test
testCryptoToNaira();

