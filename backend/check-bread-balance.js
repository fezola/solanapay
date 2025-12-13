import 'dotenv/config';

const BREAD_API_URL = process.env.BREAD_API_URL || 'https://api.usebread.com/v1';
const BREAD_API_KEY = process.env.BREAD_API_KEY;

// Wallet ID for feransamk4@gmail.com
const WALLET_ID = '693da8083e9fc49d0ed651a4';

async function checkBreadBalance() {
  console.log('\n🔍 Checking Bread API balance for wallet:', WALLET_ID);
  console.log('');

  try {
    // Check balance via Bread API
    const response = await fetch(`${BREAD_API_URL}/wallet/${WALLET_ID}/balance`, {
      headers: {
        'Authorization': `Bearer ${BREAD_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    console.log('📊 Bread API Balance Response:');
    console.log(JSON.stringify(data, null, 2));

    // Also try to get wallet info
    console.log('\n📋 Getting wallet details...');
    const walletResponse = await fetch(`${BREAD_API_URL}/wallet/${WALLET_ID}`, {
      headers: {
        'Authorization': `Bearer ${BREAD_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    const walletData = await walletResponse.json();
    console.log('📊 Bread Wallet Info:');
    console.log(JSON.stringify(walletData, null, 2));

    // Try to get transactions
    console.log('\n📜 Getting wallet transactions...');
    const txResponse = await fetch(`${BREAD_API_URL}/wallet/${WALLET_ID}/transactions`, {
      headers: {
        'Authorization': `Bearer ${BREAD_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    const txData = await txResponse.json();
    console.log('📊 Bread Transactions:');
    console.log(JSON.stringify(txData, null, 2));

  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkBreadBalance();

