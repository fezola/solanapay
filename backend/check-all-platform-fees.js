import { Connection, PublicKey } from '@solana/web3.js';
import { getAccount, getAssociatedTokenAddress } from '@solana/spl-token';
import { ethers } from 'ethers';

// Platform Treasury Addresses (where fees are collected)
const SOLANA_PLATFORM_TREASURY = 'CB7GgQd7nYJmXiVvHRRNsMX2bUYn6Z3roBgLg2DrZdGG';
const BASE_PLATFORM_TREASURY = '0xca153EA8BA71453BfAf201F327deC616E5c4d49a';
const POLYGON_PLATFORM_TREASURY = '0xca153EA8BA71453BfAf201F327deC616E5c4d49a';

// Token addresses
const SOLANA_USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
const SOLANA_USDT_MINT = 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB';
const BASE_USDC = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
const POLYGON_USDC = '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359';
const POLYGON_USDT = '0xc2132D05D31c914a87C6611C10748AEb04B58e8F';

// RPC URLs
const SOLANA_RPC = 'https://api.mainnet-beta.solana.com';
const BASE_RPC = 'https://mainnet.base.org';
const POLYGON_RPC = 'https://polygon-rpc.com';

async function checkSolanaPlatformFees() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('💰 SOLANA PLATFORM FEES');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`📍 Treasury: ${SOLANA_PLATFORM_TREASURY}\n`);

  try {
    const connection = new Connection(SOLANA_RPC, 'confirmed');
    const treasuryPubkey = new PublicKey(SOLANA_PLATFORM_TREASURY);

    // Check SOL balance
    const solBalance = await connection.getBalance(treasuryPubkey);
    const solBalanceFormatted = solBalance / 1e9;
    console.log(`💎 SOL: ${solBalanceFormatted.toFixed(6)} SOL`);

    // Check USDC balance
    try {
      const usdcMint = new PublicKey(SOLANA_USDC_MINT);
      const usdcTokenAccount = await getAssociatedTokenAddress(usdcMint, treasuryPubkey);
      const usdcAccount = await getAccount(connection, usdcTokenAccount);
      const usdcBalance = Number(usdcAccount.amount) / 1e6;
      console.log(`💵 USDC: ${usdcBalance.toFixed(6)} USDC`);
    } catch (e) {
      console.log(`💵 USDC: 0.000000 USDC (no token account)`);
    }

    // Check USDT balance
    try {
      const usdtMint = new PublicKey(SOLANA_USDT_MINT);
      const usdtTokenAccount = await getAssociatedTokenAddress(usdtMint, treasuryPubkey);
      const usdtAccount = await getAccount(connection, usdtTokenAccount);
      const usdtBalance = Number(usdtAccount.amount) / 1e6;
      console.log(`💵 USDT: ${usdtBalance.toFixed(6)} USDT`);
    } catch (e) {
      console.log(`💵 USDT: 0.000000 USDT (no token account)`);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

async function checkEVMPlatformFees(chainName, rpcUrl, treasuryAddress, usdcAddress, usdtAddress = null) {
  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`💰 ${chainName.toUpperCase()} PLATFORM FEES`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`📍 Treasury: ${treasuryAddress}\n`);

  try {
    const provider = new ethers.JsonRpcProvider(rpcUrl);

    // Check native token balance
    const nativeBalance = await provider.getBalance(treasuryAddress);
    const nativeBalanceFormatted = ethers.formatEther(nativeBalance);
    const nativeToken = chainName === 'Base' ? 'ETH' : 'MATIC';
    console.log(`💎 ${nativeToken}: ${parseFloat(nativeBalanceFormatted).toFixed(6)} ${nativeToken}`);

    // Check USDC balance
    const usdcAbi = [
      'function balanceOf(address) view returns (uint256)',
      'function decimals() view returns (uint8)',
    ];
    const usdcContract = new ethers.Contract(usdcAddress, usdcAbi, provider);
    const usdcBalance = await usdcContract.balanceOf(treasuryAddress);
    const usdcDecimals = await usdcContract.decimals();
    const usdcBalanceFormatted = ethers.formatUnits(usdcBalance, usdcDecimals);
    console.log(`💵 USDC: ${parseFloat(usdcBalanceFormatted).toFixed(6)} USDC`);

    // Check USDT balance if address provided
    if (usdtAddress) {
      const usdtContract = new ethers.Contract(usdtAddress, usdcAbi, provider);
      const usdtBalance = await usdtContract.balanceOf(treasuryAddress);
      const usdtDecimals = await usdtContract.decimals();
      const usdtBalanceFormatted = ethers.formatUnits(usdtBalance, usdtDecimals);
      console.log(`💵 USDT: ${parseFloat(usdtBalanceFormatted).toFixed(6)} USDT`);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

async function main() {
  console.log('\n╔════════════════════════════════════════════╗');
  console.log('║     PLATFORM FEE TREASURY BALANCES         ║');
  console.log('╚════════════════════════════════════════════╝');
  console.log('\nThese are the wallets that collect platform fees');
  console.log('from offramp transactions.\n');

  await checkSolanaPlatformFees();
  await checkEVMPlatformFees('Base', BASE_RPC, BASE_PLATFORM_TREASURY, BASE_USDC);
  await checkEVMPlatformFees('Polygon', POLYGON_RPC, POLYGON_PLATFORM_TREASURY, POLYGON_USDC, POLYGON_USDT);

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 SUMMARY');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('Platform fees are collected in crypto (USDC/USDT)');
  console.log('on each chain when users offramp.\n');
  console.log('The native tokens (SOL/ETH/MATIC) are used to pay');
  console.log('for gas fees when collecting platform fees.\n');
  console.log('View transactions:');
  console.log(`  Solana: https://solscan.io/account/${SOLANA_PLATFORM_TREASURY}`);
  console.log(`  Base: https://basescan.org/address/${BASE_PLATFORM_TREASURY}`);
  console.log(`  Polygon: https://polygonscan.com/address/${POLYGON_PLATFORM_TREASURY}`);
  console.log('\n');
}

main();

