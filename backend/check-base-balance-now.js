import { ethers } from 'ethers';

const ADDRESS = '0xca153EA8BA71453BfAf201F327deC616E5c4d49a';

async function checkBalance() {
  console.log('\n🔵 CHECKING BASE TREASURY BALANCE NOW\n');
  console.log('Address:', ADDRESS);
  console.log('='.repeat(80));

  // Try multiple Base RPC endpoints
  const rpcEndpoints = [
    'https://mainnet.base.org',
    'https://base.llamarpc.com',
    'https://base-mainnet.public.blastapi.io',
    'https://1rpc.io/base',
  ];

  for (const rpc of rpcEndpoints) {
    console.log(`\n🔗 Trying RPC: ${rpc}`);
    try {
      const provider = new ethers.JsonRpcProvider(rpc, undefined, { timeout: 10000 });
      
      // Get balance
      const balance = await provider.getBalance(ADDRESS);
      const ethBalance = ethers.formatEther(balance);
      
      console.log('   ✅ Connected!');
      console.log('   ETH Balance:', ethBalance, 'ETH');
      console.log('   Wei Balance:', balance.toString(), 'wei');
      console.log('   USD Value: ~$' + (parseFloat(ethBalance) * 3500).toFixed(2));

      // Get transaction count
      const txCount = await provider.getTransactionCount(ADDRESS);
      console.log('   Transaction Count:', txCount);

      // Get latest block
      const blockNumber = await provider.getBlockNumber();
      console.log('   Latest Block:', blockNumber);

      if (parseFloat(ethBalance) > 0) {
        console.log('\n   ✅ WALLET HAS FUNDS!');
      } else {
        console.log('\n   ❌ WALLET IS EMPTY (0 ETH)');
      }

      // Success - stop trying other RPCs
      break;

    } catch (error) {
      console.error('   ❌ Failed:', error.message);
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('\n🔗 BaseScan Link:');
  console.log('   https://basescan.org/address/' + ADDRESS);
  console.log('\n💡 Check BaseScan to see transaction history and confirm balance.');
}

checkBalance();

