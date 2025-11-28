import { ethers } from 'ethers';
import { Connection, PublicKey } from '@solana/web3.js';
import 'dotenv/config';

const ADDRESS = '0xca153EA8BA71453BfAf201F327deC616E5c4d49a';

async function checkAllNetworks() {
  console.log('\n🔍 CHECKING ALL NETWORKS FOR DEPOSITS\n');
  console.log('Address:', ADDRESS);
  console.log('='.repeat(80));

  // Check Base
  console.log('\n🔵 BASE NETWORK:');
  try {
    const baseProvider = new ethers.JsonRpcProvider('https://mainnet.base.org');
    const baseBalance = await baseProvider.getBalance(ADDRESS);
    const baseETH = ethers.formatEther(baseBalance);
    console.log('   ETH Balance:', baseETH, 'ETH');
    console.log('   USD Value: ~$' + (parseFloat(baseETH) * 3500).toFixed(2));
    console.log('   Explorer: https://basescan.org/address/' + ADDRESS);
  } catch (error) {
    console.error('   ❌ Error:', error.message);
  }

  // Check Ethereum Mainnet
  console.log('\n⚪ ETHEREUM MAINNET:');
  try {
    const ethProvider = new ethers.JsonRpcProvider('https://eth.llamarpc.com');
    const ethBalance = await ethProvider.getBalance(ADDRESS);
    const ethETH = ethers.formatEther(ethBalance);
    console.log('   ETH Balance:', ethETH, 'ETH');
    console.log('   USD Value: ~$' + (parseFloat(ethETH) * 3500).toFixed(2));
    console.log('   Explorer: https://etherscan.io/address/' + ADDRESS);
  } catch (error) {
    console.error('   ❌ Error:', error.message);
  }

  // Check Polygon
  console.log('\n🟣 POLYGON NETWORK:');
  try {
    const polygonProvider = new ethers.JsonRpcProvider('https://polygon-rpc.com');
    const polygonBalance = await polygonProvider.getBalance(ADDRESS);
    const polygonMATIC = ethers.formatEther(polygonBalance);
    console.log('   MATIC Balance:', polygonMATIC, 'MATIC');
    console.log('   USD Value: ~$' + (parseFloat(polygonMATIC) * 1).toFixed(2));
    console.log('   Explorer: https://polygonscan.com/address/' + ADDRESS);
  } catch (error) {
    console.error('   ❌ Error:', error.message);
  }

  // Check Arbitrum
  console.log('\n🔷 ARBITRUM NETWORK:');
  try {
    const arbProvider = new ethers.JsonRpcProvider('https://arb1.arbitrum.io/rpc');
    const arbBalance = await arbProvider.getBalance(ADDRESS);
    const arbETH = ethers.formatEther(arbBalance);
    console.log('   ETH Balance:', arbETH, 'ETH');
    console.log('   USD Value: ~$' + (parseFloat(arbETH) * 3500).toFixed(2));
    console.log('   Explorer: https://arbiscan.io/address/' + ADDRESS);
  } catch (error) {
    console.error('   ❌ Error:', error.message);
  }

  // Check Optimism
  console.log('\n🔴 OPTIMISM NETWORK:');
  try {
    const opProvider = new ethers.JsonRpcProvider('https://mainnet.optimism.io');
    const opBalance = await opProvider.getBalance(ADDRESS);
    const opETH = ethers.formatEther(opBalance);
    console.log('   ETH Balance:', opETH, 'ETH');
    console.log('   USD Value: ~$' + (parseFloat(opETH) * 3500).toFixed(2));
    console.log('   Explorer: https://optimistic.etherscan.io/address/' + ADDRESS);
  } catch (error) {
    console.error('   ❌ Error:', error.message);
  }

  // Check BNB Chain
  console.log('\n🟡 BNB CHAIN:');
  try {
    const bnbProvider = new ethers.JsonRpcProvider('https://bsc-dataseed.binance.org');
    const bnbBalance = await bnbProvider.getBalance(ADDRESS);
    const bnbBNB = ethers.formatEther(bnbBalance);
    console.log('   BNB Balance:', bnbBNB, 'BNB');
    console.log('   USD Value: ~$' + (parseFloat(bnbBNB) * 600).toFixed(2));
    console.log('   Explorer: https://bscscan.com/address/' + ADDRESS);
  } catch (error) {
    console.error('   ❌ Error:', error.message);
  }

  console.log('\n' + '='.repeat(80));
  console.log('\n💡 TIP: If you see a balance on the wrong network, you sent to the');
  console.log('   correct address but on the WRONG NETWORK. You need to send on BASE.');
}

checkAllNetworks();

