import { ethers } from 'ethers';
import fs from 'fs';

/**
 * Generate NEW dedicated gas sponsor wallets for Base and Polygon
 * 
 * SECURITY:
 * - These wallets should ONLY hold ETH/MATIC for gas fees
 * - NEVER use personal wallets for this purpose
 * - Keep private keys secure and NEVER commit to GitHub
 */

console.log('\n🔐 Generating NEW Gas Sponsor Wallets...\n');
console.log('⚠️  IMPORTANT: These wallets are ONLY for paying gas fees!');
console.log('⚠️  DO NOT use personal wallets - generate fresh ones!\n');

// Generate Base gas sponsor wallet
const baseWallet = ethers.Wallet.createRandom();
console.log('✅ Base Gas Sponsor Wallet Generated:');
console.log('   Address:', baseWallet.address);
console.log('   Private Key:', baseWallet.privateKey);
console.log('');

// Generate Polygon gas sponsor wallet
const polygonWallet = ethers.Wallet.createRandom();
console.log('✅ Polygon Gas Sponsor Wallet Generated:');
console.log('   Address:', polygonWallet.address);
console.log('   Private Key:', polygonWallet.privateKey);
console.log('');

// Create backup file (NEVER commit this!)
const backup = {
  generated_at: new Date().toISOString(),
  warning: 'NEVER COMMIT THIS FILE TO GITHUB! Keep it secure!',
  base: {
    address: baseWallet.address,
    private_key: baseWallet.privateKey,
    purpose: 'Pay gas fees for Base offramp transactions',
    required_balance: '0.01 ETH (~$35)',
  },
  polygon: {
    address: polygonWallet.address,
    private_key: polygonWallet.privateKey,
    purpose: 'Pay gas fees for Polygon offramp transactions',
    required_balance: '10 MATIC (~$8.50)',
  },
};

const backupPath = 'backend/wallet-backups/gas-sponsor-wallets.json';
fs.mkdirSync('backend/wallet-backups', { recursive: true });
fs.writeFileSync(backupPath, JSON.stringify(backup, null, 2));

console.log('💾 Backup saved to:', backupPath);
console.log('⚠️  This file is in .gitignore - keep it safe!\n');

console.log('📝 Next Steps:\n');
console.log('1. Copy the private keys to your .env file:');
console.log('   BASE_GAS_SPONSOR_ADDRESS=' + baseWallet.address);
console.log('   BASE_GAS_SPONSOR_PRIVATE_KEY=' + baseWallet.privateKey);
console.log('   POLYGON_GAS_SPONSOR_ADDRESS=' + polygonWallet.address);
console.log('   POLYGON_GAS_SPONSOR_PRIVATE_KEY=' + polygonWallet.privateKey);
console.log('');
console.log('2. Fund the wallets:');
console.log('   Base: Send 0.01 ETH to', baseWallet.address, '(on Base network)');
console.log('   Polygon: Send 10 MATIC to', polygonWallet.address, '(on Polygon network)');
console.log('');
console.log('3. Add to Render environment variables (same 4 variables)');
console.log('');
console.log('4. NEVER share these private keys with anyone!');
console.log('');

