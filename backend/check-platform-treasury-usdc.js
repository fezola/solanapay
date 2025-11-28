import { Connection, PublicKey } from '@solana/web3.js';
import { getAccount, getAssociatedTokenAddress, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import 'dotenv/config';

const SOLANA_RPC = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
const PLATFORM_TREASURY = 'CB7GgQd7nYJmXiVvHRRNsMX2bUYn6Z3roBgLg2DrZdGG';
const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'; // USDC on Solana

async function checkUSDC() {
  console.log('\n💰 CHECKING PLATFORM TREASURY USDC BALANCE\n');
  console.log('='.repeat(80));

  const connection = new Connection(SOLANA_RPC, 'confirmed');
  const walletPubkey = new PublicKey(PLATFORM_TREASURY);
  const usdcMint = new PublicKey(USDC_MINT);

  try {
    // Get USDC token account
    const usdcTokenAccount = await getAssociatedTokenAddress(
      usdcMint,
      walletPubkey
    );

    console.log('\n📍 Wallet:', PLATFORM_TREASURY);
    console.log('📍 USDC Token Account:', usdcTokenAccount.toBase58());

    // Get account info
    const accountInfo = await getAccount(connection, usdcTokenAccount);
    const balance = Number(accountInfo.amount) / 1_000_000; // USDC has 6 decimals

    console.log('\n💵 USDC Balance:', balance.toFixed(2), 'USDC');
    console.log('💵 USD Value: $' + balance.toFixed(2));

    console.log('\n✅ You have $' + balance.toFixed(2) + ' USDC available!');
    console.log('\nOptions:');
    console.log('1. Offramp to NGN via Bread Africa, then buy ETH/MATIC on exchange');
    console.log('2. Swap USDC to SOL on Jupiter, then bridge to Base/Polygon');
    console.log('3. Use a cross-chain bridge to move USDC to Base/Polygon');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
  }
}

checkUSDC();

