import 'dotenv/config';

const BREAD_API_URL = process.env.BREAD_API_URL || 'https://api.usebread.com/v1';
const BREAD_API_KEY = process.env.BREAD_API_KEY;

async function listAllWallets() {
  console.log('\n🔍 Listing ALL wallets from Bread API...\n');

  try {
    const baseUrl = BREAD_API_URL;
    console.log('Using Base URL:', baseUrl);
    console.log('Using API Key:', BREAD_API_KEY ? BREAD_API_KEY.substring(0, 10) + '...' : 'NOT SET');

    // Check the successful offramp by its ID
    const offrampId = 'BcDDEDmsOXwKcM_w';
    console.log('Checking successful offramp:', offrampId);
    const offrampResponse = await fetch(`${baseUrl}/offramp/${offrampId}`, {
      headers: { 'x-service-key': BREAD_API_KEY, 'Content-Type': 'application/json' },
    });
    console.log('Offramp status:', JSON.stringify(await offrampResponse.json(), null, 2));

    // Try to get wallet by ID that we have
    const walletId = '693da8083e9fc49d0ed651a4';
    console.log('\nChecking wallet:', walletId);
    const walletResponse = await fetch(`${baseUrl}/wallet/${walletId}`, {
      headers: { 'x-service-key': BREAD_API_KEY, 'Content-Type': 'application/json' },
    });
    console.log('Wallet status:', JSON.stringify(await walletResponse.json(), null, 2));

    // Try to get wallet balance
    console.log('\nChecking wallet balance:');
    const balanceResponse = await fetch(`${baseUrl}/wallet/${walletId}/balance`, {
      headers: { 'x-service-key': BREAD_API_KEY, 'Content-Type': 'application/json' },
    });
    console.log('Balance status:', JSON.stringify(await balanceResponse.json(), null, 2));

    // Try retry the offramp using the wallet - see if it works
    console.log('\n=== Trying to trigger offramp ===');
    const beneficiaryId = '693da8173e9fc49d0ed651c3'; // From earlier logs
    const response = await fetch(`${baseUrl}/offramp`, {
      method: 'POST',
      headers: { 'x-service-key': BREAD_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        wallet_id: walletId,
        beneficiary_id: beneficiaryId,
        amount: '10',
        asset: 'solana:usdc'
      })
    });
    console.log('Offramp retry:', JSON.stringify(await response.json(), null, 2));

    return; // Don't run the rest

    // List all banks to verify API works
    console.log('\nChecking banks list (to verify API is working):');
    const bankResponse = await fetch(`${baseUrl}/banks?currency=NGN`, {
      headers: {
        'x-service-key': BREAD_API_KEY,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    console.log('📊 All Bread Wallets:');
    console.log(JSON.stringify(data, null, 2));

    // If we got wallets, find the Solana one
    if (data.data && data.data.wallets) {
      console.log('\n📍 Solana wallets:');
      const solanaWallets = data.data.wallets.filter(w => w.chain === 'solana');
      solanaWallets.forEach(w => {
        console.log('  ID:', w.id);
        console.log('  Address:', w.address);
        console.log('  Type:', w.type);
        console.log('  ---');
      });
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

listAllWallets();

