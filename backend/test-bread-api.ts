/**
 * Test script to directly call Bread API and see response structure
 */

import axios from 'axios';
import * as dotenv from 'dotenv';

dotenv.config();

const BREAD_API_KEY = process.env.BREAD_API_KEY;
const BREAD_BASE_URL = 'https://processor-prod.up.railway.app';

async function testBreadIdentityAPI() {
  console.log('🔵 Testing Bread Identity API...\n');
  console.log('API Key:', BREAD_API_KEY?.substring(0, 10) + '...');
  console.log('Base URL:', BREAD_BASE_URL);
  console.log('\n---\n');

  try {
    // Test 1: Create Identity
    console.log('📝 Test 1: Creating Identity...');
    const identityPayload = {
      first_name: 'Test',
      last_name: 'User',
      email: `test${Date.now()}@example.com`,
      phone_number: '+2348012345678',
      address: {
        country: 'NG',
      },
    };

    console.log('Request payload:', JSON.stringify(identityPayload, null, 2));

    const response = await axios.post(
      `${BREAD_BASE_URL}/identity`,
      identityPayload,
      {
        headers: {
          'Content-Type': 'application/json',
          'x-service-key': BREAD_API_KEY,
        },
      }
    );

    console.log('\n✅ Response Status:', response.status);
    console.log('✅ Response Headers:', JSON.stringify(response.headers, null, 2));
    console.log('\n✅ Response Data Structure:');
    console.log('  - Type:', typeof response.data);
    console.log('  - Keys:', Object.keys(response.data));
    console.log('\n✅ Full Response Data:');
    console.log(JSON.stringify(response.data, null, 2));

    // Check what structure we got
    if (response.data.data && response.data.data.id) {
      console.log('\n🎯 Identity ID found at: response.data.data.id');
      console.log('   Value:', response.data.data.id);
    } else if (response.data.id) {
      console.log('\n🎯 Identity ID found at: response.data.id');
      console.log('   Value:', response.data.id);
    } else {
      console.log('\n❌ Could not find identity ID in response!');
    }

  } catch (error: any) {
    console.error('\n❌ Error occurred:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Headers:', error.response.headers);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('Error:', error.message);
      console.error('Stack:', error.stack);
    }
  }
}

// Run the test
testBreadIdentityAPI();

