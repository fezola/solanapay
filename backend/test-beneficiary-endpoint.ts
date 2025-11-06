/**
 * Test script to call the beneficiary creation endpoint
 */

import axios from 'axios';
import * as dotenv from 'dotenv';

dotenv.config();

const API_URL = 'http://localhost:3001';
const TEST_TOKEN = 'YOUR_TEST_JWT_TOKEN_HERE'; // You need to get this from your app

async function testBeneficiaryCreation() {
  console.log('🔵 Testing Beneficiary Creation Endpoint...\n');

  try {
    // Test: Create Beneficiary
    console.log('📝 Creating beneficiary...');
    const payload = {
      bank_code: '000004', // Access Bank
      account_number: '2115710973',
      bread_beneficiary_id: '',
      account_name: 'Pending verification...',
    };

    console.log('Request payload:', JSON.stringify(payload, null, 2));

    const response = await axios.post(
      `${API_URL}/api/payouts/beneficiaries`,
      payload,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${TEST_TOKEN}`,
        },
      }
    );

    console.log('\n✅ Response Status:', response.status);
    console.log('✅ Response Data:');
    console.log(JSON.stringify(response.data, null, 2));

  } catch (error: any) {
    console.error('\n❌ Error occurred:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('Error:', error.message);
    }
  }
}

console.log('⚠️  NOTE: You need to replace TEST_TOKEN with a valid JWT token from your app.');
console.log('⚠️  You can get this from the browser DevTools → Application → Local Storage → auth token\n');

// Uncomment to run the test (after adding a valid token)
// testBeneficiaryCreation();

