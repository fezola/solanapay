/**
 * Check Gas Sponsor Wallet Status
 * Run with: node backend/check-gas-sponsor-wallet.js
 */

import { createClient } from '@supabase/supabase-js';
import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import 'dotenv/config';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const SOLANA_RPC_URL = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
const connection = new Connection(SOLANA_RPC_URL, 'confirmed');

async function checkGasSponsorWallet() {
  console.log('\n🔍 Checking Gas Sponsor Wallet Status...\n');

  // Get gas sponsor wallet from database
  const { data: wallet, error } = await supabase
    .from('referral_funding_wallet')
    .select('*')
    .eq('is_active', true)
    .single();

  if (error || !wallet) {
    console.error('❌ No active gas sponsor wallet found in database!');
    console.error('Error:', error);
    console.log('\n💡 You need to run the generate-referral-wallet script first:');
    console.log('   cd backend && npm run generate-referral-wallet\n');
    return;
  }

  console.log('✅ Gas Sponsor Wallet Found:');
  console.log(`   Address: ${wallet.wallet_address}`);
  console.log(`   Network: ${wallet.network}`);
  console.log(`   USDC Balance (DB): $${wallet.current_balance_usd}`);
  console.log(`   Has Encrypted Key: ${!!wallet.encrypted_private_key}`);

  // Check on-chain SOL balance
  try {
    const publicKey = new PublicKey(wallet.wallet_address);
    const balance = await connection.getBalance(publicKey);
    const solBalance = balance / LAMPORTS_PER_SOL;

    console.log(`\n💰 On-Chain Balances:`);
    console.log(`   SOL: ${solBalance.toFixed(6)} SOL`);

    // Calculate how many transactions this can cover
    const avgGasFee = 0.000005; // SOL per transaction
    const estimatedTxs = Math.floor(solBalance / avgGasFee);

    console.log(`\n📊 Gas Sponsorship Capacity:`);
    console.log(`   Average gas fee: ${avgGasFee} SOL (~$0.001)`);
    console.log(`   Estimated transactions: ${estimatedTxs.toLocaleString()}`);

    if (solBalance < 0.01) {
      console.log(`\n🚨 WARNING: SOL balance is LOW!`);
      console.log(`   Current: ${solBalance.toFixed(6)} SOL`);
      console.log(`   Recommended: 0.1 SOL (covers ~20,000 transactions)`);
      console.log(`\n💡 Send SOL to this address:`);
      console.log(`   ${wallet.wallet_address}`);
      console.log(`\n   You can buy SOL on Coinbase/Binance and send it to this address.`);
    } else {
      console.log(`\n✅ SOL balance is sufficient for gas sponsorship!`);
    }

    // Check if encryption key is set
    if (!process.env.WALLET_ENCRYPTION_KEY) {
      console.log(`\n⚠️  WARNING: WALLET_ENCRYPTION_KEY not set in .env file!`);
      console.log(`   Gas sponsorship will NOT work without this key.`);
    } else {
      console.log(`\n✅ WALLET_ENCRYPTION_KEY is set`);
    }

  } catch (error) {
    console.error('\n❌ Error checking on-chain balance:', error.message);
  }

  console.log('\n');
}

checkGasSponsorWallet().catch(console.error);

