/**
 * Check all treasury wallet balances
 */

import { ethers } from 'ethers';
import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import 'dotenv/config';

const BASE_RPC = 'https://mainnet.base.org';
const POLYGON_RPC = 'https://polygon-rpc.com';
const SOLANA_RPC = 'https://api.mainnet-beta.solana.com';

const BASE_TREASURY = '0xca153EA8BA71453BfAf201F327deC616E5c4d49a';
const POLYGON_TREASURY = '0xca153EA8BA71453BfAf201F327deC616E5c4d49a';
const SOLANA_TREASURY = 'CmZzUSAux8ahGDrPfLEx8c3oJMKSisycMqUdx8ZSDRbW';

async function checkTreasuryBalances() {
  console.log('\n💰 TREASURY WALLET BALANCES\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Base Treasury
  console.log('🔵 BASE TREASURY');
  console.log('   Address:', BASE_TREASURY);
  try {
    const baseProvider = new ethers.JsonRpcProvider(BASE_RPC);
    const baseBalance = await baseProvider.getBalance(BASE_TREASURY);
    const baseETH = parseFloat(ethers.formatEther(baseBalance));
    console.log('   ETH Balance:', baseETH.toFixed(9), 'ETH');
    console.log('   View:', `https://basescan.org/address/${BASE_TREASURY}`);
    
    if (baseETH < 0.001) {
      console.log('   ⚠️  WARNING: Low balance! Need at least 0.001 ETH for gas fees');
    }
  } catch (error) {
    console.log('   ❌ Error:', error.message);
  }
  console.log('');

  // Polygon Treasury
  console.log('🟣 POLYGON TREASURY');
  console.log('   Address:', POLYGON_TREASURY);
  try {
    const polygonProvider = new ethers.JsonRpcProvider(POLYGON_RPC);
    const polygonBalance = await polygonProvider.getBalance(POLYGON_TREASURY);
    const polygonMATIC = parseFloat(ethers.formatEther(polygonBalance));
    console.log('   MATIC Balance:', polygonMATIC.toFixed(9), 'MATIC');
    console.log('   View:', `https://polygonscan.com/address/${POLYGON_TREASURY}`);
    
    if (polygonMATIC < 0.1) {
      console.log('   ⚠️  WARNING: Low balance! Need at least 0.1 MATIC for gas fees');
    }
  } catch (error) {
    console.log('   ❌ Error:', error.message);
  }
  console.log('');

  // Solana Treasury
  console.log('🟠 SOLANA TREASURY');
  console.log('   Address:', SOLANA_TREASURY);
  try {
    const connection = new Connection(SOLANA_RPC);
    const publicKey = new PublicKey(SOLANA_TREASURY);
    const balance = await connection.getBalance(publicKey);
    const sol = balance / LAMPORTS_PER_SOL;
    console.log('   SOL Balance:', sol.toFixed(9), 'SOL');
    console.log('   View:', `https://solscan.io/account/${SOLANA_TREASURY}`);
    
    if (sol < 0.1) {
      console.log('   ⚠️  WARNING: Low balance! Need at least 0.1 SOL for gas fees');
    }
  } catch (error) {
    console.log('   ❌ Error:', error.message);
  }
  console.log('');

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('📋 FUNDING INSTRUCTIONS:\n');
  console.log('To fund Base treasury:');
  console.log('   Send 0.01 ETH to', BASE_TREASURY);
  console.log('   Network: Base (Ethereum L2)');
  console.log('   Estimated cost: ~$30 USD\n');
  
  console.log('To fund Polygon treasury:');
  console.log('   Send 10 MATIC to', POLYGON_TREASURY);
  console.log('   Network: Polygon');
  console.log('   Estimated cost: ~$5 USD\n');
  
  console.log('To fund Solana treasury:');
  console.log('   Send 0.5 SOL to', SOLANA_TREASURY);
  console.log('   Network: Solana');
  console.log('   Estimated cost: ~$100 USD\n');
}

checkTreasuryBalances().catch(console.error);

