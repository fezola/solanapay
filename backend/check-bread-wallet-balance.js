import fetch from 'node-fetch';
import 'dotenv/config';

const BREAD_API_URL = 'https://processor-prod.up.railway.app';
const BREAD_API_KEY = process.env.BREAD_API_KEY;
const BREAD_WALLET_ID = '690e415e41ddc0fb44626dc7';

async function checkBreadWalletBalance() {
  console.log('\n🔍 Checking Bread wallet balance...\n');
  console.log('Wallet ID:', BREAD_WALLET_ID);
  
  try {
    // Try to get wallet balance
    const balanceResponse = await fetch(
      `${BREAD_API_URL}/wallet/${BREAD_WALLET_ID}/balance`,
      {
        headers: {
          'x-service-key': BREAD_API_KEY,
        },
      }
    );
    
    const balanceData = await balanceResponse.json();
    
    console.log('\n📥 Balance Response:');
    console.log('Status:', balanceResponse.status);
    console.log('Body:', JSON.stringify(balanceData, null, 2));
    
    // Try to get wallet details
    console.log('\n🔍 Fetching wallet details...');
    const walletResponse = await fetch(
      `${BREAD_API_URL}/wallet/${BREAD_WALLET_ID}`,
      {
        headers: {
          'x-service-key': BREAD_API_KEY,
        },
      }
    );
    
    const walletData = await walletResponse.json();
    
    console.log('\n📥 Wallet Response:');
    console.log('Status:', walletResponse.status);
    console.log('Body:', JSON.stringify(walletData, null, 2));
    
    // Try to get wallet transactions
    console.log('\n🔍 Fetching wallet transactions...');
    const txResponse = await fetch(
      `${BREAD_API_URL}/wallet/${BREAD_WALLET_ID}/transactions`,
      {
        headers: {
          'x-service-key': BREAD_API_KEY,
        },
      }
    );
    
    const txData = await txResponse.json();
    
    console.log('\n📥 Transactions Response:');
    console.log('Status:', txResponse.status);
    console.log('Body:', JSON.stringify(txData, null, 2));
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
  }
}

checkBreadWalletBalance();

