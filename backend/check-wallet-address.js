import { ethers } from 'ethers';

const privateKey = '0x01cc7ffdfbf1b1c52602eb71adf784411a3046fbee24f3e777bb3ebb1348cf72';

console.log('\n🔍 Checking wallet from private key...\n');

try {
  const wallet = new ethers.Wallet(privateKey);
  console.log('📍 EVM Address (Base/Polygon/Ethereum):', wallet.address);
  console.log('🔑 Private Key:', privateKey);
  console.log('');
  
  // Check if this matches your treasury
  if (wallet.address.toLowerCase() === '0xca153EA8BA71453BfAf201F327deC616E5c4d49a'.toLowerCase()) {
    console.log('✅ This matches your current Base/Polygon treasury!');
  } else {
    console.log('❌ This is a DIFFERENT wallet from your current treasury!');
    console.log('   Current treasury: 0xca153EA8BA71453BfAf201F327deC616E5c4d49a');
    console.log('   This wallet:      ' + wallet.address);
  }
} catch (error) {
  console.error('❌ Error:', error.message);
}

