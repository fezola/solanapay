import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import axios from 'axios';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '.env') });

const BREAD_API_KEY = process.env.BREAD_API_KEY;
const BREAD_API_URL = process.env.BREAD_API_URL || 'https://processor-prod.up.railway.app';

// adedejijoshua41@gmail.com USDT details
const WALLET_ID = '6916515f41ddc0fb4463859a';  // Bread wallet ID for USDT
const BENEFICIARY_ID = '6914c062196a18d7bd5d70bd';  // Opay - 9071855613
const ASSET = 'solana:usdt';
const AMOUNT = 48.265;  // USDT in Bread wallet

async function executeOfframp() {
  console.log('\n🚀 Manual Offramp for adedejijoshua41@gmail.com (USDT)');
  console.log('='.repeat(50));
  console.log('Wallet ID:', WALLET_ID);
  console.log('Beneficiary ID:', BENEFICIARY_ID);
  console.log('Asset:', ASSET);
  console.log('Amount:', AMOUNT, 'USDT');
  console.log('Bank: Opay - 9071855613');
  console.log('='.repeat(50));

  // Try different amounts
  const amounts = [48.265, 48, 47, 45, 40];

  for (const amount of amounts) {
    try {
      console.log(`\n💸 Trying offramp with ${amount} USDT...`);
      const response = await axios.post(
        `${BREAD_API_URL}/offramp`,
        {
          wallet_id: WALLET_ID,
          beneficiary_id: BENEFICIARY_ID,
          asset: ASSET,
          amount: amount,
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
      break; // Success, stop trying
    } catch (error) {
      console.error('❌ Error:', error.response?.data?.message || error.message);
    }
  }
}

executeOfframp();

