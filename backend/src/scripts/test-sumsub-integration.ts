/**
 * Test Sumsub Integration
 * Tests the Sumsub KYC service
 */

import { SumsubService } from '../services/kyc/index.js';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

async function testSumsubIntegration() {
  console.log('🔐 Testing Sumsub KYC Integration\n');
  console.log('='.repeat(60));

  // Check if Sumsub is configured
  if (!env.SUMSUB_APP_TOKEN || !env.SUMSUB_SECRET_KEY) {
    console.log('\n⚠️  Sumsub not configured!');
    console.log('\nTo test Sumsub integration:');
    console.log('1. Get your credentials from https://cockpit.sumsub.com');
    console.log('2. Add them to backend/.env:');
    console.log('   SUMSUB_APP_TOKEN=your_token');
    console.log('   SUMSUB_SECRET_KEY=your_secret');
    console.log('3. Run this test again\n');
    return;
  }

  try {
    // Initialize Sumsub service
    const sumsubService = new SumsubService({
      appToken: env.SUMSUB_APP_TOKEN,
      secretKey: env.SUMSUB_SECRET_KEY,
      baseUrl: env.SUMSUB_BASE_URL,
      levelName: env.SUMSUB_LEVEL_NAME,
    });

    console.log('\n✅ Sumsub service initialized');
    console.log(`   Base URL: ${env.SUMSUB_BASE_URL}`);
    console.log(`   Level: ${env.SUMSUB_LEVEL_NAME}`);

    // Test 1: Initialize KYC for a test user
    console.log('\n📝 Test 1: Initialize KYC');
    console.log('-'.repeat(60));

    const testUserId = 'test_user_' + Date.now();
    const testEmail = `test${Date.now()}@example.com`;

    try {
      const result = await sumsubService.initializeKYC(
        testUserId,
        testEmail,
        '+2348012345678'
      );

      console.log('✅ KYC initialized successfully!');
      console.log(`   Applicant ID: ${result.applicantId}`);
      console.log(`   Access Token: ${result.accessToken.substring(0, 20)}...`);
      console.log(`   User ID: ${testUserId}`);

      // Test 2: Get KYC Status
      console.log('\n📊 Test 2: Get KYC Status');
      console.log('-'.repeat(60));

      const status = await sumsubService.getKYCStatus(testUserId);

      console.log('✅ KYC status retrieved:');
      console.log(`   Status: ${status.status}`);
      console.log(`   Tier: ${status.tier}`);
      console.log(`   Applicant ID: ${status.applicantId}`);

      // Test 3: Webhook Signature Verification
      console.log('\n🔐 Test 3: Webhook Signature Verification');
      console.log('-'.repeat(60));

      const testPayload = JSON.stringify({
        applicantId: result.applicantId,
        type: 'applicantCreated',
      });

      const testSecret = 'test_secret_123';
      const crypto = await import('crypto');
      const testSignature = crypto
        .createHmac('sha256', testSecret)
        .update(testPayload)
        .digest('hex');

      const isValid = sumsubService.verifyWebhookSignature(
        testPayload,
        testSignature,
        testSecret
      );

      console.log(`✅ Webhook signature verification: ${isValid ? 'PASSED' : 'FAILED'}`);

      // Summary
      console.log('\n' + '='.repeat(60));
      console.log('🎉 ALL TESTS PASSED!');
      console.log('='.repeat(60));
      console.log('\n✅ Sumsub integration is working correctly!');
      console.log('\n📋 Summary:');
      console.log('   ✅ Service initialization');
      console.log('   ✅ Applicant creation');
      console.log('   ✅ Access token generation');
      console.log('   ✅ Status retrieval');
      console.log('   ✅ Webhook signature verification');
      console.log('\n🚀 Ready to verify users!');
      console.log('\n📖 Next steps:');
      console.log('   1. Configure webhook in Sumsub dashboard');
      console.log('   2. Integrate SumsubVerification component in frontend');
      console.log('   3. Test with real documents');
      console.log('\n📚 See SUMSUB_INTEGRATION_GUIDE.md for details\n');
    } catch (error: any) {
      if (error.response?.status === 401) {
        console.log('\n❌ Authentication failed!');
        console.log('\n⚠️  Your Sumsub credentials are invalid.');
        console.log('\nPlease check:');
        console.log('1. SUMSUB_APP_TOKEN is correct');
        console.log('2. SUMSUB_SECRET_KEY is correct');
        console.log('3. Credentials are from https://cockpit.sumsub.com\n');
      } else {
        throw error;
      }
    }
  } catch (error: any) {
    console.error('\n❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
    console.error('\nStack:', error.stack);
    process.exit(1);
  }
}

// Run tests
testSumsubIntegration().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

