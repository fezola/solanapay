import { Connection, PublicKey } from '@solana/web3.js';
import { getAssociatedTokenAddress, getAccount } from '@solana/spl-token';

const BREAD_WALLET = '4FarMy3oddViSn6PKXjjAcf3TkwS5Gc32hvtQnBZqtAd';
const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';
const YOUR_DEPOSIT_WALLET = 'An3XCzaVEj2jbCU8qgLW4C4WKKZdt2Y5YX88bx4ePSGa';

const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');

async function checkBalances() {
  console.log('\n🔍 CHECKING WALLET BALANCES...\n');
  
  // Check Bread wallet USDC balance
  try {
    const breadWalletPubkey = new PublicKey(BREAD_WALLET);
    const usdcMint = new PublicKey(USDC_MINT);
    const breadTokenAccount = await getAssociatedTokenAddress(usdcMint, breadWalletPubkey);
    
    console.log('📍 Bread Wallet:', BREAD_WALLET);
    console.log('📍 Bread USDC Token Account:', breadTokenAccount.toBase58());
    
    try {
      const accountInfo = await getAccount(connection, breadTokenAccount);
      const balance = Number(accountInfo.amount) / 1e6;
      console.log('✅ Bread Wallet USDC Balance:', balance, 'USDC');
    } catch (error) {
      console.log('❌ Bread Wallet has NO USDC token account (balance = 0)');
    }
  } catch (error) {
    console.error('Error checking Bread wallet:', error.message);
  }
  
  console.log('\n---\n');
  
  // Check your deposit wallet USDC balance
  try {
    const yourWalletPubkey = new PublicKey(YOUR_DEPOSIT_WALLET);
    const usdcMint = new PublicKey(USDC_MINT);
    const yourTokenAccount = await getAssociatedTokenAddress(usdcMint, yourWalletPubkey);
    
    console.log('📍 Your Deposit Wallet:', YOUR_DEPOSIT_WALLET);
    console.log('📍 Your USDC Token Account:', yourTokenAccount.toBase58());
    
    try {
      const accountInfo = await getAccount(connection, yourTokenAccount);
      const balance = Number(accountInfo.amount) / 1e6;
      console.log('✅ Your Deposit Wallet USDC Balance:', balance, 'USDC');
    } catch (error) {
      console.log('❌ Your Deposit Wallet has NO USDC token account (balance = 0)');
    }
    
    // Check SOL balance
    const solBalance = await connection.getBalance(yourWalletPubkey);
    console.log('✅ Your Deposit Wallet SOL Balance:', solBalance / 1e9, 'SOL');
  } catch (error) {
    console.error('Error checking your wallet:', error.message);
  }
  
  console.log('\n---\n');
  
  // Get recent transactions for your deposit wallet
  try {
    const yourWalletPubkey = new PublicKey(YOUR_DEPOSIT_WALLET);
    const signatures = await connection.getSignaturesForAddress(yourWalletPubkey, { limit: 10 });
    
    console.log('📜 Recent Transactions for Your Deposit Wallet:');
    for (const sig of signatures) {
      const date = new Date(sig.blockTime * 1000).toLocaleString();
      console.log(`  - ${sig.signature.substring(0, 20)}... at ${date}`);
    }
  } catch (error) {
    console.error('Error getting transactions:', error.message);
  }
}

checkBalances().catch(console.error);

