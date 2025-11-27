import { ethers } from 'ethers';

const BASE_RPC_URL = 'https://mainnet.base.org';
const BASE_TREASURY_ADDRESS = '0xca153EA8BA71453BfAf201F327deC616E5c4d49a';
const BASE_USDC_CONTRACT = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';

async function checkBaseTreasuryBalance() {
  console.log('\n🔍 Checking Base Treasury Wallet Balance...\n');
  console.log('📍 Address:', BASE_TREASURY_ADDRESS);
  console.log('');

  try {
    const provider = new ethers.JsonRpcProvider(BASE_RPC_URL);

    // Check ETH balance
    const ethBalance = await provider.getBalance(BASE_TREASURY_ADDRESS);
    const ethBalanceFormatted = ethers.formatEther(ethBalance);
    console.log('💰 ETH Balance:', ethBalanceFormatted, 'ETH');

    // Check if balance is sufficient for gas
    const minEthNeeded = 0.001; // Minimum 0.001 ETH recommended
    if (parseFloat(ethBalanceFormatted) < minEthNeeded) {
      console.log(`❌ ETH balance is too low! Need at least ${minEthNeeded} ETH for gas fees.`);
      console.log('');
      console.log('🚨 THIS IS WHY BASE OFFRAMPS ARE FAILING!');
      console.log('');
      console.log('To fix:');
      console.log(`1. Send at least 0.01 ETH to: ${BASE_TREASURY_ADDRESS}`);
      console.log('2. Bridge ETH to Base at: https://bridge.base.org');
      console.log('3. Or use Coinbase to send ETH on Base network');
    } else {
      console.log('✅ ETH balance is sufficient for gas fees');
    }

    console.log('');

    // Check USDC balance (platform fees collected)
    const usdcAbi = [
      'function balanceOf(address) view returns (uint256)',
      'function decimals() view returns (uint8)',
    ];
    const usdcContract = new ethers.Contract(BASE_USDC_CONTRACT, usdcAbi, provider);
    const usdcBalance = await usdcContract.balanceOf(BASE_TREASURY_ADDRESS);
    const decimals = await usdcContract.decimals();
    const usdcBalanceFormatted = ethers.formatUnits(usdcBalance, decimals);

    console.log('💵 USDC Balance (Platform Fees):', usdcBalanceFormatted, 'USDC');
    console.log('');

    // Estimate gas cost
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.maxFeePerGas || feeData.gasPrice || ethers.parseUnits('1', 'gwei');
    const estimatedGas = 100000n; // Typical ERC20 transfer
    const gasCost = gasPrice * estimatedGas;
    const gasCostEth = ethers.formatEther(gasCost);
    const gasCostWithBuffer = ethers.formatEther(gasCost * 2n); // We send 2x for safety

    console.log('⛽ Current Gas Estimates:');
    console.log('  Gas Price:', ethers.formatUnits(gasPrice, 'gwei'), 'gwei');
    console.log('  Cost per offramp:', gasCostEth, 'ETH');
    console.log('  Cost with 2x buffer:', gasCostWithBuffer, 'ETH');
    console.log('');

    // Calculate how many transactions can be done
    const txCount = Math.floor(parseFloat(ethBalanceFormatted) / parseFloat(gasCostWithBuffer));
    console.log(`📊 Can support approximately ${txCount} offramp transactions with current ETH balance`);
    console.log('');

    if (txCount < 10) {
      console.log('⚠️  Recommendation: Add more ETH to support more transactions');
      console.log(`   Suggested: Send 0.01 ETH for ~100 transactions`);
      console.log(`   Address: ${BASE_TREASURY_ADDRESS}`);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkBaseTreasuryBalance();

