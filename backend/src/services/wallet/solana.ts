import { Connection, Keypair, PublicKey, Transaction, SystemProgram, sendAndConfirmTransaction } from '@solana/web3.js';
import { getAssociatedTokenAddress, createTransferInstruction, getAccount } from '@solana/spl-token';
import * as bip39 from 'bip39';
import { derivePath } from 'ed25519-hd-key';
import nacl from 'tweetnacl';
import { env } from '../../config/env.js';
import { encrypt, decrypt } from '../../utils/encryption.js';
import { logger } from '../../utils/logger.js';

export class SolanaWalletService {
  private connection: Connection;
  private usdcMint: PublicKey;
  private usdtMint: PublicKey;
  private treasuryHot: PublicKey;

  constructor() {
    this.connection = new Connection(env.SOLANA_RPC_URL, {
      commitment: 'finalized',
    });

    this.usdcMint = new PublicKey(env.USDC_SOL_MINT);
    this.usdtMint = new PublicKey(env.USDT_SOL_MINT);

    // Treasury address is optional for development
    if (env.SOLANA_TREASURY_ADDRESS) {
      this.treasuryHot = new PublicKey(env.SOLANA_TREASURY_ADDRESS);
    } else {
      // Use a dummy address for development
      this.treasuryHot = Keypair.generate().publicKey;
      logger.warn('No SOLANA_TREASURY_ADDRESS configured, using temporary address for development');
    }
  }

  /**
   * Generate a new custodial wallet for a user
   */
  async generateWallet(userId: string, accountIndex: number): Promise<{
    address: string;
    derivationPath: string;
    encryptedPrivateKey: string;
  }> {
    // Generate mnemonic (in production, use a master seed stored in HSM)
    const mnemonic = bip39.generateMnemonic(256);
    
    // Derive keypair using BIP44 path for Solana
    // m/44'/501'/accountIndex'/0'
    const derivationPath = `m/44'/501'/${accountIndex}'/0'`;
    const seed = await bip39.mnemonicToSeed(mnemonic);
    const derivedSeed = derivePath(derivationPath, seed.toString('hex')).key;
    
    const keypair = Keypair.fromSeed(derivedSeed);
    
    // Encrypt private key before storage
    const privateKeyBase58 = Buffer.from(keypair.secretKey).toString('base64');
    const encryptedPrivateKey = encrypt(privateKeyBase58);

    logger.info(`Generated Solana wallet for user ${userId}: ${keypair.publicKey.toBase58()}`);

    return {
      address: keypair.publicKey.toBase58(),
      derivationPath,
      encryptedPrivateKey,
    };
  }

  /**
   * Get keypair from encrypted private key
   */
  private getKeypair(encryptedPrivateKey: string): Keypair {
    const decrypted = decrypt(encryptedPrivateKey);
    const secretKey = Buffer.from(decrypted, 'base64');
    return Keypair.fromSecretKey(secretKey);
  }

  /**
   * Get SOL balance
   */
  async getSOLBalance(address: string): Promise<number> {
    const publicKey = new PublicKey(address);
    const balance = await this.connection.getBalance(publicKey);
    return balance / 1e9; // Convert lamports to SOL
  }

  /**
   * Get SPL token balance (USDC, USDT)
   */
  async getTokenBalance(address: string, mint: PublicKey): Promise<number> {
    try {
      const publicKey = new PublicKey(address);
      const tokenAccount = await getAssociatedTokenAddress(mint, publicKey);
      const accountInfo = await getAccount(this.connection, tokenAccount);
      return Number(accountInfo.amount) / 1e6; // USDC/USDT have 6 decimals
    } catch (error) {
      // Token account doesn't exist yet
      return 0;
    }
  }

  /**
   * Get USDC balance
   */
  async getUSDCBalance(address: string): Promise<number> {
    return this.getTokenBalance(address, this.usdcMint);
  }

  /**
   * Get USDT balance
   */
  async getUSDTBalance(address: string): Promise<number> {
    return this.getTokenBalance(address, this.usdtMint);
  }

  /**
   * Sweep SOL from user wallet to treasury
   */
  async sweepSOL(
    encryptedPrivateKey: string,
    amount: number
  ): Promise<string> {
    const keypair = this.getKeypair(encryptedPrivateKey);
    
    // Calculate amount in lamports, leaving some for rent
    const rentExemption = 0.001 * 1e9; // 0.001 SOL for rent
    const lamports = Math.floor(amount * 1e9) - rentExemption;

    if (lamports <= 0) {
      throw new Error('Insufficient balance for sweep');
    }

    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: keypair.publicKey,
        toPubkey: this.treasuryHot,
        lamports,
      })
    );

    const signature = await sendAndConfirmTransaction(
      this.connection,
      transaction,
      [keypair],
      { commitment: 'finalized' }
    );

    logger.info(`Swept ${amount} SOL to treasury: ${signature}`);
    return signature;
  }

  /**
   * Sweep SPL tokens from user wallet to treasury
   */
  async sweepToken(
    encryptedPrivateKey: string,
    mint: PublicKey,
    amount: number,
    decimals: number = 6
  ): Promise<string> {
    const keypair = this.getKeypair(encryptedPrivateKey);
    
    const fromTokenAccount = await getAssociatedTokenAddress(
      mint,
      keypair.publicKey
    );
    
    const toTokenAccount = await getAssociatedTokenAddress(
      mint,
      this.treasuryHot
    );

    const amountInSmallestUnit = Math.floor(amount * Math.pow(10, decimals));

    const transaction = new Transaction().add(
      createTransferInstruction(
        fromTokenAccount,
        toTokenAccount,
        keypair.publicKey,
        amountInSmallestUnit
      )
    );

    const signature = await sendAndConfirmTransaction(
      this.connection,
      transaction,
      [keypair],
      { commitment: 'finalized' }
    );

    logger.info(`Swept ${amount} tokens to treasury: ${signature}`);
    return signature;
  }

  /**
   * Sweep USDC to treasury
   */
  async sweepUSDC(encryptedPrivateKey: string, amount: number): Promise<string> {
    return this.sweepToken(encryptedPrivateKey, this.usdcMint, amount, 6);
  }

  /**
   * Sweep USDT to treasury
   */
  async sweepUSDT(encryptedPrivateKey: string, amount: number): Promise<string> {
    return this.sweepToken(encryptedPrivateKey, this.usdtMint, amount, 6);
  }

  /**
   * Get transaction details
   */
  async getTransaction(signature: string) {
    return this.connection.getTransaction(signature, {
      commitment: 'finalized',
      maxSupportedTransactionVersion: 0,
    });
  }

  /**
   * Get connection for monitoring
   */
  getConnection(): Connection {
    return this.connection;
  }
}

export const solanaWalletService = new SolanaWalletService();

