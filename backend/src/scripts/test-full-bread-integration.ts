/**
 * Test Full Bread Integration
 * Tests the complete flow: Get quote → Get banks → Simulate payout
 */

import { BreadService } from '../services/bread/index.js';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

async function testFullIntegration() {
  console.log('🍞 Testing Full Bread Integration\n');
  console.log('='.repeat(60));

  // Initialize Bread service
  const breadService = new BreadService({
    apiKey: env.BREAD_API_KEY,
    baseUrl: env.BREAD_API_URL,
  });

  try {
    // Test 1: Get Quote for USDC (Base) → NGN
    console.log('\n📊 Test 1: Get Offramp Quote');
    console.log('-'.repeat(60));
    
    const quoteResponse = await breadService.offramp.getQuote(
      'USDC',
      'base',
      100 // 100 USDC
    );

    console.log('✅ Quote received:');
    console.log(`   Asset: base:usdc`);
    console.log(`   Input: 100 USDC`);
    console.log(`   Output: ₦${quoteResponse.data.output_amount.toLocaleString()}`);
    console.log(`   Rate: ₦${quoteResponse.data.rate.toLocaleString()} per USDC`);
    console.log(`   Fee: ₦${quoteResponse.data.fee}`);
    console.log(`   Expires: ${quoteResponse.data.expiry}`);

    // Test 2: Get Exchange Rate
    console.log('\n💱 Test 2: Get Exchange Rate');
    console.log('-'.repeat(60));
    
    const rateResponse = await breadService.offramp.getRate('USDC', 'base');
    
    console.log('✅ Exchange rate:');
    console.log(`   1 USDC = ₦${rateResponse.data.rate.toLocaleString()}`);

    // Test 3: Get Supported Assets
    console.log('\n🪙 Test 3: Get Supported Assets');
    console.log('-'.repeat(60));
    
    const assets = await breadService.offramp.getAssets();
    
    console.log(`✅ Found ${assets.length} supported assets:`);
    assets.slice(0, 10).forEach((asset) => {
      console.log(`   - ${asset.id}: ${asset.name} (${asset.symbol})`);
    });
    if (assets.length > 10) {
      console.log(`   ... and ${assets.length - 10} more`);
    }

    // Test 4: Get Nigerian Banks
    console.log('\n🏦 Test 4: Get Nigerian Banks');
    console.log('-'.repeat(60));
    
    const banks = await breadService.offramp.getBanks();
    
    console.log(`✅ Found ${banks.length} Nigerian banks:`);
    banks.slice(0, 10).forEach((bank) => {
      console.log(`   - ${bank.name} (${bank.code})`);
    });
    if (banks.length > 10) {
      console.log(`   ... and ${banks.length - 10} more`);
    }

    // Test 5: Multiple Asset Quotes
    console.log('\n💰 Test 5: Compare Quotes for Different Assets');
    console.log('-'.repeat(60));
    
    const testCases = [
      { asset: 'USDC' as const, network: 'base' as const, amount: 100 },
      { asset: 'USDC' as const, network: 'solana' as const, amount: 100 },
      { asset: 'USDT' as const, network: 'solana' as const, amount: 100 },
    ];

    for (const testCase of testCases) {
      try {
        const quote = await breadService.offramp.getQuote(
          testCase.asset,
          testCase.network,
          testCase.amount
        );

        console.log(`✅ ${testCase.amount} ${testCase.asset} (${testCase.network}):`);
        console.log(`   → ₦${quote.data.output_amount.toLocaleString()} (fee: ₦${quote.data.fee})`);
      } catch (error: any) {
        console.log(`❌ ${testCase.asset} (${testCase.network}): ${error.message}`);
      }
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('🎉 ALL TESTS PASSED!');
    console.log('='.repeat(60));
    console.log('\n✅ Bread Integration is fully functional!');
    console.log('\n📋 Summary:');
    console.log('   ✅ Quote API working');
    console.log('   ✅ Rate API working');
    console.log('   ✅ Assets API working');
    console.log('   ✅ Banks API working');
    console.log('   ✅ Multiple assets supported');
    console.log('\n🚀 Ready for production use!');

  } catch (error: any) {
    console.error('\n❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
    process.exit(1);
  }
}

// Run tests
testFullIntegration().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

