import { ethers } from 'ethers';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '../.env') });

async function checkTreasuryBalances() {
  console.log('🔍 Checking Treasury Wallet Balances...\n');

  // Base Treasury
  const baseAddress = process.env.BASE_TREASURY_ADDRESS;
  const baseRpc = process.env.BASE_RPC_URL;

  if (baseAddress && baseRpc) {
    try {
      const baseProvider = new ethers.JsonRpcProvider(baseRpc);
      const ethBalance = await baseProvider.getBalance(baseAddress);
      const ethBalanceFormatted = ethers.formatEther(ethBalance);
      
      console.log('💎 BASE TREASURY:');
      console.log(`   Address: ${baseAddress}`);
      console.log(`   ETH Balance: ${ethBalanceFormatted} ETH`);
      
      // Get ETH price estimate (rough estimate)
      const ethPriceUSD = 3500; // Approximate
      const usdValue = parseFloat(ethBalanceFormatted) * ethPriceUSD;
      console.log(`   USD Value: ~$${usdValue.toFixed(2)}\n`);
    } catch (error) {
      console.error('❌ Error checking Base treasury:', error);
    }
  }

  // Polygon Treasury
  const polygonAddress = process.env.POLYGON_TREASURY_ADDRESS;
  const polygonRpc = process.env.POLYGON_RPC_URL;

  if (polygonAddress && polygonRpc) {
    try {
      const polygonProvider = new ethers.JsonRpcProvider(polygonRpc);
      const maticBalance = await polygonProvider.getBalance(polygonAddress);
      const maticBalanceFormatted = ethers.formatEther(maticBalance);
      
      console.log('🟣 POLYGON TREASURY:');
      console.log(`   Address: ${polygonAddress}`);
      console.log(`   MATIC Balance: ${maticBalanceFormatted} MATIC`);
      
      // Get MATIC price estimate (rough estimate)
      const maticPriceUSD = 0.50; // Approximate
      const usdValue = parseFloat(maticBalanceFormatted) * maticPriceUSD;
      console.log(`   USD Value: ~$${usdValue.toFixed(2)}\n`);
    } catch (error) {
      console.error('❌ Error checking Polygon treasury:', error);
    }
  }

  // Solana Treasury (if you want to check it too)
  console.log('☀️ SOLANA TREASURY:');
  console.log(`   Address: ${process.env.SOLANA_TREASURY_ADDRESS}`);
  console.log(`   (Check balance on Solana explorer)\n`);
}

checkTreasuryBalances().catch(console.error);

