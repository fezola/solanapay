import { ethers } from 'ethers';

const BASE_RPC_URL = 'https://mainnet.base.org';
const BASE_TREASURY_ADDRESS = '0xca153EA8BA71453BfAf201F327deC616E5c4d49a';

async function verifyBaseETH() {
  console.log('\n🔍 Verifying Base ETH Deposit...\n');
  console.log('Expected Treasury Address:', BASE_TREASURY_ADDRESS);
  console.log('');

  try {
    const provider = new ethers.JsonRpcProvider(BASE_RPC_URL);

    // Check ETH balance
    const ethBalance = await provider.getBalance(BASE_TREASURY_ADDRESS);
    const ethBalanceFormatted = ethers.formatEther(ethBalance);
    
    console.log('💰 Current ETH Balance:', ethBalanceFormatted, 'ETH');
    
    if (parseFloat(ethBalanceFormatted) === 0) {
      console.log('\n❌ NO ETH FOUND IN TREASURY WALLET!');
      console.log('\n⚠️  You need to send ETH to THIS address on Base network:');
      console.log(`   ${BASE_TREASURY_ADDRESS}`);
      console.log('\nHow to send:');
      console.log('1. Open your wallet (MetaMask, Coinbase Wallet, etc.)');
      console.log('2. Make sure you are on BASE network');
      console.log('3. Send at least 0.01 ETH to the address above');
      console.log('4. Wait for confirmation');
      console.log('\nBase Network Details:');
      console.log('   Network Name: Base');
      console.log('   RPC URL: https://mainnet.base.org');
      console.log('   Chain ID: 8453');
      console.log('   Currency Symbol: ETH');
      console.log('   Block Explorer: https://basescan.org');
      console.log('\nCheck the address on BaseScan:');
      console.log(`   https://basescan.org/address/${BASE_TREASURY_ADDRESS}`);
    } else {
      const ethPriceUSD = 3500; // Approximate
      const usdValue = parseFloat(ethBalanceFormatted) * ethPriceUSD;
      console.log(`   USD Value: ~$${usdValue.toFixed(2)}`);
      console.log('\n✅ Treasury wallet has ETH! Ready for transactions.');
    }
  } catch (error) {
    console.error('❌ Error checking Base treasury:', error.message);
  }
}

verifyBaseETH();

