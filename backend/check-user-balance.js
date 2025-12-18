import { Connection, PublicKey } from '@solana/web3.js';
import { getAssociatedTokenAddress, getAccount } from '@solana/spl-token';

const USDC_MINT = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');

async function check() {
  const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');
  
  // lolamewu@gmail.com's Solana wallet
  const userWallet = 'AZA5L2ga3iVk45YxpwH5rPm8SdTBxNXkx29yQDLTM3xM';
  
  console.log('\n🔍 Checking balances for lolamewu@gmail.com\n');
  
  // Check user wallet
  try {
    const ata = await getAssociatedTokenAddress(USDC_MINT, new PublicKey(userWallet));
    const account = await getAccount(connection, ata);
    console.log('📍 User SolPay Wallet:', userWallet);
    console.log('   USDC Balance:', Number(account.amount) / 1e6, 'USDC');
  } catch (e) {
    console.log('📍 User SolPay Wallet:', userWallet);
    console.log('   USDC Balance: 0 (no token account)');
  }
  
  // Check Bread wallet (from earlier - feransamk4)
  const breadWallet = 'ARJG3WGLEFEuzpmTBpio12xxkGEP34tDJbDiGmQBn3oK';
  try {
    const ata = await getAssociatedTokenAddress(USDC_MINT, new PublicKey(breadWallet));
    const account = await getAccount(connection, ata);
    console.log('\n📍 Bread Wallet (feransamk4):', breadWallet);
    console.log('   USDC Balance:', Number(account.amount) / 1e6, 'USDC');
  } catch (e) {
    console.log('\n📍 Bread Wallet:', breadWallet);
    console.log('   USDC Balance: 0');
  }
}

check().catch(e => console.error('Error:', e));

