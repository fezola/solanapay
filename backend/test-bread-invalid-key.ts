/**
 * Test script to see what happens with invalid Bread API key
 */

import axios from 'axios';

const BREAD_BASE_URL = 'https://processor-prod.up.railway.app';
const INVALID_KEY = 'invalid_key_12345';

async function testWithInvalidKey() {
  console.log('🔵 Testing Bread API with INVALID key...\n');

  try {
    const identityPayload = {
      type: 'Link',
      name: 'Test User',
      details: {
        email: `test${Date.now()}@example.com`,
        country: 'NG',
      },
    };

    console.log('Request payload:', JSON.stringify(identityPayload, null, 2));
    console.log('Using INVALID API key:', INVALID_KEY);
    console.log('\n---\n');

    const response = await axios.post(
      `${BREAD_BASE_URL}/identity`,
      identityPayload,
      {
        headers: {
          'Content-Type': 'application/json',
          'x-service-key': INVALID_KEY,
        },
      }
    );

    console.log('\n✅ Response Status:', response.status);
    console.log('✅ Response Data:');
    console.log(JSON.stringify(response.data, null, 2));

  } catch (error: any) {
    console.error('\n❌ Error occurred (as expected):');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
      
      console.log('\n🔍 Analysis:');
      console.log('  - This is what happens when the API key is invalid');
      console.log('  - The Bread client will throw an error');
      console.log('  - The identity creation will fail');
      console.log('  - breadIdentity will be undefined');
      console.log('  - Accessing breadIdentity.id will throw: "Cannot read properties of undefined (reading \'id\')"');
    } else {
      console.error('Error:', error.message);
    }
  }
}

testWithInvalidKey();

