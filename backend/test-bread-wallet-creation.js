import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });

const BREAD_API_URL = 'https://processor-prod.up.railway.app';
const BREAD_API_KEY = process.env.BREAD_API_KEY;
const BREAD_IDENTITY_ID = '690cd240196a18d7bd587965';

async function testCreateWallet() {
  console.log('\n🧪 Testing Bread wallet creation...\n');
  console.log('API URL:', BREAD_API_URL);
  console.log('Identity ID:', BREAD_IDENTITY_ID);
  
  const reference = `test_wallet_${Date.now()}`;
  
  const requestBody = {
    reference,
  };
  
  console.log('\n📤 Request:');
  console.log('POST /wallet');
  console.log('Body:', JSON.stringify(requestBody, null, 2));
  
  try {
    const response = await fetch(`${BREAD_API_URL}/wallet`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-service-key': BREAD_API_KEY,
      },
      body: JSON.stringify(requestBody),
    });
    
    const data = await response.json();
    
    console.log('\n📥 Response:');
    console.log('Status:', response.status);
    console.log('Body:', JSON.stringify(data, null, 2));
    
    if (!response.ok) {
      console.error('\n❌ Wallet creation failed!');
      return;
    }
    
    console.log('\n✅ Wallet created successfully!');
    
    // Try to fetch the wallet to verify it exists
    const walletId = data.data?.wallet_id || data.data?.id || data.wallet?.id || data.id;
    
    if (walletId) {
      console.log('\n🔍 Fetching wallet to verify...');
      console.log('Wallet ID:', walletId);
      
      const fetchResponse = await fetch(`${BREAD_API_URL}/wallet/${walletId}`, {
        headers: {
          'x-service-key': BREAD_API_KEY,
        },
      });
      
      const fetchData = await fetchResponse.json();
      
      console.log('\n📥 Fetch Response:');
      console.log('Status:', fetchResponse.status);
      console.log('Body:', JSON.stringify(fetchData, null, 2));
    } else {
      console.log('\n⚠️  Could not determine wallet ID from response');
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
  }
}

testCreateWallet();

