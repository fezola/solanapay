import { Connection, PublicKey, Keypair } from '@solana/web3.js';
import 'dotenv/config';

const SOLANA_RPC = 'https://api.mainnet-beta.solana.com';
const SOLANA_TREASURY_PRIVATE_KEY = '[109,131,174,218,148,153,156,204,216,97,201,172,3,142,235,64,178,115,199,69,240,59,49,169,85,182,138,156,62,169,177,182,174,219,106,44,7,74,59,25,190,166,63,69,146,253,91,185,162,12,101,35,153,69,164,28,34,168,108,171,178,119,214,225]';

async function checkSolanaGasSponsor() {
  console.log('\n🔍 Checking Solana Gas Sponsor Wallet...\n');

  if (!SOLANA_TREASURY_PRIVATE_KEY) {
    console.log('❌ SOLANA_TREASURY_PRIVATE_KEY not set in .env');
    return;
  }

  try {
    // Parse the private key (it's stored as a JSON array)
    const privateKeyArray = JSON.parse(SOLANA_TREASURY_PRIVATE_KEY);
    const wallet = Keypair.fromSecretKey(Uint8Array.from(privateKeyArray));
    
    console.log('📍 Gas Sponsor Address:', wallet.publicKey.toBase58());
    console.log('');

    const connection = new Connection(SOLANA_RPC, 'confirmed');
    
    // Check SOL balance
    const balance = await connection.getBalance(wallet.publicKey);
    const solBalance = balance / 1e9;
    
    console.log('💰 SOL Balance:', solBalance.toFixed(6), 'SOL');
    console.log('');

    // Estimate gas costs
    const avgGasPerTx = 0.000005; // ~5000 lamports per transaction
    const txCapacity = Math.floor(solBalance / avgGasPerTx);
    
    console.log('⛽ Gas Capacity:');
    console.log(`  Average gas per tx: ${avgGasPerTx} SOL`);
    console.log(`  Can sponsor ~${txCapacity} transactions`);
    console.log('');

    if (solBalance < 0.01) {
      console.log('⚠️  WARNING: SOL balance is low!');
      console.log(`   Send at least 0.1 SOL to: ${wallet.publicKey.toBase58()}`);
      console.log('   This wallet pays gas fees for:');
      console.log('   - Platform fee collection');
      console.log('   - Transfers to Bread wallet');
    } else {
      console.log('✅ SOL balance is sufficient for gas sponsorship');
    }

    console.log('');
    console.log('View on Solscan:');
    console.log(`https://solscan.io/account/${wallet.publicKey.toBase58()}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkSolanaGasSponsor();

