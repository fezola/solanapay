import { ethers } from 'ethers';

const ADDRESS = '0x05a2e4f5679f6280a1b1863882c9729dbf04929d';
const PRIVATE_KEY = '0bc02f499b4ea7cf50715366bea602c2ec6d82f84fac98bd1ee820fd04d9922f';

async function checkWallet() {
  console.log('\n💰 CHECKING WALLET BALANCE ACROSS ALL NETWORKS\n');
  console.log('Address:', ADDRESS);
  console.log('='.repeat(80));

  // Verify private key matches address
  console.log('\n🔐 Verifying Private Key...');
  try {
    const wallet = new ethers.Wallet('0x' + PRIVATE_KEY);
    console.log('   Derived Address:', wallet.address);
    console.log('   Match:', wallet.address.toLowerCase() === ADDRESS.toLowerCase() ? '✅ YES' : '❌ NO');
  } catch (error) {
    console.error('   ❌ Invalid private key:', error.message);
  }

  const networks = [
    { name: 'BASE', rpc: 'https://mainnet.base.org', explorer: 'https://basescan.org/address/', symbol: 'ETH', price: 3500 },
    { name: 'ETHEREUM', rpc: 'https://cloudflare-eth.com', explorer: 'https://etherscan.io/address/', symbol: 'ETH', price: 3500 },
    { name: 'POLYGON', rpc: 'https://polygon-rpc.com', explorer: 'https://polygonscan.com/address/', symbol: 'MATIC', price: 1 },
    { name: 'ARBITRUM', rpc: 'https://arb1.arbitrum.io/rpc', explorer: 'https://arbiscan.io/address/', symbol: 'ETH', price: 3500 },
    { name: 'OPTIMISM', rpc: 'https://mainnet.optimism.io', explorer: 'https://optimistic.etherscan.io/address/', symbol: 'ETH', price: 3500 },
  ];

  let totalUSD = 0;

  for (const network of networks) {
    console.log(`\n${network.name}:`);
    try {
      const provider = new ethers.JsonRpcProvider(network.rpc);
      const balance = await provider.getBalance(ADDRESS);
      const formatted = ethers.formatEther(balance);
      const usdValue = parseFloat(formatted) * network.price;
      totalUSD += usdValue;

      console.log(`   ${network.symbol} Balance: ${formatted} ${network.symbol}`);
      console.log(`   USD Value: $${usdValue.toFixed(2)}`);
      console.log(`   Explorer: ${network.explorer}${ADDRESS}`);

      if (parseFloat(formatted) > 0) {
        console.log('   ✅ HAS FUNDS!');
      }
    } catch (error) {
      console.error(`   ❌ Error: ${error.message}`);
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log(`\n💵 TOTAL VALUE: $${totalUSD.toFixed(2)} USD`);

  if (totalUSD > 0) {
    console.log('\n✅ This wallet has funds! You can use it for gas fees.');
  } else {
    console.log('\n❌ This wallet is empty on all checked networks.');
  }
}

checkWallet();

