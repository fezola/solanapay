/**
 * Test the COMPLETE Bread API flow: Identity → Lookup → Beneficiary
 */

import axios from 'axios';
import * as dotenv from 'dotenv';

dotenv.config();

const BREAD_API_KEY = process.env.BREAD_API_KEY;
const BREAD_BASE_URL = 'https://processor-prod.up.railway.app';

async function testCompleteBreadFlow() {
  console.log('🔵 Testing COMPLETE Bread API Flow...\n');
  console.log('API Key:', BREAD_API_KEY?.substring(0, 10) + '...');
  console.log('Base URL:', BREAD_BASE_URL);
  console.log('\n' + '='.repeat(60) + '\n');

  try {
    // STEP 1: Create Identity
    console.log('📝 STEP 1: Creating Identity...');
    const identityPayload = {
      type: 'Link',
      name: 'Test User',
      details: {
        email: `test${Date.now()}@example.com`,
        country: 'NG',
      },
    };

    console.log('Request:', JSON.stringify(identityPayload, null, 2));

    const identityResponse = await axios.post(
      `${BREAD_BASE_URL}/identity`,
      identityPayload,
      {
        headers: {
          'Content-Type': 'application/json',
          'x-service-key': BREAD_API_KEY,
        },
      }
    );

    console.log('✅ Identity Created!');
    console.log('Response:', JSON.stringify(identityResponse.data, null, 2));
    
    const identityId = identityResponse.data.data?.id;
    console.log('\n🎯 Identity ID:', identityId);
    console.log('\n' + '='.repeat(60) + '\n');

    // STEP 2: Lookup Bank Account
    console.log('📝 STEP 2: Looking up Bank Account...');
    const bankCode = '000004'; // Access Bank
    const accountNumber = '2115710973';

    const lookupResponse = await axios.post(
      `${BREAD_BASE_URL}/lookup`,
      {
        bank_code: bankCode,
        account_number: accountNumber,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'x-service-key': BREAD_API_KEY,
        },
      }
    );

    console.log('✅ Account Lookup Successful!');
    console.log('Response:', JSON.stringify(lookupResponse.data, null, 2));
    
    const accountName = lookupResponse.data.data?.account_name;
    console.log('\n🎯 Account Name:', accountName);
    console.log('\n' + '='.repeat(60) + '\n');

    // STEP 3: Create Beneficiary
    console.log('📝 STEP 3: Creating Beneficiary...');
    const beneficiaryPayload = {
      currency: 'NGN',
      identity_id: identityId,
      details: {
        bank_code: bankCode,
        account_number: accountNumber,
      },
    };

    console.log('Request:', JSON.stringify(beneficiaryPayload, null, 2));

    const beneficiaryResponse = await axios.post(
      `${BREAD_BASE_URL}/beneficiary`,
      beneficiaryPayload,
      {
        headers: {
          'Content-Type': 'application/json',
          'x-service-key': BREAD_API_KEY,
        },
      }
    );

    console.log('✅ Beneficiary Created!');
    console.log('Response:', JSON.stringify(beneficiaryResponse.data, null, 2));
    
    const beneficiaryId = beneficiaryResponse.data.data?.id;
    console.log('\n🎯 Beneficiary ID:', beneficiaryId);
    console.log('\n' + '='.repeat(60) + '\n');

    console.log('🎉 SUCCESS! All steps completed successfully!');
    console.log('\nSummary:');
    console.log('  - Identity ID:', identityId);
    console.log('  - Account Name:', accountName);
    console.log('  - Beneficiary ID:', beneficiaryId);

  } catch (error: any) {
    console.error('\n❌ ERROR OCCURRED:');
    console.error('Step failed at:', error.config?.url);
    
    if (error.response) {
      console.error('\nStatus:', error.response.status);
      console.error('Response Data:', JSON.stringify(error.response.data, null, 2));
      
      console.log('\n🔍 DIAGNOSIS:');
      const data = error.response.data;
      
      if (error.response.status === 401) {
        console.log('  ❌ API Key is invalid or missing');
        console.log('  → Check BREAD_API_KEY in .env file');
      } else if (error.response.status === 400) {
        console.log('  ❌ Bad Request - Invalid payload');
        console.log('  → Error:', data.message);
        console.log('  → Check the request payload format');
      } else if (error.response.status === 404) {
        console.log('  ❌ Endpoint not found');
        console.log('  → Check the API URL and endpoint path');
      }
    } else {
      console.error('\nError:', error.message);
      console.error('Stack:', error.stack);
    }
  }
}

// Run the test
testCompleteBreadFlow();

