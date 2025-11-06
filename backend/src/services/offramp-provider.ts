/**
 * Offramp Provider Service
 * Uses Bread Africa for all offramp operations
 */

import { BreadIntegrationService } from './bread/integration.js';
import { supabaseAdmin } from '../utils/supabase.js';
import type {
  User,
  PayoutBeneficiary,
  DepositAddress,
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

// Legacy provider removed - we only use Bread Africa now

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
    _fiatTarget?: number,
    _currency: string = 'NGN'
  ) {
    if (!cryptoAmount) {
      throw new Error('Bread provider requires crypto_amount');
    }

    const quote = await this.integration.getQuote(asset, chain, cryptoAmount.toString());

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
    _beneficiary: PayoutBeneficiary
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
 * Offramp Provider - Bread Africa only
 */
export const offrampProvider = new BreadOfframpProvider();

