/**
 * Check Andrew's Bread wallet balance RIGHT NOW
 */

import { ethers } from 'ethers';
import 'dotenv/config';

const BASE_RPC = 'https://mainnet.base.org';
const USDC_BASE = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';

// Andrew's addresses
const DEPOSIT_ADDRESS = '0x9B627b77F9f99d3946A20829dcF182D708A83dbB';
const BREAD_WALLET = '0x3847E3697885AdDf7Fc8aBB987ea9CE6ca3b7209';

async function checkBalances() {
  console.log('\n🔍 CHECKING ANDREW\'S BASE BALANCES\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const provider = new ethers.JsonRpcProvider(BASE_RPC);
  const usdcContract = new ethers.Contract(
    USDC_BASE,
    ['function balanceOf(address) view returns (uint256)'],
    provider
  );

  // Check deposit address
  console.log('📍 DEPOSIT ADDRESS:', DEPOSIT_ADDRESS);
  const depositBalance = await usdcContract.balanceOf(DEPOSIT_ADDRESS);
  const depositUSDC = parseFloat(ethers.formatUnits(depositBalance, 6));
  console.log('   USDC Balance:', depositUSDC.toFixed(6), 'USDC');
  console.log('   View:', `https://basescan.org/address/${DEPOSIT_ADDRESS}`);
  console.log('');

  // Check Bread wallet
  console.log('📍 BREAD WALLET:', BREAD_WALLET);
  const breadBalance = await usdcContract.balanceOf(BREAD_WALLET);
  const breadUSDC = parseFloat(ethers.formatUnits(breadBalance, 6));
  console.log('   USDC Balance:', breadUSDC.toFixed(6), 'USDC');
  console.log('   View:', `https://basescan.org/address/${BREAD_WALLET}`);
  console.log('');

  // Total
  const total = depositUSDC + breadUSDC;
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('💰 TOTAL:', total.toFixed(6), 'USDC');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  if (breadUSDC === 0) {
    console.log('❌ PROBLEM: Bread wallet is EMPTY!');
    console.log('   The USDC might have been moved or spent.');
    console.log('');
  } else if (breadUSDC < 4.99) {
    console.log('⚠️  WARNING: Bread wallet has less than expected!');
    console.log('   Expected: ~4.997 USDC');
    console.log('   Actual:', breadUSDC.toFixed(6), 'USDC');
    console.log('');
  } else {
    console.log('✅ Bread wallet has the expected balance!');
    console.log('');
  }
}

checkBalances().catch(console.error);

