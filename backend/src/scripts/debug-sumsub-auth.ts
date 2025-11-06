/**
 * Debug Sumsub Authentication
 * Tests the signature generation
 */

import axios from 'axios';
import crypto from 'crypto';
import { env } from '../config/env.js';

async function debugSumsubAuth() {
  console.log('🔐 Debugging Sumsub Authentication\n');
  console.log('='.repeat(60));

  const appToken = env.SUMSUB_APP_TOKEN;
  const secretKey = env.SUMSUB_SECRET_KEY;

  console.log('\n📋 Configuration:');
  console.log(`   App Token: ${appToken?.substring(0, 20)}...`);
  console.log(`   Secret Key: ${secretKey?.substring(0, 10)}...`);
  console.log(`   Base URL: ${env.SUMSUB_BASE_URL}`);
  console.log(`   Level: ${env.SUMSUB_LEVEL_NAME}`);

  if (!appToken || !secretKey) {
    console.log('\n❌ Missing credentials!');
    return;
  }

  // Test 1: Create a test applicant
  console.log('\n📝 Test 1: Create Test Applicant');
  console.log('-'.repeat(60));

  try {
    const timestamp = Math.floor(Date.now() / 1000);
    const method = 'POST';
    const url = `/resources/applicants?levelName=${env.SUMSUB_LEVEL_NAME}`;
    const requestBody = {
      externalUserId: `test_${Date.now()}`,
      levelName: env.SUMSUB_LEVEL_NAME,
    };
    const body = JSON.stringify(requestBody);

    // Generate signature
    const message = `${timestamp}${method}${url}${body}`;
    const signature = crypto
      .createHmac('sha256', secretKey)
      .update(message)
      .digest('hex');

    console.log('\n🔑 Signature Details:');
    console.log(`   Timestamp: ${timestamp}`);
    console.log(`   Method: ${method}`);
    console.log(`   URL: ${url}`);
    console.log(`   Level: ${env.SUMSUB_LEVEL_NAME}`);
    console.log(`   Signature: ${signature.substring(0, 20)}...`);

    const response = await axios.post(
      `${env.SUMSUB_BASE_URL}${url}`,
      requestBody,
      {
        headers: {
          'X-App-Token': appToken,
          'X-App-Access-Sig': signature,
          'X-App-Access-Ts': timestamp.toString(),
          'Content-Type': 'application/json',
        },
      }
    );

    console.log('\n✅ Applicant created successfully!');
    console.log(`   Status: ${response.status}`);
    console.log(`   Applicant ID: ${response.data?.id}`);
    console.log(`   External User ID: ${response.data?.externalUserId}`);
  } catch (error: any) {
    console.log('\n❌ Request failed!');
    console.log(`   Status: ${error.response?.status}`);
    console.log(`   Error:`, JSON.stringify(error.response?.data, null, 2));

    if (error.response?.status === 401) {
      console.log('\n💡 Troubleshooting:');
      console.log('   1. Check that your App Token is correct');
      console.log('   2. Check that your Secret Key is correct');
      console.log('   3. Make sure you copied the FULL token and secret');
      console.log('   4. Try regenerating the token in Sumsub dashboard');
      console.log('\n📖 Sumsub Dashboard: https://cockpit.sumsub.com');
      console.log('   Go to: Settings → App Tokens');
    } else if (error.response?.status === 400) {
      console.log('\n💡 The level name might be incorrect.');
      console.log('   Check your level name in Sumsub dashboard.');
    }
  }

  // Test 2: Check token format
  console.log('\n📝 Test 2: Token Format Check');
  console.log('-'.repeat(60));

  if (appToken.startsWith('prd:')) {
    console.log('✅ Token format: Production (prd:)');
  } else if (appToken.startsWith('sbx:')) {
    console.log('✅ Token format: Sandbox (sbx:)');
  } else {
    console.log('⚠️  Token format: Unknown');
  }

  // Test 3: Check if level exists
  console.log('\n📝 Test 3: Check Level Configuration');
  console.log('-'.repeat(60));

  try {
    const timestamp = Math.floor(Date.now() / 1000);
    const method = 'GET';
    const url = '/resources/sdkIntegrations/levels';
    const body = '';

    const message = `${timestamp}${method}${url}${body}`;
    const signature = crypto
      .createHmac('sha256', secretKey)
      .update(message)
      .digest('hex');

    const response = await axios.get(`${env.SUMSUB_BASE_URL}${url}`, {
      headers: {
        'X-App-Token': appToken,
        'X-App-Access-Sig': signature,
        'X-App-Access-Ts': timestamp.toString(),
        'Content-Type': 'application/json',
      },
    });

    console.log('✅ Levels retrieved:');
    const levels = response.data?.items || [];
    if (levels.length > 0) {
      levels.forEach((level: any) => {
        console.log(`   - ${level.name}`);
      });
      console.log(`\n💡 Use one of these level names in your .env file`);
    } else {
      console.log('   No levels found. Create one in Sumsub dashboard.');
    }
  } catch (error: any) {
    console.log('❌ Could not retrieve levels');
    console.log(`   Error: ${error.response?.data?.description || error.message}`);
  }

  console.log('\n' + '='.repeat(60));
  console.log('Debug complete!\n');
}

debugSumsubAuth().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

