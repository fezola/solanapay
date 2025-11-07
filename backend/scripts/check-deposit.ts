#!/usr/bin/env tsx
/**
 * Check if a deposit address has received USDC
 */

import { Connection, PublicKey } from '@solana/web3.js';
import { env } from '../src/config/env';

const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';

async function checkDeposit(address: string) {
  console.log(`\n🔍 Checking USDC balance for: ${address}\n`);
  
  const connection = new Connection(env.SOLANA_RPC_URL, 'finalized');
  
  try {
    // Get token accounts for this address
    const pubkey = new PublicKey(address);
    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
      pubkey,
      { mint: new PublicKey(USDC_MINT) }
    );
    
    if (tokenAccounts.value.length === 0) {
      console.log('❌ No USDC token account found');
      console.log('   This means no USDC has ever been deposited to this address');
      return;
    }
    
    for (const account of tokenAccounts.value) {
      const balance = account.account.data.parsed.info.tokenAmount.uiAmount;
      console.log(`✅ USDC Balance: ${balance} USDC`);
      
      if (balance === 0) {
        console.log('   ⚠️  Balance is 0 - funds may have been swept already');
      }
    }
    
    // Get recent transactions
    console.log('\n📜 Recent transactions:');
    const signatures = await connection.getSignaturesForAddress(pubkey, { limit: 5 });
    
    if (signatures.length === 0) {
      console.log('   No transactions found');
    } else {
      for (const sig of signatures) {
        console.log(`   - ${sig.signature}`);
        console.log(`     Time: ${new Date(sig.blockTime! * 1000).toISOString()}`);
        console.log(`     Status: ${sig.err ? 'Failed' : 'Success'}`);
      }
    }
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
  }
}

// Check the USDC deposit address
const depositAddress = 'An3XCzaVEj2jbCU8qgLW4C4WKKZdt2Y5YX88bx4ePSGa';
checkDeposit(depositAddress);

