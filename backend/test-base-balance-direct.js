/**
 * Test Base USDC Balance Directly
 */

import { ethers } from 'ethers';
import 'dotenv/config';

const BASE_RPC_URL = process.env.BASE_RPC_URL || 'https://mainnet.base.org';
const BASE_USDC_CONTRACT = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
const PATRICK_WALLET = '0xD526b36b8eb47695e56DCc84c73a6207d51dc158';

const ERC20_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
];

async function testBalance() {
  console.log('\n🔍 Testing Base USDC Balance Directly...\n');
  console.log(`RPC URL: ${BASE_RPC_URL}`);
  console.log(`USDC Contract: ${BASE_USDC_CONTRACT}`);
  console.log(`Wallet: ${PATRICK_WALLET}\n`);

  try {
    const provider = new ethers.JsonRpcProvider(BASE_RPC_URL);
    const usdcContract = new ethers.Contract(BASE_USDC_CONTRACT, ERC20_ABI, provider);

    console.log('Fetching balance...');
    const balance = await usdcContract.balanceOf(PATRICK_WALLET);
    const decimals = await usdcContract.decimals();
    
    console.log(`Raw balance: ${balance.toString()}`);
    console.log(`Decimals: ${decimals}`);
    
    const balanceFormatted = ethers.formatUnits(balance, decimals);
    const balanceNumber = parseFloat(balanceFormatted);
    
    console.log(`Formatted balance: ${balanceFormatted} USDC`);
    console.log(`As number: ${balanceNumber}`);

    if (balanceNumber === 2.0) {
      console.log('\n✅ Balance is correct: 2.0 USDC');
      console.log('   The backend balance fetching code should work.');
      console.log('   The issue might be:');
      console.log('   1. Frontend not calling the API');
      console.log('   2. Frontend not displaying the balance');
      console.log('   3. User not logged in / session expired');
    } else {
      console.log(`\n⚠️  Balance is ${balanceNumber} USDC (expected 2.0)`);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testBalance()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });

