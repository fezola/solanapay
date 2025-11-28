import { ethers } from 'ethers';
import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';

// The two treasury wallets
const WALLET_1 = '0xca153EA8BA71453BfAf201F327deC616E5c4d49a'; // Current in .env
const WALLET_2 = '0x2d5A5abf52eCcf1e2Ad8C7D52D4Be903FEf63410'; // The one you mentioned

const BASE_RPC = 'https://mainnet.base.org';
const POLYGON_RPC = 'https://polygon-rpc.com';

const ERC20_ABI = ['function balanceOf(address) view returns (uint256)'];
const BASE_USDC = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
const POLYGON_USDC = '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359';

async function checkBothWallets() {
  console.log('\n🔍 CHECKING BOTH TREASURY WALLETS\n');
  console.log('='.repeat(80));

  for (const wallet of [WALLET_1, WALLET_2]) {
    console.log(`\n📍 WALLET: ${wallet}`);
    console.log('-'.repeat(80));

    // BASE
    try {
      const baseProvider = new ethers.JsonRpcProvider(BASE_RPC);
      const ethBalance = await baseProvider.getBalance(wallet);
      const ethFormatted = ethers.formatEther(ethBalance);
      
      const usdcContract = new ethers.Contract(BASE_USDC, ERC20_ABI, baseProvider);
      const usdcBalance = await usdcContract.balanceOf(wallet);
      const usdcFormatted = ethers.formatUnits(usdcBalance, 6);
      
      console.log(`\n  💎 BASE:`);
      console.log(`     ETH: ${ethFormatted} ETH (~$${(parseFloat(ethFormatted) * 3500).toFixed(2)})`);
      console.log(`     USDC: ${usdcFormatted} USDC`);
      console.log(`     BaseScan: https://basescan.org/address/${wallet}`);
    } catch (error) {
      console.error(`  ❌ Base error:`, error.message);
    }

    // POLYGON
    try {
      const polygonProvider = new ethers.JsonRpcProvider(POLYGON_RPC);
      const maticBalance = await polygonProvider.getBalance(wallet);
      const maticFormatted = ethers.formatEther(maticBalance);
      
      const usdcContract = new ethers.Contract(POLYGON_USDC, ERC20_ABI, polygonProvider);
      const usdcBalance = await usdcContract.balanceOf(wallet);
      const usdcFormatted = ethers.formatUnits(usdcBalance, 6);
      
      console.log(`\n  🟣 POLYGON:`);
      console.log(`     MATIC: ${maticFormatted} MATIC (~$${(parseFloat(maticFormatted) * 0.8).toFixed(2)})`);
      console.log(`     USDC: ${usdcFormatted} USDC`);
      console.log(`     PolygonScan: https://polygonscan.com/address/${wallet}`);
    } catch (error) {
      console.error(`  ❌ Polygon error:`, error.message);
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('\n📋 SUMMARY:\n');
  console.log(`Wallet 1 (${WALLET_1}):`);
  console.log('  - This is currently in your .env file');
  console.log('  - Check balances above');
  console.log('');
  console.log(`Wallet 2 (${WALLET_2}):`);
  console.log('  - You mentioned this has $24 worth of funds');
  console.log('  - Check balances above');
  console.log('');
  console.log('NEXT STEPS:');
  console.log('1. Identify which wallet has the funds');
  console.log('2. Update Render environment variables to use that wallet');
  console.log('3. OR transfer funds from one wallet to the other');
  console.log('');
}

checkBothWallets();

