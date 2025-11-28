import { ethers } from 'ethers';
import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import 'dotenv/config';

// Treasury addresses from .env
const BASE_TREASURY = process.env.BASE_TREASURY_ADDRESS || '0xca153EA8BA71453BfAf201F327deC616E5c4d49a';
const POLYGON_TREASURY = process.env.POLYGON_TREASURY_ADDRESS || '0xca153EA8BA71453BfAf201F327deC616E5c4d49a';
const SOLANA_TREASURY = process.env.SOLANA_TREASURY_ADDRESS || 'CmZzUSAux8ahGDrPfLEx8c3oJMKSisycMqUdx8ZSDRbW';

// RPC URLs
const BASE_RPC = 'https://mainnet.base.org';
const POLYGON_RPC = 'https://polygon-rpc.com';
const SOLANA_RPC = 'https://api.mainnet-beta.solana.com';

// Token contracts
const BASE_USDC = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
const POLYGON_USDC = '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359';
const SOLANA_USDC = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';

const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function decimals() view returns (uint8)',
];

async function checkAllTreasuries() {
  console.log('\n🔍 CHECKING ALL TREASURY WALLETS...\n');
  console.log('=' .repeat(80));

  // ============================================================================
  // BASE NETWORK
  // ============================================================================
  console.log('\n💎 BASE NETWORK');
  console.log('Address:', BASE_TREASURY);
  console.log('-'.repeat(80));

  try {
    const baseProvider = new ethers.JsonRpcProvider(BASE_RPC);
    
    // ETH balance
    const ethBalance = await baseProvider.getBalance(BASE_TREASURY);
    const ethFormatted = ethers.formatEther(ethBalance);
    console.log('  ETH Balance:', ethFormatted, 'ETH');
    console.log('  ETH USD Value: ~$' + (parseFloat(ethFormatted) * 3500).toFixed(2));
    
    // USDC balance
    const usdcContract = new ethers.Contract(BASE_USDC, ERC20_ABI, baseProvider);
    const usdcBalance = await usdcContract.balanceOf(BASE_TREASURY);
    const usdcFormatted = ethers.formatUnits(usdcBalance, 6);
    console.log('  USDC Balance:', usdcFormatted, 'USDC');
    
    console.log('\n  BaseScan:', `https://basescan.org/address/${BASE_TREASURY}`);
    
    if (parseFloat(ethFormatted) === 0) {
      console.log('\n  ❌ NO ETH FOR GAS! Send at least 0.01 ETH to this address on BASE network.');
    } else {
      console.log('\n  ✅ Has ETH for gas fees');
    }
  } catch (error) {
    console.error('  ❌ Error checking Base:', error.message);
  }

  // ============================================================================
  // POLYGON NETWORK
  // ============================================================================
  console.log('\n\n🟣 POLYGON NETWORK');
  console.log('Address:', POLYGON_TREASURY);
  console.log('-'.repeat(80));

  try {
    const polygonProvider = new ethers.JsonRpcProvider(POLYGON_RPC);
    
    // MATIC balance
    const maticBalance = await polygonProvider.getBalance(POLYGON_TREASURY);
    const maticFormatted = ethers.formatEther(maticBalance);
    console.log('  MATIC Balance:', maticFormatted, 'MATIC');
    console.log('  MATIC USD Value: ~$' + (parseFloat(maticFormatted) * 0.8).toFixed(2));
    
    // USDC balance
    const usdcContract = new ethers.Contract(POLYGON_USDC, ERC20_ABI, polygonProvider);
    const usdcBalance = await usdcContract.balanceOf(POLYGON_TREASURY);
    const usdcFormatted = ethers.formatUnits(usdcBalance, 6);
    console.log('  USDC Balance:', usdcFormatted, 'USDC');
    
    console.log('\n  PolygonScan:', `https://polygonscan.com/address/${POLYGON_TREASURY}`);
    
    if (parseFloat(maticFormatted) === 0) {
      console.log('\n  ❌ NO MATIC FOR GAS! Send at least 1 MATIC to this address on POLYGON network.');
    } else {
      console.log('\n  ✅ Has MATIC for gas fees');
    }
  } catch (error) {
    console.error('  ❌ Error checking Polygon:', error.message);
  }

  // ============================================================================
  // SOLANA NETWORK
  // ============================================================================
  console.log('\n\n☀️  SOLANA NETWORK');
  console.log('Address:', SOLANA_TREASURY);
  console.log('-'.repeat(80));

  try {
    const connection = new Connection(SOLANA_RPC, 'confirmed');
    const publicKey = new PublicKey(SOLANA_TREASURY);
    
    // SOL balance
    const solBalance = await connection.getBalance(publicKey);
    const solFormatted = (solBalance / LAMPORTS_PER_SOL).toFixed(4);
    console.log('  SOL Balance:', solFormatted, 'SOL');
    console.log('  SOL USD Value: ~$' + (parseFloat(solFormatted) * 200).toFixed(2));
    
    // USDC balance
    const usdcMint = new PublicKey(SOLANA_USDC);
    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(publicKey, {
      mint: usdcMint,
    });
    
    if (tokenAccounts.value.length > 0) {
      const usdcBalance = tokenAccounts.value[0].account.data.parsed.info.tokenAmount.uiAmount;
      console.log('  USDC Balance:', usdcBalance, 'USDC');
    } else {
      console.log('  USDC Balance: 0 USDC (no token account)');
    }
    
    console.log('\n  Solscan:', `https://solscan.io/address/${SOLANA_TREASURY}`);
    
    if (parseFloat(solFormatted) < 0.01) {
      console.log('\n  ❌ LOW SOL FOR GAS! Send at least 0.1 SOL to this address.');
    } else {
      console.log('\n  ✅ Has SOL for gas fees');
    }
  } catch (error) {
    console.error('  ❌ Error checking Solana:', error.message);
  }

  // ============================================================================
  // SUMMARY
  // ============================================================================
  console.log('\n\n' + '='.repeat(80));
  console.log('📋 SUMMARY - WHERE TO SEND FUNDS:');
  console.log('='.repeat(80));
  console.log('\n1. BASE (for ETH gas):');
  console.log(`   Address: ${BASE_TREASURY}`);
  console.log('   Network: Base (Chain ID 8453)');
  console.log('   Send: ETH (at least 0.01 ETH)');
  console.log('   Verify: https://basescan.org/address/' + BASE_TREASURY);
  
  console.log('\n2. POLYGON (for MATIC gas):');
  console.log(`   Address: ${POLYGON_TREASURY}`);
  console.log('   Network: Polygon (Chain ID 137)');
  console.log('   Send: MATIC (at least 1 MATIC)');
  console.log('   Verify: https://polygonscan.com/address/' + POLYGON_TREASURY);
  
  console.log('\n3. SOLANA (for SOL gas):');
  console.log(`   Address: ${SOLANA_TREASURY}`);
  console.log('   Network: Solana');
  console.log('   Send: SOL (at least 0.1 SOL)');
  console.log('   Verify: https://solscan.io/address/' + SOLANA_TREASURY);
  
  console.log('\n' + '='.repeat(80));
  console.log('\n');
}

checkAllTreasuries();

