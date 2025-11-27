import { ethers } from 'ethers';

const WALLET_ADDRESS = '0xca153EA8BA71453BfAf201F327deC616E5c4d49a';

// RPC URLs
const BASE_RPC_URL = 'https://mainnet.base.org';
const POLYGON_RPC_URL = 'https://polygon-rpc.com';

// USDC contract addresses
const BASE_USDC = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
const POLYGON_USDC = '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359';

async function checkChainBalance(chainName, rpcUrl, usdcAddress) {
  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`🔍 ${chainName.toUpperCase()} NETWORK`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

  try {
    const provider = new ethers.JsonRpcProvider(rpcUrl);

    // Check native token balance (ETH for Base, MATIC for Polygon)
    const nativeBalance = await provider.getBalance(WALLET_ADDRESS);
    const nativeBalanceFormatted = ethers.formatEther(nativeBalance);
    const nativeToken = chainName === 'Base' ? 'ETH' : 'MATIC';
    
    console.log(`💰 ${nativeToken} Balance:`, nativeBalanceFormatted, nativeToken);

    // Check if balance is sufficient for gas
    const minNeeded = 0.001;
    if (parseFloat(nativeBalanceFormatted) < minNeeded) {
      console.log(`❌ ${nativeToken} balance is too low! Need at least ${minNeeded} ${nativeToken} for gas fees.`);
      console.log(`   Send ${nativeToken} to: ${WALLET_ADDRESS}`);
    } else {
      console.log(`✅ ${nativeToken} balance is sufficient for gas fees`);
    }

    // Check USDC balance
    const usdcAbi = [
      'function balanceOf(address) view returns (uint256)',
      'function decimals() view returns (uint8)',
    ];
    const usdcContract = new ethers.Contract(usdcAddress, usdcAbi, provider);
    const usdcBalance = await usdcContract.balanceOf(WALLET_ADDRESS);
    const decimals = await usdcContract.decimals();
    const usdcBalanceFormatted = ethers.formatUnits(usdcBalance, decimals);

    console.log(`💵 USDC Balance:`, usdcBalanceFormatted, 'USDC');

    // Estimate gas cost
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.maxFeePerGas || feeData.gasPrice || ethers.parseUnits('1', 'gwei');
    const estimatedGas = 100000n;
    const gasCost = gasPrice * estimatedGas;
    const gasCostNative = ethers.formatEther(gasCost);
    const gasCostWithBuffer = ethers.formatEther(gasCost * 2n);

    console.log(`\n⛽ Gas Estimates:`);
    console.log(`  Gas Price: ${ethers.formatUnits(gasPrice, 'gwei')} gwei`);
    console.log(`  Cost per tx: ${gasCostNative} ${nativeToken}`);
    console.log(`  Cost with buffer: ${gasCostWithBuffer} ${nativeToken}`);

    // Calculate transaction capacity
    const txCount = Math.floor(parseFloat(nativeBalanceFormatted) / parseFloat(gasCostWithBuffer));
    console.log(`\n📊 Can support ~${txCount} offramp transactions`);

    if (txCount < 10) {
      console.log(`⚠️  Low capacity! Recommend adding more ${nativeToken}`);
    }

    return {
      chain: chainName,
      nativeBalance: parseFloat(nativeBalanceFormatted),
      usdcBalance: parseFloat(usdcBalanceFormatted),
      txCapacity: txCount,
      hasGas: parseFloat(nativeBalanceFormatted) >= minNeeded,
    };

  } catch (error) {
    console.error(`❌ Error checking ${chainName}:`, error.message);
    return {
      chain: chainName,
      error: error.message,
      hasGas: false,
    };
  }
}

async function main() {
  console.log('\n╔════════════════════════════════════════════╗');
  console.log('║   TREASURY WALLET MULTI-CHAIN CHECK        ║');
  console.log('╚════════════════════════════════════════════╝');
  console.log(`\n📍 Wallet Address: ${WALLET_ADDRESS}\n`);

  const baseResult = await checkChainBalance('Base', BASE_RPC_URL, BASE_USDC);
  const polygonResult = await checkChainBalance('Polygon', POLYGON_RPC_URL, POLYGON_USDC);

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 SUMMARY');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log('Base Network:');
  console.log(`  ${baseResult.hasGas ? '✅' : '❌'} Gas: ${baseResult.nativeBalance} ETH`);
  console.log(`  💵 USDC: ${baseResult.usdcBalance} USDC`);
  console.log(`  📊 Capacity: ~${baseResult.txCapacity} transactions\n`);

  console.log('Polygon Network:');
  console.log(`  ${polygonResult.hasGas ? '✅' : '❌'} Gas: ${polygonResult.nativeBalance} MATIC`);
  console.log(`  💵 USDC: ${polygonResult.usdcBalance} USDC`);
  console.log(`  📊 Capacity: ~${polygonResult.txCapacity} transactions\n`);

  if (baseResult.hasGas && polygonResult.hasGas) {
    console.log('✅ WALLET IS READY FOR BOTH BASE AND POLYGON!');
    console.log('\nNext step: Add these to Render environment variables:');
    console.log('  BASE_TREASURY_PRIVATE_KEY=0xe0afbaf2b2b0baa40d2b218380dc5943ce4b7abeb3117a54409cc55ff9fcb640');
    console.log('  BASE_TREASURY_ADDRESS=0xca153EA8BA71453BfAf201F327deC616E5c4d49a');
    console.log('  POLYGON_TREASURY_PRIVATE_KEY=0xe0afbaf2b2b0baa40d2b218380dc5943ce4b7abeb3117a54409cc55ff9fcb640');
    console.log('  POLYGON_TREASURY_ADDRESS=0xca153EA8BA71453BfAf201F327deC616E5c4d49a');
  } else {
    console.log('⚠️  WALLET NEEDS FUNDING:');
    if (!baseResult.hasGas) {
      console.log(`  - Send at least 0.01 ETH to ${WALLET_ADDRESS} on Base`);
    }
    if (!polygonResult.hasGas) {
      console.log(`  - Send at least 0.01 MATIC to ${WALLET_ADDRESS} on Polygon`);
    }
  }

  console.log('\n');
}

main();

