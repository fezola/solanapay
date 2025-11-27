import { ethers } from 'ethers';
import 'dotenv/config';

const BASE_RPC_URL = process.env.BASE_RPC_URL || 'https://mainnet.base.org';
const BASE_TREASURY_PRIVATE_KEY = process.env.BASE_TREASURY_PRIVATE_KEY;
const BASE_USDC_CONTRACT = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';

async function checkBaseTreasury() {
  console.log('\n🔍 Checking Base Treasury Wallet...\n');

  if (!BASE_TREASURY_PRIVATE_KEY) {
    console.log('❌ BASE_TREASURY_PRIVATE_KEY not set in .env');
    console.log('\nYou need to:');
    console.log('1. Create a new wallet for Base treasury');
    console.log('2. Add BASE_TREASURY_PRIVATE_KEY to .env');
    console.log('3. Fund it with ETH for gas fees');
    return;
  }

  try {
    const provider = new ethers.JsonRpcProvider(BASE_RPC_URL);
    const wallet = new ethers.Wallet(BASE_TREASURY_PRIVATE_KEY, provider);

    console.log('📍 Base Treasury Address:', wallet.address);
    console.log('');

    // Check ETH balance
    const ethBalance = await provider.getBalance(wallet.address);
    const ethBalanceFormatted = ethers.formatEther(ethBalance);
    console.log('💰 ETH Balance:', ethBalanceFormatted, 'ETH');

    // Check if balance is sufficient for gas
    const minEthNeeded = 0.001; // Minimum 0.001 ETH recommended
    if (parseFloat(ethBalanceFormatted) < minEthNeeded) {
      console.log(`⚠️  WARNING: ETH balance is too low! Need at least ${minEthNeeded} ETH for gas fees.`);
      console.log('');
      console.log('🚨 THIS IS WHY OFFRAMPS ARE FAILING!');
      console.log('');
      console.log('To fix:');
      console.log(`1. Send at least ${minEthNeeded} ETH to: ${wallet.address}`);
      console.log('2. You can bridge ETH to Base at: https://bridge.base.org');
      console.log('3. Or buy ETH directly on Base');
    } else {
      console.log('✅ ETH balance is sufficient for gas fees');
    }

    console.log('');

    // Check USDC balance
    const usdcAbi = [
      'function balanceOf(address) view returns (uint256)',
      'function decimals() view returns (uint8)',
    ];
    const usdcContract = new ethers.Contract(BASE_USDC_CONTRACT, usdcAbi, provider);
    const usdcBalance = await usdcContract.balanceOf(wallet.address);
    const decimals = await usdcContract.decimals();
    const usdcBalanceFormatted = ethers.formatUnits(usdcBalance, decimals);

    console.log('💵 USDC Balance:', usdcBalanceFormatted, 'USDC');
    console.log('');

    // Estimate gas cost for a typical transfer
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.maxFeePerGas || feeData.gasPrice || ethers.parseUnits('1', 'gwei');
    const estimatedGas = 100000n; // Typical ERC20 transfer
    const gasCost = gasPrice * estimatedGas;
    const gasCostEth = ethers.formatEther(gasCost);
    const gasCostWithBuffer = ethers.formatEther(gasCost * 2n); // We send 2x for safety

    console.log('⛽ Current Gas Estimates:');
    console.log('  Gas Price:', ethers.formatUnits(gasPrice, 'gwei'), 'gwei');
    console.log('  Estimated Gas:', estimatedGas.toString(), 'units');
    console.log('  Cost per transfer:', gasCostEth, 'ETH');
    console.log('  Cost with 2x buffer:', gasCostWithBuffer, 'ETH');
    console.log('');

    // Calculate how many transactions can be done
    const txCount = Math.floor(parseFloat(ethBalanceFormatted) / parseFloat(gasCostWithBuffer));
    console.log(`📊 Can support approximately ${txCount} offramp transactions with current ETH balance`);
    console.log('');

    if (txCount < 10) {
      console.log('⚠️  Recommendation: Add more ETH to support more transactions');
      console.log(`   Suggested: Send ${(parseFloat(gasCostWithBuffer) * 100).toFixed(6)} ETH for ~100 transactions`);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkBaseTreasury();

