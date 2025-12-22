import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import axios from 'axios';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '.env') });

const BREAD_API_KEY = process.env.BREAD_API_KEY;
const BREAD_API_URL = process.env.BREAD_API_URL || 'https://processor-prod.up.railway.app';

// lolamewu@gmail.com details
const WALLET_ID = '693c30d53e9fc49d0ed6063e';  // Bread wallet ID from deposit_addresses
const BENEFICIARY_ID = '693c315b196a18d7bd8bd0d7';  // Opay - 8180890790 (Oyinlola Adeyinka Odumewu)
const ASSET = 'solana:usdc';
const AMOUNT = 149.12;  // USDC in Bread wallet

async function executeOfframp() {
  console.log('\n🚀 Manual Offramp for lolamewu@gmail.com');
  console.log('='.repeat(50));
  console.log('Wallet ID:', WALLET_ID);
  console.log('Beneficiary ID:', BENEFICIARY_ID);
  console.log('Asset:', ASSET);
  console.log('Amount:', AMOUNT, 'USDC');
  console.log('Bank: Opay - 8180890790 (Oyinlola Adeyinka Odumewu)');
  console.log('='.repeat(50));

  try {
    // Execute offramp
    console.log('\n💸 Executing offramp...');
    const response = await axios.post(
      `${BREAD_API_URL}/offramp`,
      {
        wallet_id: WALLET_ID,
        beneficiary_id: BENEFICIARY_ID,
        asset: ASSET,
        amount: AMOUNT,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'x-service-key': BREAD_API_KEY,
        },
      }
    );

    console.log('\n✅ Offramp Response:');
    console.log(JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error('\n❌ Offramp Error:');
    console.error('Status:', error.response?.status);
    console.error('Data:', JSON.stringify(error.response?.data, null, 2));
  }
}

executeOfframp();

