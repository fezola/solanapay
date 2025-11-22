import { ethers } from 'ethers';

const NEW_TREASURY = '0x2d5A5abf52eCcf1e2Ad8C7D52D4Be903FEf63410';

async function checkBalances() {
  console.log('🔍 Checking NEW Treasury Wallet Balances...\n');
  
  // Base
  try {
    const baseProvider = new ethers.JsonRpcProvider('https://mainnet.base.org');
    const ethBalance = await baseProvider.getBalance(NEW_TREASURY);
    const ethFormatted = ethers.formatEther(ethBalance);
    
    console.log('💎 BASE:');
    console.log(`   Address: ${NEW_TREASURY}`);
    console.log(`   ETH Balance: ${ethFormatted} ETH`);
    console.log(`   USD Value: ~$${(parseFloat(ethFormatted) * 3500).toFixed(2)}\n`);
  } catch (error) {
    console.error('❌ Error checking Base:', error.message);
  }
  
  // Polygon
  try {
    const polygonProvider = new ethers.JsonRpcProvider('https://polygon-rpc.com');
    const maticBalance = await polygonProvider.getBalance(NEW_TREASURY);
    const maticFormatted = ethers.formatEther(maticBalance);
    
    console.log('🟣 POLYGON:');
    console.log(`   Address: ${NEW_TREASURY}`);
    console.log(`   MATIC Balance: ${maticFormatted} MATIC`);
    console.log(`   USD Value: ~$${(parseFloat(maticFormatted) * 0.5).toFixed(2)}\n`);
  } catch (error) {
    console.error('❌ Error checking Polygon:', error.message);
  }
}

checkBalances();

