import { Connection, PublicKey } from '@solana/web3.js';
import { getAssociatedTokenAddress } from '@solana/spl-token';

const USDC_MINT = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');

async function check() {
  const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');
  
  // feransamk4@gmail.com's wallets
  const solpayWallet = 'FXcwh5sUvmNr4UFTrDsMvCDeM6nj3pbYUzp6KNVUvvXV';
  const breadWallet = 'ARJG3WGLEFEuzpmTBpio12xxkGEP34tDJbDiGmQBn3oK';
  
  console.log('\n🔍 Checking balances for feransamk4@gmail.com\n');
  
  // Check SolPay wallet
  try {
    const solpayAta = await getAssociatedTokenAddress(USDC_MINT, new PublicKey(solpayWallet));
    const solpayBalance = await connection.getTokenAccountBalance(solpayAta);
    console.log('📍 SolPay Wallet:', solpayWallet);
    console.log('   USDC Balance:', solpayBalance.value.uiAmount, 'USDC');
  } catch (e) {
    console.log('📍 SolPay Wallet:', solpayWallet);
    console.log('   USDC Balance: 0 (no token account)');
  }
  
  console.log('');
  
  // Check Bread wallet
  try {
    const breadAta = await getAssociatedTokenAddress(USDC_MINT, new PublicKey(breadWallet));
    const breadBalance = await connection.getTokenAccountBalance(breadAta);
    console.log('📍 Bread Wallet:', breadWallet);
    console.log('   USDC Balance:', breadBalance.value.uiAmount, 'USDC');
  } catch (e) {
    console.log('📍 Bread Wallet:', breadWallet);
    console.log('   USDC Balance: 0 (no token account)');
  }
}

check();

