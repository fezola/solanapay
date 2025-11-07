import { Connection, PublicKey } from '@solana/web3.js';
import 'dotenv/config';

const SOLANA_RPC = process.env.SOLANA_RPC_URL || 'https://mainnet.helius-rpc.com/?api-key=4418d794-039b-4530-a9c4-6f8e325faa18';
const ADDRESS = 'An3XCzaVEj2jbCU8qgLW4C4WKKZdt2Y5YX88bx4ePSGa';

async function checkBalance() {
  const connection = new Connection(SOLANA_RPC, 'confirmed');
  const pubkey = new PublicKey(ADDRESS);
  
  const balance = await connection.getBalance(pubkey);
  const solBalance = balance / 1e9; // Convert lamports to SOL
  
  console.log('\n💰 SOL Balance:', solBalance, 'SOL');
  console.log('   Lamports:', balance);
  
  if (solBalance === 0) {
    console.log('\n❌ No SOL for transaction fees!');
    console.log('   You need to send some SOL to this address to pay for transaction fees.');
    console.log('   Recommended: 0.01 SOL (~$2)');
  } else if (solBalance < 0.001) {
    console.log('\n⚠️  Very low SOL balance!');
    console.log('   You may not have enough for transaction fees.');
  } else {
    console.log('\n✅ Sufficient SOL for transaction fees');
  }
}

checkBalance();

