import { ethers } from 'ethers';
import { env } from '../../config/env.js';
import { encrypt, decrypt } from '../../utils/encryption.js';
import { logger } from '../../utils/logger.js';

// ERC20 ABI for USDC
const ERC20_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function transfer(address to, uint256 amount) returns (bool)',
  'function decimals() view returns (uint8)',
];

export class BaseWalletService {
  private provider: ethers.JsonRpcProvider;
  private usdcContract: ethers.Contract;
  private usdtContract: ethers.Contract;
  private treasuryHot: string;

  constructor() {
    this.provider = new ethers.JsonRpcProvider(env.BASE_RPC_URL);
    this.usdcContract = new ethers.Contract(
      env.BASE_USDC_CONTRACT,
      ERC20_ABI,
      this.provider
    );
    this.usdtContract = new ethers.Contract(
      env.BASE_USDT_CONTRACT,
      ERC20_ABI,
      this.provider
    );

    // Treasury address is optional for development
    if (env.BASE_TREASURY_ADDRESS) {
      this.treasuryHot = env.BASE_TREASURY_ADDRESS;
    } else {
      // Use a dummy address for development
      this.treasuryHot = ethers.Wallet.createRandom().address;
      logger.warn('No BASE_TREASURY_ADDRESS configured, using temporary address for development');
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
    // Generate wallet using BIP44 path for Ethereum
    // m/44'/60'/0'/0/accountIndex
    const derivationPath = `m/44'/60'/0'/0/${accountIndex}`;

    // In production, derive from master mnemonic stored in HSM
    const wallet = ethers.Wallet.createRandom();

    // Encrypt private key before storage
    const encryptedPrivateKey = encrypt(wallet.privateKey);

    logger.info(`Generated Base wallet for user ${userId}: ${wallet.address}`);

    return {
      address: wallet.address,
      derivationPath,
      encryptedPrivateKey,
    };
  }

  /**
   * Get wallet from encrypted private key
   */
  private getWallet(encryptedPrivateKey: string): ethers.Wallet {
    const decrypted = decrypt(encryptedPrivateKey);
    return new ethers.Wallet(decrypted, this.provider);
  }

  /**
   * Get ETH balance
   */
  async getETHBalance(address: string): Promise<number> {
    const balance = await this.provider.getBalance(address);
    return parseFloat(ethers.formatEther(balance));
  }

  /**
   * Get USDC balance
   */
  async getUSDCBalance(address: string): Promise<number> {
    const balance = await this.usdcContract.balanceOf(address);
    return parseFloat(ethers.formatUnits(balance, 6)); // USDC has 6 decimals
  }

  /**
   * Get USDT balance
   */
  async getUSDTBalance(address: string): Promise<number> {
    const balance = await this.usdtContract.balanceOf(address);
    return parseFloat(ethers.formatUnits(balance, 6)); // USDT has 6 decimals
  }

  /**
   * Get ERC20 token balance
   */
  async getTokenBalance(address: string, tokenAddress: string): Promise<number> {
    const contract = new ethers.Contract(tokenAddress, ERC20_ABI, this.provider);
    const balance = await contract.balanceOf(address);
    const decimals = await contract.decimals();
    return parseFloat(ethers.formatUnits(balance, decimals));
  }

  /**
   * Sweep ETH from user wallet to treasury
   */
  async sweepETH(
    encryptedPrivateKey: string,
    amount: number
  ): Promise<string> {
    const wallet = this.getWallet(encryptedPrivateKey);
    
    // Estimate gas
    const gasPrice = (await this.provider.getFeeData()).gasPrice;
    const gasLimit = 21000n; // Standard ETH transfer
    const gasCost = gasPrice! * gasLimit;
    
    // Calculate amount to send (leave gas for transaction)
    const amountWei = ethers.parseEther(amount.toString());
    const amountToSend = amountWei - gasCost;

    if (amountToSend <= 0n) {
      throw new Error('Insufficient balance for sweep (gas required)');
    }

    const tx = await wallet.sendTransaction({
      to: this.treasuryHot,
      value: amountToSend,
      gasLimit,
      gasPrice,
    });

    const receipt = await tx.wait();
    
    logger.info(`Swept ${amount} ETH to treasury: ${receipt!.hash}`);
    return receipt!.hash;
  }

  /**
   * Sweep USDC from user wallet to treasury
   */
  async sweepUSDC(
    encryptedPrivateKey: string,
    amount: number
  ): Promise<string> {
    const wallet = this.getWallet(encryptedPrivateKey);
    const contract = this.usdcContract.connect(wallet) as ethers.Contract;

    const amountInSmallestUnit = ethers.parseUnits(amount.toString(), 6);

    const tx = await contract.transfer(this.treasuryHot, amountInSmallestUnit);
    const receipt = await tx.wait();

    logger.info(`Swept ${amount} USDC to treasury: ${receipt.hash}`);
    return receipt.hash;
  }

  /**
   * Sweep USDT from user wallet to treasury
   */
  async sweepUSDT(
    encryptedPrivateKey: string,
    amount: number
  ): Promise<string> {
    const wallet = this.getWallet(encryptedPrivateKey);
    const contract = this.usdtContract.connect(wallet) as ethers.Contract;

    const amountInSmallestUnit = ethers.parseUnits(amount.toString(), 6);

    const tx = await contract.transfer(this.treasuryHot, amountInSmallestUnit);
    const receipt = await tx.wait();

    logger.info(`Swept ${amount} USDT to treasury: ${receipt.hash}`);
    return receipt.hash;
  }

  /**
   * Sweep ERC20 token from user wallet to treasury
   */
  async sweepToken(
    encryptedPrivateKey: string,
    tokenAddress: string,
    amount: number
  ): Promise<string> {
    const wallet = this.getWallet(encryptedPrivateKey);
    const contract = new ethers.Contract(tokenAddress, ERC20_ABI, wallet);
    
    const decimals = await contract.decimals();
    const amountInSmallestUnit = ethers.parseUnits(amount.toString(), decimals);

    const tx = await contract.transfer(this.treasuryHot, amountInSmallestUnit);
    const receipt = await tx.wait();

    logger.info(`Swept ${amount} tokens to treasury: ${receipt.hash}`);
    return receipt.hash;
  }

  /**
   * Get transaction details
   */
  async getTransaction(txHash: string) {
    return this.provider.getTransaction(txHash);
  }

  /**
   * Get transaction receipt
   */
  async getTransactionReceipt(txHash: string) {
    return this.provider.getTransactionReceipt(txHash);
  }

  /**
   * Get current block number
   */
  async getBlockNumber(): Promise<number> {
    return this.provider.getBlockNumber();
  }

  /**
   * Wait for transaction confirmations
   */
  async waitForConfirmations(txHash: string, confirmations: number = 12): Promise<void> {
    const receipt = await this.provider.getTransactionReceipt(txHash);
    if (!receipt) {
      throw new Error('Transaction not found');
    }

    const currentBlock = await this.getBlockNumber();
    const confirmedBlocks = currentBlock - receipt.blockNumber;

    if (confirmedBlocks < confirmations) {
      // Wait for more confirmations
      await new Promise((resolve) => {
        const interval = setInterval(async () => {
          const current = await this.getBlockNumber();
          if (current - receipt.blockNumber >= confirmations) {
            clearInterval(interval);
            resolve(true);
          }
        }, 12000); // Check every 12 seconds (Base block time)
      });
    }
  }

  /**
   * Get provider for monitoring
   */
  getProvider(): ethers.JsonRpcProvider {
    return this.provider;
  }
}

export const baseWalletService = new BaseWalletService();

