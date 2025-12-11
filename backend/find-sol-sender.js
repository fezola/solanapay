/**
 * Find the original sender of SOL to a wallet
 * 
 * Usage: node find-sol-sender.js
 */

import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import 'dotenv/config';

const WALLET_ADDRESS = '9KxheB1162pRpQfSZf66Js5dcFHGhTux6AafrkjZtWE1';
const SOLANA_RPC = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';

async function findSender() {
  console.log('\n🔍 FINDING SOL SENDER\n');
  console.log('='.repeat(60));
  console.log(`Wallet: ${WALLET_ADDRESS}`);

  const connection = new Connection(SOLANA_RPC, 'confirmed');
  const pubkey = new PublicKey(WALLET_ADDRESS);

  // Get current balance
  const balance = await connection.getBalance(pubkey);
  console.log(`Current Balance: ${balance / LAMPORTS_PER_SOL} SOL\n`);

  // Get transaction signatures
  console.log('📜 Fetching transaction history...\n');
  const signatures = await connection.getSignaturesForAddress(pubkey, { limit: 20 });

  console.log(`Found ${signatures.length} transactions:\n`);

  for (const sig of signatures) {
    try {
      const tx = await connection.getParsedTransaction(sig.signature, {
        maxSupportedTransactionVersion: 0,
      });

      if (!tx || !tx.meta) continue;

      const preBalances = tx.meta.preBalances;
      const postBalances = tx.meta.postBalances;
      const accountKeys = tx.transaction.message.accountKeys;

      // Find our wallet's index
      const walletIndex = accountKeys.findIndex(
        (key) => key.pubkey.toBase58() === WALLET_ADDRESS
      );

      if (walletIndex === -1) continue;

      const preBal = preBalances[walletIndex];
      const postBal = postBalances[walletIndex];
      const diff = (postBal - preBal) / LAMPORTS_PER_SOL;

      // If we received SOL (positive diff), this is an incoming tx
      if (diff > 0.001) {
        // Find the sender (who had balance decrease)
        let sender = null;
        for (let i = 0; i < accountKeys.length; i++) {
          if (i === walletIndex) continue;
          const senderDiff = postBalances[i] - preBalances[i];
          if (senderDiff < 0) {
            sender = accountKeys[i].pubkey.toBase58();
            break;
          }
        }

        const date = new Date(sig.blockTime * 1000).toISOString();
        console.log('✅ INCOMING SOL TRANSFER FOUND:');
        console.log(`   Date: ${date}`);
        console.log(`   Amount: +${diff.toFixed(6)} SOL`);
        console.log(`   From: ${sender || 'Unknown'}`);
        console.log(`   TX: ${sig.signature}`);
        console.log(`   View: https://solscan.io/tx/${sig.signature}`);
        console.log('');
      }
    } catch (e) {
      // Skip failed tx parsing
    }
  }

  console.log('Done!\n');
}

findSender().catch(console.error);

