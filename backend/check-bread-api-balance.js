/**
 * Check what Bread Africa API thinks Andrew's wallet balance is
 */

import fetch from 'node-fetch';
import 'dotenv/config';

const BREAD_API_URL = 'https://processor-prod.up.railway.app';
const BREAD_API_KEY = process.env.BREAD_API_KEY;
const WALLET_ID = '691321d541ddc0fb44631963';
const IDENTITY_ID = '690cd240196a18d7bd587965';

async function checkBreadBalance() {
  console.log('\n🔍 CHECKING BREAD AFRICA API BALANCE\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('Wallet ID:', WALLET_ID);
  console.log('Identity ID:', IDENTITY_ID);
  console.log('');

  try {
    // First list all wallets for this identity
    console.log('📡 Calling GET /identity/' + IDENTITY_ID + '/wallets');
    const walletsResponse = await fetch(`${BREAD_API_URL}/identity/${IDENTITY_ID}/wallets`, {
      headers: {
        'x-service-key': BREAD_API_KEY,
      },
    });
    const walletsData = await walletsResponse.json();
    console.log('\n📥 Wallets Response:');
    console.log(JSON.stringify(walletsData, null, 2));
    console.log('');

    // Get wallet details
    console.log('📡 Calling GET /wallet/' + WALLET_ID);
    const walletResponse = await fetch(`${BREAD_API_URL}/wallet/${WALLET_ID}`, {
      headers: {
        'x-service-key': BREAD_API_KEY,
      },
    });

    const walletData = await walletResponse.json();
    console.log('');
    console.log('📥 Wallet Response:');
    console.log(JSON.stringify(walletData, null, 2));
    console.log('');

    // Get wallet balance
    console.log('📡 Calling GET /wallet/' + WALLET_ID + '/balance');
    const balanceResponse = await fetch(`${BREAD_API_URL}/wallet/${WALLET_ID}/balance`, {
      headers: {
        'x-service-key': BREAD_API_KEY,
      },
    });

    const balanceData = await balanceResponse.json();
    console.log('');
    console.log('📥 Balance Response:');
    console.log(JSON.stringify(balanceData, null, 2));
    console.log('');

    // Get wallet transactions
    console.log('📡 Calling GET /wallet/' + WALLET_ID + '/transactions');
    const txResponse = await fetch(`${BREAD_API_URL}/wallet/${WALLET_ID}/transactions`, {
      headers: {
        'x-service-key': BREAD_API_KEY,
      },
    });

    const txData = await txResponse.json();
    console.log('');
    console.log('📥 Transactions Response:');
    console.log(JSON.stringify(txData, null, 2));
    console.log('');

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('ANALYSIS:');
    console.log('');
    console.log('On-chain balance (BaseScan): 4.996587 USDC');
    console.log('Bread API balance:', balanceData.data?.balance || balanceData.balance || 'UNKNOWN');
    console.log('');
    
    if (balanceData.data?.balance === '0' || balanceData.balance === '0') {
      console.log('❌ PROBLEM: Bread API shows 0 balance even though on-chain has 4.996587 USDC!');
      console.log('');
      console.log('This means Bread is NOT tracking on-chain deposits for "basic" wallets.');
      console.log('We need to use a different approach.');
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
  }
}

checkBreadBalance();

