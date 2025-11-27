import { ethers } from 'ethers';

const BASE_RPC = 'https://mainnet.base.org';
const BASE_USDC = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';

const ANDREW_DEPOSIT_ADDRESS = '0x9B627b77F9f99d3946A20829dcF182D708A83dbB';
const ANDREW_BREAD_WALLET = '0x3847E3697885AdDf7Fc8aBB987ea9CE6ca3b7209';

async function checkBalances() {
  console.log('\n🔍 Checking Andrew\'s Base Wallets...\n');

  try {
    const provider = new ethers.JsonRpcProvider(BASE_RPC);
    const usdcAbi = [
      'function balanceOf(address) view returns (uint256)',
      'function decimals() view returns (uint8)',
    ];
    const usdcContract = new ethers.Contract(BASE_USDC, usdcAbi, provider);

    // Check deposit address
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📥 DEPOSIT ADDRESS (where you send USDC)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Address: ${ANDREW_DEPOSIT_ADDRESS}`);
    
    const depositEth = await provider.getBalance(ANDREW_DEPOSIT_ADDRESS);
    const depositEthFormatted = ethers.formatEther(depositEth);
    console.log(`💎 ETH: ${depositEthFormatted} ETH`);

    const depositUsdc = await usdcContract.balanceOf(ANDREW_DEPOSIT_ADDRESS);
    const depositUsdcFormatted = ethers.formatUnits(depositUsdc, 6);
    console.log(`💵 USDC: ${depositUsdcFormatted} USDC`);
    console.log(`View: https://basescan.org/address/${ANDREW_DEPOSIT_ADDRESS}`);

    // Check Bread wallet
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🍞 BREAD WALLET (where funds go for offramp)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Address: ${ANDREW_BREAD_WALLET}`);

    const breadEth = await provider.getBalance(ANDREW_BREAD_WALLET);
    const breadEthFormatted = ethers.formatEther(breadEth);
    console.log(`💎 ETH: ${breadEthFormatted} ETH`);

    const breadUsdc = await usdcContract.balanceOf(ANDREW_BREAD_WALLET);
    const breadUsdcFormatted = ethers.formatUnits(breadUsdc, 6);
    console.log(`💵 USDC: ${breadUsdcFormatted} USDC`);
    console.log(`View: https://basescan.org/address/${ANDREW_BREAD_WALLET}`);

    // Summary
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 SUMMARY');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const totalUsdc = parseFloat(depositUsdcFormatted) + parseFloat(breadUsdcFormatted);
    console.log(`Total USDC: ${totalUsdc.toFixed(6)} USDC`);
    console.log(`  Deposit Address: ${depositUsdcFormatted} USDC`);
    console.log(`  Bread Wallet: ${breadUsdcFormatted} USDC`);
    console.log('');

    if (totalUsdc === 0) {
      console.log('❌ NO USDC FOUND IN EITHER WALLET!');
      console.log('');
      console.log('Possible reasons:');
      console.log('1. USDC was successfully sent to Bread Africa and converted to NGN');
      console.log('2. USDC is still in transit (check recent transactions)');
      console.log('3. Wrong deposit address was used');
      console.log('');
      console.log('Check recent transactions:');
      console.log(`  Deposit: https://basescan.org/address/${ANDREW_DEPOSIT_ADDRESS}#tokentxns`);
      console.log(`  Bread: https://basescan.org/address/${ANDREW_BREAD_WALLET}#tokentxns`);
    } else if (parseFloat(depositUsdcFormatted) > 0) {
      console.log('✅ USDC is in your deposit address');
      console.log('   Ready to offramp!');
    } else if (parseFloat(breadUsdcFormatted) > 0) {
      console.log('⚠️  USDC is in Bread wallet');
      console.log('   Offramp may be in progress or stuck');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkBalances();

