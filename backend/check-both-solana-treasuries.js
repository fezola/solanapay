/**
 * Check BOTH Solana treasury addresses
 */

import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';

const SOLANA_RPC = 'https://api.mainnet-beta.solana.com';

const PLATFORM_TREASURY = 'CB7GgQd7nYJmXiVvHRRNsMX2bUYn6Z3roBgLg2DrZdGG';
const GAS_SPONSOR = 'CmZzUSAux8ahGDrPfLEx8c3oJMKSisycMqUdx8ZSDRbW';

async function checkBothTreasuries() {
  console.log('\n🔍 CHECKING BOTH SOLANA TREASURY ADDRESSES\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const connection = new Connection(SOLANA_RPC);

  // Check Platform Treasury
  console.log('💰 PLATFORM TREASURY (receives platform fees)');
  console.log('   Address:', PLATFORM_TREASURY);
  console.log('   Env var: PLATFORM_TREASURY_ADDRESS_SOLANA');
  try {
    const publicKey = new PublicKey(PLATFORM_TREASURY);
    const balance = await connection.getBalance(publicKey);
    const sol = balance / LAMPORTS_PER_SOL;
    console.log('   Balance:', sol.toFixed(9), 'SOL');
    console.log('   View:', `https://solscan.io/account/${PLATFORM_TREASURY}`);
    
    if (sol > 0) {
      console.log('   ✅ HAS FUNDS!');
    } else {
      console.log('   ❌ EMPTY');
    }
  } catch (error) {
    console.log('   ❌ Error:', error.message);
  }
  console.log('');

  // Check Gas Sponsor
  console.log('⛽ GAS SPONSOR WALLET (pays for gas fees)');
  console.log('   Address:', GAS_SPONSOR);
  console.log('   Env var: SOLANA_TREASURY_ADDRESS');
  try {
    const publicKey = new PublicKey(GAS_SPONSOR);
    const balance = await connection.getBalance(publicKey);
    const sol = balance / LAMPORTS_PER_SOL;
    console.log('   Balance:', sol.toFixed(9), 'SOL');
    console.log('   View:', `https://solscan.io/account/${GAS_SPONSOR}`);
    
    if (sol > 0) {
      console.log('   ✅ HAS FUNDS!');
    } else {
      console.log('   ❌ EMPTY - THIS IS WHY OFFRAMPS FAIL!');
    }
  } catch (error) {
    console.log('   ❌ Error:', error.message);
  }
  console.log('');

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('📋 SOLUTION:\n');
  console.log('If Platform Treasury has funds but Gas Sponsor is empty:');
  console.log('   Transfer SOL from Platform Treasury to Gas Sponsor\n');
  console.log('If both are empty:');
  console.log('   Fund the Gas Sponsor wallet with 0.5 SOL\n');
}

checkBothTreasuries().catch(console.error);

