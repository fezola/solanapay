/**
 * Offramp Provider Service
 * Abstraction layer that can use either Bread or legacy system
 */

import { BreadIntegrationService } from './bread/integration.js';
import { rateEngine } from './pricing/rate-engine.js';
import { solanaWalletService } from './wallet/solana.js';
import { baseWalletService } from './wallet/base.js';
import { paystackService } from './payout/paystack.js';
import { supabaseAdmin } from '../utils/supabase.js';
import { logger } from '../utils/logger.js';
import { env } from '../config/env.js';
import type {
  User,
  PayoutBeneficiary,
  DepositAddress,
  Quote,
  Payout,
  Chain,
  Asset,
} from '../types/index.js';

export interface OfframpProvider {
  name: string;
  
  /**
   * Get or create deposit address for user
   */
  getDepositAddress(
    userId: string,
    chain: Chain,
    asset: Asset
  ): Promise<DepositAddress>;

  /**
   * Calculate quote for conversion
   */
  calculateQuote(
    asset: Asset,
    chain: Chain,
    cryptoAmount?: number,
    fiatTarget?: number,
    currency?: string
  ): Promise<{
    cryptoAmount: number;
    spotPrice: number;
    fxRate: number;
    spreadBps: number;
    flatFee: number;
    variableFeeBps: number;
    totalFee: number;
    fiatAmount: number;
  }>;

  /**
   * Execute payout
   */
  executePayout(
    payout: Payout,
    beneficiary: PayoutBeneficiary
  ): Promise<{
    providerReference: string;
    status: string;
  }>;

  /**
   * Sync user with provider (if needed)
   */
  syncUser?(user: User): Promise<void>;

  /**
   * Sync beneficiary with provider (if needed)
   */
  syncBeneficiary?(
    beneficiary: PayoutBeneficiary,
    user: User
  ): Promise<void>;
}

/**
 * Legacy offramp provider (current implementation)
 */
class LegacyOfframpProvider implements OfframpProvider {
  name = 'legacy';

  async getDepositAddress(
    userId: string,
    chain: Chain,
    asset: Asset
  ): Promise<DepositAddress> {
    // Check if address already exists
    const { data: existing } = await supabaseAdmin
      .from('deposit_addresses')
      .select('*')
      .eq('user_id', userId)
      .eq('chain', chain)
      .eq('asset', asset)
      .is('disabled_at', null)
      .single();

    if (existing) {
      return existing as DepositAddress;
    }

    // Generate new address
    let address: string;
    let derivationPath: string;

    if (chain === 'solana') {
      const wallet = await solanaWalletService.generateUserWallet(userId);
      address = wallet.address;
      derivationPath = wallet.derivationPath;
    } else if (chain === 'base') {
      const wallet = await baseWalletService.generateUserWallet(userId);
      address = wallet.address;
      derivationPath = wallet.derivationPath;
    } else {
      throw new Error(`Unsupported chain: ${chain}`);
    }

    const { data: newAddress, error } = await supabaseAdmin
      .from('deposit_addresses')
      .insert({
        user_id: userId,
        chain,
        asset,
        address,
        derivation_path: derivationPath,
      })
      .select()
      .single();

    if (error) throw error;

    return newAddress as DepositAddress;
  }

  async calculateQuote(
    asset: Asset,
    chain: Chain,
    cryptoAmount?: number,
    fiatTarget?: number,
    currency: string = 'NGN'
  ) {
    return rateEngine.calculateQuote({
      asset,
      chain,
      cryptoAmount,
      fiatTarget,
      currency,
    });
  }

  async executePayout(
    payout: Payout,
    beneficiary: PayoutBeneficiary
  ): Promise<{ providerReference: string; status: string }> {
    const result = await paystackService.initiateTransfer({
      amount: parseFloat(payout.fiat_amount),
      accountNumber: beneficiary.account_number,
      bankCode: beneficiary.bank_code,
      reference: payout.id,
    });

    return {
      providerReference: result.reference,
      status: result.status,
    };
  }
}

/**
 * Bread offramp provider
 */
class BreadOfframpProvider implements OfframpProvider {
  name = 'bread';
  private integration: BreadIntegrationService;

  constructor() {
    this.integration = new BreadIntegrationService();
  }

  async getDepositAddress(
    userId: string,
    chain: Chain,
    asset: Asset
  ): Promise<DepositAddress> {
    return this.integration.getOrCreateDepositAddress(userId, chain, asset);
  }

  async calculateQuote(
    asset: Asset,
    chain: Chain,
    cryptoAmount?: number,
    fiatTarget?: number,
    currency: string = 'NGN'
  ) {
    if (!cryptoAmount) {
      throw new Error('Bread provider requires crypto_amount');
    }

    const quote = await this.integration.getQuote(asset, cryptoAmount.toString());

    return {
      cryptoAmount,
      spotPrice: parseFloat(quote.spotPrice),
      fxRate: 1, // NGN to NGN
      spreadBps: 0, // Included in Bread's rate
      flatFee: parseFloat(quote.fee),
      variableFeeBps: 0,
      totalFee: parseFloat(quote.fee),
      fiatAmount: parseFloat(quote.netAmount),
    };
  }

  async executePayout(
    payout: Payout,
    beneficiary: PayoutBeneficiary
  ): Promise<{ providerReference: string; status: string }> {
    const offrampId = await this.integration.executePayout(payout);

    return {
      providerReference: offrampId,
      status: 'processing',
    };
  }

  async syncUser(user: User): Promise<void> {
    await this.integration.syncUserIdentity(user);
  }

  async syncBeneficiary(
    beneficiary: PayoutBeneficiary,
    user: User
  ): Promise<void> {
    // Get user's Bread identity
    const { data: userData } = await supabaseAdmin
      .from('users')
      .select('bread_identity_id')
      .eq('id', user.id)
      .single();

    if (!userData?.bread_identity_id) {
      // Sync user first
      const identityId = await this.integration.syncUserIdentity(user);
      if (identityId) {
        await this.integration.syncBeneficiary(beneficiary, identityId);
      }
    } else {
      await this.integration.syncBeneficiary(
        beneficiary,
        userData.bread_identity_id
      );
    }
  }
}

/**
 * Offramp Provider Factory
 * Returns the appropriate provider based on configuration
 */
class OfframpProviderFactory {
  private breadProvider: BreadOfframpProvider | null = null;
  private legacyProvider: LegacyOfframpProvider;

  constructor() {
    this.legacyProvider = new LegacyOfframpProvider();
    
    if (env.BREAD_ENABLED && env.BREAD_API_KEY) {
      this.breadProvider = new BreadOfframpProvider();
      logger.info({ msg: 'Bread offramp provider enabled' });
    } else {
      logger.info({ msg: 'Using legacy offramp provider' });
    }
  }

  /**
   * Get the active offramp provider
   */
  getProvider(): OfframpProvider {
    return this.breadProvider || this.legacyProvider;
  }

  /**
   * Check if Bread is enabled
   */
  isBreadEnabled(): boolean {
    return this.breadProvider !== null;
  }
}

// Export singleton instance
export const offrampProviderFactory = new OfframpProviderFactory();
export const offrampProvider = offrampProviderFactory.getProvider();

