/**
 * Bread Africa Service
 * Main entry point for Bread API integration
 */

import { BreadClient } from './client.js';
import { BreadIdentityService } from './identity.js';
import { BreadBeneficiaryService } from './beneficiary.js';
import { BreadWalletService } from './wallet.js';
import { BreadOfframpService } from './offramp.js';
import { BreadConfig } from './types.js';
import { logger } from '../../utils/logger.js';

export class BreadService {
  private client: BreadClient;
  public identity: BreadIdentityService;
  public beneficiary: BreadBeneficiaryService;
  public wallet: BreadWalletService;
  public offramp: BreadOfframpService;

  constructor(config: BreadConfig) {
    logger.info({
      msg: 'Initializing Bread service',
      baseUrl: config.baseUrl || 'https://api.bread.africa',
    });

    this.client = new BreadClient(config);
    this.identity = new BreadIdentityService(this.client);
    this.beneficiary = new BreadBeneficiaryService(this.client);
    this.wallet = new BreadWalletService(this.client);
    this.offramp = new BreadOfframpService(this.client);
  }

  /**
   * Check if Bread API is healthy
   */
  async healthCheck(): Promise<boolean> {
    return this.client.healthCheck();
  }

  /**
   * Complete onboarding flow for a new user
   * Creates identity, beneficiary, and wallet in one go
   */
  async onboardUser(params: {
    firstName: string;
    lastName: string;
    email: string;
    phoneNumber: string;
    bankCode: string;
    accountNumber: string;
    chains: Array<'solana' | 'base' | 'ethereum'>;
  }): Promise<{
    identityId: string;
    beneficiaryId: string;
    wallets: Array<{
      chain: string;
      address: string;
      walletId: string;
    }>;
  }> {
    logger.info({
      msg: 'Starting Bread user onboarding',
      email: params.email,
    });

    // Step 1: Create identity
    const identity = await this.identity.createIdentity({
      firstName: params.firstName,
      lastName: params.lastName,
      email: params.email,
      phoneNumber: params.phoneNumber,
      address: {
        country: 'NG', // Default to Nigeria
      },
    });

    // Step 2: Create beneficiary
    const beneficiary = await this.beneficiary.createBeneficiary({
      identityId: identity.id,
      bankCode: params.bankCode,
      accountNumber: params.accountNumber,
      currency: 'NGN',
    });

    // Step 3: Create wallets for each chain
    const wallets = await Promise.all(
      params.chains.map(async (chain) => {
        const wallet = await this.wallet.createWallet(
          identity.id,
          chain,
          'offramp',
          beneficiary.id
        );

        return {
          chain,
          address: wallet.address,
          walletId: wallet.id,
        };
      })
    );

    logger.info({
      msg: 'Bread user onboarding completed',
      identityId: identity.id,
      beneficiaryId: beneficiary.id,
      walletCount: wallets.length,
    });

    return {
      identityId: identity.id,
      beneficiaryId: beneficiary.id,
      wallets,
    };
  }

  /**
   * Execute a complete offramp flow
   * DEPRECATED: Use BreadIntegrationService.executePayout() instead
   * This method is not implemented correctly for the current Bread API
   */
  // async executeOfframp(params: {
  //   walletId: string;
  //   beneficiaryId: string;
  //   cryptoAmount: string;
  //   asset: 'USDC' | 'SOL' | 'USDT' | 'ETH';
  // }): Promise<{
  //   offrampId: string;
  //   cryptoAmount: string;
  //   fiatAmount: string;
  //   exchangeRate: string;
  //   fee: string;
  //   status: string;
  // }> {
  //   // TODO: Implement using actual Bread API structure
  //   throw new Error('Not implemented - use BreadIntegrationService.executePayout()');
  // }
}

// Export all types
export * from './types.js';
export { BreadClient } from './client.js';
export { BreadIdentityService } from './identity.js';
export { BreadBeneficiaryService } from './beneficiary.js';
export { BreadWalletService } from './wallet.js';
export { BreadOfframpService } from './offramp.js';

