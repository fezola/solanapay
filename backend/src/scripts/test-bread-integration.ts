/**
 * Test Bread Africa Integration
 * Quick script to test Bread API connectivity and basic operations
 */

import axios from 'axios';
import { env } from '../config/env.js';

async function testBreadIntegration() {
  console.log('🍞 Testing Bread Africa Integration\n');

  // Check if Bread is configured
  if (!env.BREAD_API_KEY) {
    console.error('❌ BREAD_API_KEY not configured in .env');
    console.log('\nPlease add the following to your .env file:');
    console.log('BREAD_API_KEY=your_api_key_here');
    console.log('BREAD_ENABLED=true');
    process.exit(1);
  }

  if (!env.BREAD_ENABLED) {
    console.warn('⚠️  BREAD_ENABLED is set to false');
    console.log('Set BREAD_ENABLED=true in .env to enable Bread integration\n');
  }

  const client = axios.create({
    baseURL: env.BREAD_API_URL,
    headers: {
      'x-service-key': env.BREAD_API_KEY,
      'Content-Type': 'application/json',
    },
    timeout: 30000,
  });

  try {
    // Test 1: Get Offramp Quote
    console.log('1️⃣  Testing Offramp Quote API...');
    const quoteResponse = await client.post('/quote/offramp', {
      amount: 1000,
      currency: 'NGN',
      asset: 'base:usdc',
      is_exact_output: false,
      phoneNumber: '+2348012345678',
      address: {
        country: 'NG',
      },
    });
    console.log('✅ Identity created:', {
      id: testIdentity.id,
      email: testIdentity.email,
      status: testIdentity.status,
    });
    console.log('');

    // Test beneficiary creation
    console.log('4️⃣  Testing beneficiary creation...');
    const testBeneficiary = await breadService.beneficiary.createBeneficiary({
      identityId: testIdentity.id,
      bankCode: '058', // GTBank
      accountNumber: '0123456789', // Test account
      currency: 'NGN',
    });
    console.log('✅ Beneficiary created:', {
      id: testBeneficiary.id,
      accountName: testBeneficiary.accountName,
      bankCode: testBeneficiary.bankCode,
    });
    console.log('');

    // Test wallet creation
    console.log('5️⃣  Testing wallet creation (Solana)...');
    const testWalletSolana = await breadService.wallet.createWallet(
      testIdentity.id,
      'solana',
      'offramp',
      testBeneficiary.id
    );
    console.log('✅ Solana wallet created:', {
      id: testWalletSolana.id,
      address: testWalletSolana.address,
      type: testWalletSolana.type,
      network: testWalletSolana.network,
    });
    console.log('');

    console.log('6️⃣  Testing wallet creation (Base)...');
    const testWalletBase = await breadService.wallet.createWallet(
      testIdentity.id,
      'base',
      'offramp',
      testBeneficiary.id
    );
    console.log('✅ Base wallet created:', {
      id: testWalletBase.id,
      address: testWalletBase.address,
      type: testWalletBase.type,
      network: testWalletBase.network,
    });
    console.log('');

    // Test rate fetching
    console.log('7️⃣  Testing rate fetching (USDC → NGN)...');
    const rate = await breadService.offramp.getRate('USDC', 'NGN', '100');
    console.log('✅ Rate fetched:', {
      cryptoAsset: rate.rate.cryptoAsset,
      fiatCurrency: rate.rate.fiatCurrency,
      rate: rate.rate.rate,
      cryptoAmount: rate.cryptoAmount,
      fiatAmount: rate.fiatAmount,
      fee: rate.fee,
    });
    console.log('');

    // Test quote calculation
    console.log('8️⃣  Testing quote calculation...');
    const quote = await breadService.offramp.calculateQuote('USDC', '100', 'NGN');
    console.log('✅ Quote calculated:', {
      cryptoAmount: quote.cryptoAmount,
      fiatAmount: quote.fiatAmount,
      exchangeRate: quote.exchangeRate,
      fee: quote.fee,
      netAmount: quote.netAmount,
    });
    console.log('');

    // Summary
    console.log('🎉 All tests passed!\n');
    console.log('Summary:');
    console.log('- Identity ID:', testIdentity.id);
    console.log('- Beneficiary ID:', testBeneficiary.id);
    console.log('- Solana Wallet:', testWalletSolana.address);
    console.log('- Base Wallet:', testWalletBase.address);
    console.log('- USDC/NGN Rate:', rate.rate.rate);
    console.log('');
    console.log('✅ Bread integration is working correctly!');
    console.log('');
    console.log('Next steps:');
    console.log('1. Run database migration: npm run tsx src/db/run-bread-migration.ts');
    console.log('2. Set BREAD_ENABLED=true in .env');
    console.log('3. Restart your backend server');
    console.log('4. Test with a real user in your app');

    process.exit(0);
  } catch (error: any) {
    console.error('\n❌ Test failed:', error.message);
    
    if (error.statusCode === 401) {
      console.log('\n💡 Tip: Check that your BREAD_API_KEY is correct');
    } else if (error.statusCode === 404) {
      console.log('\n💡 Tip: The endpoint may not exist in the Bread API');
    } else if (error.code === 'NETWORK_ERROR') {
      console.log('\n💡 Tip: Check your internet connection and BREAD_API_URL');
    }

    logger.error({ msg: 'Bread integration test failed', error });
    process.exit(1);
  }
}

// Run the test
testBreadIntegration();

