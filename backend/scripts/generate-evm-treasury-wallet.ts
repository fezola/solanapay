/**
 * Generate a new EVM treasury wallet for platform fee collection (Base & Polygon)
 * 
 * Usage: npx ts-node scripts/generate-evm-treasury-wallet.ts
 */

import { ethers } from 'ethers';

function generateWallet() {
  console.log('\n🔐 Generating new EVM Treasury Wallet (for Base & Polygon)...\n');
  console.log('='.repeat(70));

  // Generate new random wallet
  const wallet = ethers.Wallet.createRandom();
  
  // Get public address
  const publicAddress = wallet.address;
  
  // Get private key
  const privateKey = wallet.privateKey;

  console.log('\n📍 PUBLIC ADDRESS (use this for PLATFORM_TREASURY_ADDRESS_BASE & POLYGON):');
  console.log(`   ${publicAddress}`);
  
  console.log('\n🔑 PRIVATE KEY (save this securely - you need it to access funds):');
  console.log(`   ${privateKey}`);

  console.log('\n' + '='.repeat(70));
  console.log('\n⚠️  IMPORTANT: Save your private key securely!');
  console.log('   - Never share it with anyone');
  console.log('   - Store it in a password manager or secure location');
  console.log('   - You can import it into MetaMask using the private key\n');

  console.log('\n📋 ENVIRONMENT VARIABLES TO SET ON RENDER:');
  console.log(`   PLATFORM_TREASURY_ADDRESS_BASE=${publicAddress}`);
  console.log(`   PLATFORM_TREASURY_ADDRESS_POLYGON=${publicAddress}\n`);

  return {
    publicAddress,
    privateKey,
  };
}

// Run the generator
generateWallet();

