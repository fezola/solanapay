import { ethers } from 'ethers';
import { env } from '../../config/env.js';
import { encrypt, decrypt } from '../../utils/encryption.js';
import { logger } from '../../utils/logger.js';

const ERC20_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function transfer(address to, uint256 amount) returns (bool)',
  'function decimals() view returns (uint8)',
];

export class PolygonWalletService {
  private provider: ethers.JsonRpcProvider;
  private usdcContract: ethers.Contract;
  private usdtContract: ethers.Contract;
  private treasuryHot: string;

  constructor() {
    this.provider = new ethers.JsonRpcProvider(env.POLYGON_RPC_URL || 'https://polygon-rpc.com');
    this.usdcContract = new ethers.Contract(
      env.POLYGON_USDC_CONTRACT || '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359', // USDC on Polygon
      ERC20_ABI,
      this.provider
    );
    this.usdtContract = new ethers.Contract(
      env.POLYGON_USDT_CONTRACT || '0xc2132D05D31c914a87C6611C10748AEb04B58e8F', // USDT on Polygon
      ERC20_ABI,
      this.provider
    );

    // Treasury address is optional for development
    if (env.POLYGON_TREASURY_ADDRESS) {
      this.treasuryHot = env.POLYGON_TREASURY_ADDRESS;
    } else {
      // Use a dummy address for development
      this.treasuryHot = ethers.Wallet.createRandom().address;
      logger.warn('No POLYGON_TREASURY_ADDRESS configured, using temporary address for development');
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
    // Generate wallet using BIP44 path for Ethereum (Polygon uses same derivation)
    // m/44'/60'/0'/0/accountIndex
    const derivationPath = `m/44'/60'/0'/0/${accountIndex}`;

    // In production, derive from master mnemonic stored in HSM
    const wallet = ethers.Wallet.createRandom();

    // Encrypt private key before storage
    const encryptedPrivateKey = encrypt(wallet.privateKey);

    logger.info(`Generated Polygon wallet for user ${userId}: ${wallet.address}`);

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
   * Get USDC balance for an address
   */
  async getUSDCBalance(address: string): Promise<number> {
    try {
      const balance = await this.usdcContract.balanceOf(address);
      const decimals = await this.usdcContract.decimals();
      return parseFloat(ethers.formatUnits(balance, decimals));
    } catch (error) {
      logger.error(`Failed to get USDC balance for ${address}:`, error);
      return 0;
    }
  }

  /**
   * Get USDT balance for an address
   */
  async getUSDTBalance(address: string): Promise<number> {
    try {
      const balance = await this.usdtContract.balanceOf(address);
      const decimals = await this.usdtContract.decimals();
      return parseFloat(ethers.formatUnits(balance, decimals));
    } catch (error) {
      logger.error(`Failed to get USDT balance for ${address}:`, error);
      return 0;
    }
  }

  /**
   * Get MATIC balance for an address
   */
  async getMATICBalance(address: string): Promise<number> {
    try {
      const balance = await this.provider.getBalance(address);
      return parseFloat(ethers.formatEther(balance));
    } catch (error) {
      logger.error(`Failed to get MATIC balance for ${address}:`, error);
      return 0;
    }
  }

  /**
   * Transfer USDC from user wallet to treasury
   */
  async transferUSDC(
    encryptedPrivateKey: string,
    toAddress: string,
    amount: number
  ): Promise<string> {
    const wallet = this.getWallet(encryptedPrivateKey);
    const contract = this.usdcContract.connect(wallet) as ethers.Contract;
    const decimals = await this.usdcContract.decimals();
    const amountWei = ethers.parseUnits(amount.toString(), decimals);

    const tx = await contract.transfer(toAddress, amountWei);
    await tx.wait();

    logger.info(`Transferred ${amount} USDC from ${wallet.address} to ${toAddress}`);
    return tx.hash;
  }

  /**
   * Transfer USDT from user wallet to treasury
   */
  async transferUSDT(
    encryptedPrivateKey: string,
    toAddress: string,
    amount: number
  ): Promise<string> {
    const wallet = this.getWallet(encryptedPrivateKey);
    const contract = this.usdtContract.connect(wallet) as ethers.Contract;
    const decimals = await this.usdtContract.decimals();
    const amountWei = ethers.parseUnits(amount.toString(), decimals);

    const tx = await contract.transfer(toAddress, amountWei);
    await tx.wait();

    logger.info(`Transferred ${amount} USDT from ${wallet.address} to ${toAddress}`);
    return tx.hash;
  }
}

export const polygonWalletService = new PolygonWalletService();

