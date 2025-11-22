import axios from 'axios';
import 'dotenv/config';

const BREAD_API_KEY = process.env.BREAD_API_KEY;
const BREAD_API_URL = 'https://processor-prod.up.railway.app';

async function testCreateWallet() {
  console.log('Testing Bread wallet creation...\n');
  
  const reference = `test_wallet_${Date.now()}`;
  
  console.log('Request:');
  console.log('URL:', `${BREAD_API_URL}/wallet`);
  console.log('Headers:', {
    'x-service-key': BREAD_API_KEY.substring(0, 10) + '...',
    'Content-Type': 'application/json',
  });
  console.log('Body:', JSON.stringify({ reference }, null, 2));
  console.log('\n---\n');
  
  try {
    const response = await axios.post(
      `${BREAD_API_URL}/wallet`,
      { reference },
      {
        headers: {
          'x-service-key': BREAD_API_KEY,
          'Content-Type': 'application/json',
        },
      }
    );
    
    console.log('✅ SUCCESS!');
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(response.data, null, 2));
    
    // Check what addresses we got
    const data = response.data.data || response.data;
    console.log('\n---\n');
    console.log('Wallet ID:', data.wallet_id || data.id);
    console.log('Address object:', JSON.stringify(data.address, null, 2));
    console.log('SVM address:', data.address?.svm);
    console.log('EVM address:', data.address?.evm);
    
  } catch (error) {
    console.log('❌ FAILED!');
    console.log('Status:', error.response?.status);
    console.log('Error:', JSON.stringify(error.response?.data, null, 2));
  }
}

testCreateWallet();

