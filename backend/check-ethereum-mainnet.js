import { ethers } from 'ethers';

const ADDRESS = '0xca153EA8BA71453BfAf201F327deC616E5c4d49a';

async function checkEthereum() {
  console.log('\n⚪ CHECKING ETHEREUM MAINNET\n');
  console.log('Address:', ADDRESS);
  console.log('='.repeat(80));

  try {
    // Use Infura public endpoint
    const provider = new ethers.JsonRpcProvider('https://cloudflare-eth.com');
    
    console.log('\n⏳ Fetching balance...');
    const balance = await provider.getBalance(ADDRESS);
    const ethBalance = ethers.formatEther(balance);
    
    console.log('\n💰 ETH Balance:', ethBalance, 'ETH');
    console.log('💵 USD Value: ~$' + (parseFloat(ethBalance) * 3500).toFixed(2));
    console.log('\n🔗 View on Etherscan:');
    console.log('   https://etherscan.io/address/' + ADDRESS);

    if (parseFloat(ethBalance) > 0) {
      console.log('\n⚠️  WARNING: You sent ETH to ETHEREUM MAINNET!');
      console.log('   You need to send to BASE network, not Ethereum mainnet.');
      console.log('   The funds are safe but on the wrong network.');
      console.log('\n   Options:');
      console.log('   1. Bridge ETH from Ethereum to Base using https://bridge.base.org');
      console.log('   2. Or just send fresh ETH directly to Base network');
    } else {
      console.log('\n❌ No ETH found on Ethereum mainnet either.');
      console.log('\n   Did you get a transaction hash when you sent?');
      console.log('   Please provide the transaction hash so I can see where it went.');
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
  }
}

checkEthereum();

