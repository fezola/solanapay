import { ethers } from 'ethers';

const ADDRESS = '0xca153EA8BA71453BfAf201F327deC616E5c4d49a';

async function verifyAddress() {
  console.log('\n🔍 VERIFYING BASE TREASURY ADDRESS\n');
  console.log('='.repeat(80));

  // Check if address is valid
  console.log('\n1️⃣ Address Validation:');
  console.log('   Address:', ADDRESS);
  
  const isValid = ethers.isAddress(ADDRESS);
  console.log('   Valid Ethereum Address:', isValid ? '✅ YES' : '❌ NO');

  if (!isValid) {
    console.error('\n❌ INVALID ADDRESS! There is a typo in the address.');
    process.exit(1);
  }

  // Checksum version
  const checksumAddress = ethers.getAddress(ADDRESS);
  console.log('   Checksum Address:', checksumAddress);

  // Connect to Base
  console.log('\n2️⃣ Connecting to Base Network...');
  const provider = new ethers.JsonRpcProvider('https://mainnet.base.org');
  
  try {
    const network = await provider.getNetwork();
    console.log('   Network:', network.name);
    console.log('   Chain ID:', network.chainId.toString());
  } catch (error) {
    console.error('   ❌ Connection failed:', error.message);
  }

  // Check balance
  console.log('\n3️⃣ Checking Balance on Base...');
  try {
    const balance = await provider.getBalance(ADDRESS);
    const ethBalance = ethers.formatEther(balance);
    
    console.log('   ETH Balance:', ethBalance, 'ETH');
    console.log('   Wei Balance:', balance.toString(), 'wei');
    console.log('   USD Value: ~$' + (parseFloat(ethBalance) * 3500).toFixed(2));

    if (parseFloat(ethBalance) === 0) {
      console.log('\n❌ Balance is 0 ETH');
      console.log('\n   This address is VALID but has NO FUNDS.');
      console.log('   You need to send ETH to this address on BASE network.');
    } else {
      console.log('\n✅ Address has funds!');
    }

  } catch (error) {
    console.error('   ❌ Error checking balance:', error.message);
  }

  // Check transaction history
  console.log('\n4️⃣ Checking Transaction History...');
  try {
    const txCount = await provider.getTransactionCount(ADDRESS);
    console.log('   Transaction Count:', txCount);
    
    if (txCount === 0) {
      console.log('   ⚠️  This address has NEVER received any transactions on Base!');
    } else {
      console.log('   ✅ This address has', txCount, 'transactions');
    }
  } catch (error) {
    console.error('   ❌ Error:', error.message);
  }

  console.log('\n' + '='.repeat(80));
  console.log('\n🔗 LINKS:');
  console.log('   BaseScan:', 'https://basescan.org/address/' + ADDRESS);
  console.log('\n📋 TO SEND ETH TO THIS ADDRESS:');
  console.log('   1. Open your wallet (MetaMask, Coinbase Wallet, etc.)');
  console.log('   2. Switch to BASE network (Chain ID: 8453)');
  console.log('   3. Send ETH to:', ADDRESS);
  console.log('   4. Wait for confirmation');
  console.log('\n⚠️  IMPORTANT: Make sure you select BASE network, NOT Ethereum!');
}

verifyAddress();

