require('dotenv').config();
const { ethers } = require('ethers');

async function checkGasSponsorBalances() {
  console.log('\n🔍 Checking Gas Sponsor Wallet Balances...\n');

  const gasSponsorAddress = process.env.BASE_GAS_SPONSOR_ADDRESS || process.env.POLYGON_GAS_SPONSOR_ADDRESS;
  
  if (!gasSponsorAddress) {
    console.error('❌ Gas sponsor address not found in .env');
    process.exit(1);
  }

  console.log(`📍 Gas Sponsor Address: ${gasSponsorAddress}\n`);

  // Check Base
  try {
    const baseProvider = new ethers.JsonRpcProvider(process.env.BASE_RPC_URL);
    const baseBalance = await baseProvider.getBalance(gasSponsorAddress);
    const baseEth = ethers.formatEther(baseBalance);
    console.log(`✅ Base Network:`);
    console.log(`   Balance: ${baseEth} ETH`);
    console.log(`   USD Value: ~$${(parseFloat(baseEth) * 3500).toFixed(2)}`);
    console.log(`   Status: ${parseFloat(baseEth) >= 0.01 ? '✅ Sufficient' : '⚠️ Low (need 0.01 ETH)'}`);
  } catch (error) {
    console.error(`❌ Base Network Error: ${error.message}`);
  }

  console.log('');

  // Check Polygon
  try {
    const polygonProvider = new ethers.JsonRpcProvider(process.env.POLYGON_RPC_URL);
    const polygonBalance = await polygonProvider.getBalance(gasSponsorAddress);
    const polygonMatic = ethers.formatEther(polygonBalance);
    console.log(`✅ Polygon Network:`);
    console.log(`   Balance: ${polygonMatic} MATIC`);
    console.log(`   USD Value: ~$${(parseFloat(polygonMatic) * 0.85).toFixed(2)}`);
    console.log(`   Status: ${parseFloat(polygonMatic) >= 10 ? '✅ Sufficient' : '⚠️ Low (need 10 MATIC)'}`);
  } catch (error) {
    console.error(`❌ Polygon Network Error: ${error.message}`);
  }

  console.log('\n✅ Balance check complete!\n');
}

checkGasSponsorBalances().catch(console.error);

