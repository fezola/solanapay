#!/usr/bin/env tsx
/**
 * Generate Treasury Wallets for Solana and Base
 * 
 * This script generates secure treasury wallets that will receive
 * all swept user deposits.
 * 
 * ⚠️ SECURITY WARNING:
 * - Store the private keys SECURELY (use environment variables, never commit to Git)
 * - Fund these wallets with gas tokens (SOL for Solana, ETH for Base)
 * - Consider using hardware wallets for production
 */

import { Keypair } from '@solana/web3.js';
import { ethers } from 'ethers';
import * as bip39 from 'bip39';

console.log('🏦 Treasury Wallet Generator\n');
console.log('=' .repeat(60));

// ============================================================================
// SOLANA TREASURY WALLET
// ============================================================================
console.log('\n📍 SOLANA TREASURY WALLET\n');

const solanaKeypair = Keypair.generate();
const solanaPublicKey = solanaKeypair.publicKey.toBase58();
const solanaPrivateKey = JSON.stringify(Array.from(solanaKeypair.secretKey));

console.log('Public Address (SOLANA_TREASURY_ADDRESS):');
console.log(`  ${solanaPublicKey}`);
console.log('');
console.log('Private Key (SOLANA_TREASURY_PRIVATE_KEY):');
console.log(`  ${solanaPrivateKey}`);
console.log('');
console.log('⚠️  Fund this address with at least 0.1 SOL for gas fees');
console.log('   You can buy SOL on Coinbase, Binance, or any major exchange');
console.log('');

// ============================================================================
// BASE TREASURY WALLET
// ============================================================================
console.log('=' .repeat(60));
console.log('\n📍 BASE (Ethereum L2) TREASURY WALLET\n');

const baseWallet = ethers.Wallet.createRandom();
const baseAddress = baseWallet.address;
const basePrivateKey = baseWallet.privateKey;

console.log('Public Address (BASE_TREASURY_ADDRESS):');
console.log(`  ${baseAddress}`);
console.log('');
console.log('Private Key (BASE_TREASURY_PRIVATE_KEY):');
console.log(`  ${basePrivateKey}`);
console.log('');
console.log('⚠️  Fund this address with at least 0.01 ETH for gas fees');
console.log('   You can bridge ETH to Base at https://bridge.base.org');
console.log('');

// ============================================================================
// ENVIRONMENT VARIABLES
// ============================================================================
console.log('=' .repeat(60));
console.log('\n📝 ADD THESE TO YOUR .env FILE:\n');

console.log('# Solana Treasury');
console.log(`SOLANA_TREASURY_ADDRESS=${solanaPublicKey}`);
console.log(`SOLANA_TREASURY_PRIVATE_KEY=${solanaPrivateKey}`);
console.log('');
console.log('# Base Treasury');
console.log(`BASE_TREASURY_ADDRESS=${baseAddress}`);
console.log(`BASE_TREASURY_PRIVATE_KEY=${basePrivateKey}`);
console.log('');

// ============================================================================
// SECURITY REMINDERS
// ============================================================================
console.log('=' .repeat(60));
console.log('\n🔐 SECURITY CHECKLIST:\n');
console.log('  ✓ NEVER commit these private keys to Git');
console.log('  ✓ Store them ONLY in environment variables');
console.log('  ✓ Use Render/Vercel secret management for production');
console.log('  ✓ Consider hardware wallets (Ledger/Trezor) for large amounts');
console.log('  ✓ Enable 2FA on all exchange accounts');
console.log('  ✓ Keep backup copies in a secure location (encrypted USB, password manager)');
console.log('');

// ============================================================================
// FUNDING INSTRUCTIONS
// ============================================================================
console.log('=' .repeat(60));
console.log('\n💰 FUNDING INSTRUCTIONS:\n');
console.log('1. SOLANA:');
console.log(`   - Send 0.1-0.5 SOL to: ${solanaPublicKey}`);
console.log('   - Buy SOL on: Coinbase, Binance, Kraken');
console.log('   - Current price: ~$200/SOL (check coinmarketcap.com)');
console.log('');
console.log('2. BASE:');
console.log(`   - Send 0.01-0.05 ETH to: ${baseAddress}`);
console.log('   - Bridge ETH to Base at: https://bridge.base.org');
console.log('   - Or buy directly on Base via Coinbase');
console.log('');

console.log('=' .repeat(60));
console.log('\n✅ Treasury wallets generated successfully!\n');

