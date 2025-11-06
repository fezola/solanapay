/**
 * Test Bread Bank Verification
 * Test different endpoints to find the correct bank verification method
 */

import axios from 'axios';
import { env } from '../config/env.js';

async function testBreadVerification() {
  console.log('🍞 Testing Bread Bank Verification\n');

  const client = axios.create({
    baseURL: env.BREAD_API_URL,
    headers: {
      'x-service-key': env.BREAD_API_KEY,
      'Content-Type': 'application/json',
    },
    timeout: 30000,
  });

  const testBankCode = '000013'; // GTBank from the banks list
  const testAccountNumber = '0123456789'; // Test account

  console.log('Test Data:');
  console.log(`  Bank Code: ${testBankCode}`);
  console.log(`  Account Number: ${testAccountNumber}\n`);

  // Test 1: Try POST /beneficiary/verify
  console.log('1️⃣  Testing POST /beneficiary/verify...');
  try {
    const response = await client.post('/beneficiary/verify', {
      bankCode: testBankCode,
      accountNumber: testAccountNumber,
    });
    console.log('✅ Success!');
    console.log(JSON.stringify(response.data, null, 2));
  } catch (error: any) {
    console.log('❌ Failed:', error.response?.status, error.response?.data?.message || error.message);
  }
  console.log('');

  // Test 2: Try POST /verify-account
  console.log('2️⃣  Testing POST /verify-account...');
  try {
    const response = await client.post('/verify-account', {
      bankCode: testBankCode,
      accountNumber: testAccountNumber,
    });
    console.log('✅ Success!');
    console.log(JSON.stringify(response.data, null, 2));
  } catch (error: any) {
    console.log('❌ Failed:', error.response?.status, error.response?.data?.message || error.message);
  }
  console.log('');

  // Test 3: Try POST /account/verify
  console.log('3️⃣  Testing POST /account/verify...');
  try {
    const response = await client.post('/account/verify', {
      bankCode: testBankCode,
      accountNumber: testAccountNumber,
    });
    console.log('✅ Success!');
    console.log(JSON.stringify(response.data, null, 2));
  } catch (error: any) {
    console.log('❌ Failed:', error.response?.status, error.response?.data?.message || error.message);
  }
  console.log('');

  // Test 4: Try GET /beneficiary/verify with query params
  console.log('4️⃣  Testing GET /beneficiary/verify...');
  try {
    const response = await client.get('/beneficiary/verify', {
      params: {
        bankCode: testBankCode,
        accountNumber: testAccountNumber,
      },
    });
    console.log('✅ Success!');
    console.log(JSON.stringify(response.data, null, 2));
  } catch (error: any) {
    console.log('❌ Failed:', error.response?.status, error.response?.data?.message || error.message);
  }
  console.log('');

  // Test 5: Try POST /bank/verify
  console.log('5️⃣  Testing POST /bank/verify...');
  try {
    const response = await client.post('/bank/verify', {
      bankCode: testBankCode,
      accountNumber: testAccountNumber,
    });
    console.log('✅ Success!');
    console.log(JSON.stringify(response.data, null, 2));
  } catch (error: any) {
    console.log('❌ Failed:', error.response?.status, error.response?.data?.message || error.message);
  }
  console.log('');

  // Test 6: Try POST /resolve-account
  console.log('6️⃣  Testing POST /resolve-account...');
  try {
    const response = await client.post('/resolve-account', {
      bankCode: testBankCode,
      accountNumber: testAccountNumber,
    });
    console.log('✅ Success!');
    console.log(JSON.stringify(response.data, null, 2));
  } catch (error: any) {
    console.log('❌ Failed:', error.response?.status, error.response?.data?.message || error.message);
  }
  console.log('');

  console.log('📝 Summary:');
  console.log('If none of the endpoints worked, Bread might not have a standalone');
  console.log('bank verification endpoint. In that case, verification happens');
  console.log('automatically when creating a beneficiary.');
}

// Run the test
testBreadVerification().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

