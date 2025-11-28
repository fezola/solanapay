/**
 * Transfer SOL from Platform Treasury to Gas Sponsor Wallet
 * 
 * This fixes the issue where offramps fail because the gas sponsor wallet is empty.
 */

import { Connection, Keypair, PublicKey, SystemProgram, Transaction, LAMPORTS_PER_SOL, sendAndConfirmTransaction } from '@solana/web3.js';
import 'dotenv/config';

const SOLANA_RPC = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
const GAS_SPONSOR_ADDRESS = 'CmZzUSAux8ahGDrPfLEx8c3oJMKSisycMqUdx8ZSDRbW';
const AMOUNT_TO_TRANSFER = 0.1; // Transfer 0.1 SOL to gas sponsor

async function transferToGasSponsor() {
  console.log('\n💸 TRANSFERRING SOL TO GAS SPONSOR WALLET\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Check if we have the platform treasury private key
  const platformTreasuryKey = process.env.PLATFORM_TREASURY_PRIVATE_KEY_SOLANA;
  
  if (!platformTreasuryKey) {
    console.log('❌ ERROR: PLATFORM_TREASURY_PRIVATE_KEY_SOLANA not found in .env');
    console.log('');
    console.log('You need to add the private key for CB7GgQd7nYJmXiVvHRRNsMX2bUYn6Z3roBgLg2DrZdGG');
    console.log('to your .env file as PLATFORM_TREASURY_PRIVATE_KEY_SOLANA');
    console.log('');
    console.log('OR manually transfer 0.1 SOL from:');
    console.log('   FROM: CB7GgQd7nYJmXiVvHRRNsMX2bUYn6Z3roBgLg2DrZdGG');
    console.log('   TO:   CmZzUSAux8ahGDrPfLEx8c3oJMKSisycMqUdx8ZSDRbW');
    console.log('   AMOUNT: 0.1 SOL');
    console.log('');
    process.exit(1);
  }

  try {
    const connection = new Connection(SOLANA_RPC, 'confirmed');

    // Parse the private key (should be array format like SOLANA_TREASURY_PRIVATE_KEY)
    let secretKey;
    try {
      secretKey = new Uint8Array(JSON.parse(platformTreasuryKey));
    } catch (e) {
      console.log('❌ ERROR: Invalid private key format');
      console.log('Expected format: [1,2,3,...] (array of 64 numbers)');
      process.exit(1);
    }

    const fromKeypair = Keypair.fromSecretKey(secretKey);
    const toPublicKey = new PublicKey(GAS_SPONSOR_ADDRESS);

    console.log('FROM (Platform Treasury):', fromKeypair.publicKey.toBase58());
    console.log('TO (Gas Sponsor):', GAS_SPONSOR_ADDRESS);
    console.log('AMOUNT:', AMOUNT_TO_TRANSFER, 'SOL');
    console.log('');

    // Check balance
    const balance = await connection.getBalance(fromKeypair.publicKey);
    const balanceSOL = balance / LAMPORTS_PER_SOL;
    console.log('Current Platform Treasury Balance:', balanceSOL.toFixed(9), 'SOL');
    
    if (balanceSOL < AMOUNT_TO_TRANSFER + 0.001) {
      console.log('❌ ERROR: Insufficient balance!');
      console.log('   Need:', AMOUNT_TO_TRANSFER + 0.001, 'SOL (including gas)');
      console.log('   Have:', balanceSOL, 'SOL');
      process.exit(1);
    }

    console.log('');
    console.log('⏳ Creating transaction...');

    // Create transfer instruction
    const transferInstruction = SystemProgram.transfer({
      fromPubkey: fromKeypair.publicKey,
      toPubkey: toPublicKey,
      lamports: AMOUNT_TO_TRANSFER * LAMPORTS_PER_SOL,
    });

    // Create transaction
    const transaction = new Transaction().add(transferInstruction);

    console.log('⏳ Sending transaction...');

    // Send and confirm
    const signature = await sendAndConfirmTransaction(
      connection,
      transaction,
      [fromKeypair],
      {
        commitment: 'confirmed',
      }
    );

    console.log('');
    console.log('✅ TRANSFER SUCCESSFUL!');
    console.log('');
    console.log('Transaction:', signature);
    console.log('View:', `https://solscan.io/tx/${signature}`);
    console.log('');

    // Check new balances
    const newFromBalance = await connection.getBalance(fromKeypair.publicKey);
    const newToBalance = await connection.getBalance(toPublicKey);

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('NEW BALANCES:');
    console.log('');
    console.log('Platform Treasury:', (newFromBalance / LAMPORTS_PER_SOL).toFixed(9), 'SOL');
    console.log('Gas Sponsor:', (newToBalance / LAMPORTS_PER_SOL).toFixed(9), 'SOL');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('🎉 Gas Sponsor wallet is now funded!');
    console.log('   Solana offramps should work now.');
    console.log('');
    console.log('⚠️  You still need to fund:');
    console.log('   - Base Treasury: 0.01 ETH to 0xca153EA8BA71453BfAf201F327deC616E5c4d49a');
    console.log('   - Polygon Treasury: 10 MATIC to 0xca153EA8BA71453BfAf201F327deC616E5c4d49a');
    console.log('');

  } catch (error) {
    console.log('');
    console.log('❌ ERROR:', error.message);
    console.log('');
    if (error.logs) {
      console.log('Transaction logs:', error.logs);
    }
    process.exit(1);
  }
}

transferToGasSponsor();

