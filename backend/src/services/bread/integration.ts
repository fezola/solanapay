/**
 * Bread Africa Integration Service
 * Bridges SolPay data models with Bread API
 */

import { BreadService } from './index.js';
import { supabase } from '../../utils/supabase.js';
import { logger } from '../../utils/logger.js';
import { env } from '../../config/env.js';
import {
  User,
  PayoutBeneficiary,
  DepositAddress,
  Quote,
  Payout,
  Chain,
  Asset,
} from '../../types/index.js';

export class BreadIntegrationService {
  private breadService: BreadService | null = null;

  constructor() {
    // Only initialize if Bread is enabled
    if (env.BREAD_ENABLED && env.BREAD_API_KEY) {
      this.breadService = new BreadService({
        apiKey: env.BREAD_API_KEY,
        baseUrl: env.BREAD_API_URL,
      });
      logger.info({ msg: 'Bread integration service initialized' });
    } else {
      logger.warn({ msg: 'Bread integration disabled - API key not configured' });
    }
  }

  /**
   * Check if Bread integration is enabled
   */
  isEnabled(): boolean {
    return this.breadService !== null;
  }

  /**
   * Sync user with Bread identity
   */
  async syncUserIdentity(user: User): Promise<string | null> {
    if (!this.breadService) return null;

    try {
      // Check if user already has Bread identity
      const { data: existingUser } = await supabase
        .from('users')
        .select('bread_identity_id')
        .eq('id', user.id)
        .single();

      if (existingUser?.bread_identity_id) {
        logger.debug({
          msg: 'User already has Bread identity',
          userId: user.id,
          identityId: existingUser.bread_identity_id,
        });
        return existingUser.bread_identity_id;
      }

      // Get user profile for name
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('first_name, last_name, username')
        .eq('user_id', user.id)
        .single();

      // Create Bread identity
      const identity = await this.breadService.identity.createIdentity({
        firstName: profile?.first_name || 'User',
        lastName: profile?.last_name || user.id.substring(0, 8),
        email: user.email,
        phoneNumber: user.phone || '+234000000000', // Placeholder if no phone
        address: {
          country: 'NG',
        },
      });

      // Update user with Bread identity ID
      await supabase
        .from('users')
        .update({
          bread_identity_id: identity.id,
          bread_identity_status: identity.status,
          bread_synced_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      logger.info({
        msg: 'User synced with Bread identity',
        userId: user.id,
        identityId: identity.id,
      });

      return identity.id;
    } catch (error) {
      logger.error({
        msg: 'Failed to sync user with Bread identity',
        userId: user.id,
        error,
      });
      throw error;
    }
  }

  /**
   * Sync beneficiary with Bread
   */
  async syncBeneficiary(
    beneficiary: PayoutBeneficiary,
    identityId: string
  ): Promise<string | null> {
    if (!this.breadService) return null;

    try {
      // Check if beneficiary already synced
      if (beneficiary.bread_beneficiary_id) {
        return beneficiary.bread_beneficiary_id;
      }

      // Create Bread beneficiary
      const breadBeneficiary = await this.breadService.beneficiary.createBeneficiary({
        identityId,
        bankCode: beneficiary.bank_code,
        accountNumber: beneficiary.account_number,
        currency: 'NGN',
      });

      // Update beneficiary with Bread ID
      await supabase
        .from('payout_beneficiaries')
        .update({
          bread_beneficiary_id: breadBeneficiary.id,
          bread_synced_at: new Date().toISOString(),
        })
        .eq('id', beneficiary.id);

      logger.info({
        msg: 'Beneficiary synced with Bread',
        beneficiaryId: beneficiary.id,
        breadBeneficiaryId: breadBeneficiary.id,
      });

      return breadBeneficiary.id;
    } catch (error) {
      logger.error({
        msg: 'Failed to sync beneficiary with Bread',
        beneficiaryId: beneficiary.id,
        error,
      });
      throw error;
    }
  }

  /**
   * Create or get deposit address using Bread wallet
   */
  async getOrCreateDepositAddress(
    userId: string,
    chain: Chain,
    asset: Asset
  ): Promise<DepositAddress> {
    if (!this.breadService) {
      throw new Error('Bread integration not enabled');
    }

    try {
      // Get user's Bread identity
      const { data: user } = await supabase
        .from('users')
        .select('bread_identity_id')
        .eq('id', userId)
        .single();

      if (!user?.bread_identity_id) {
        throw new Error('User not synced with Bread');
      }

      // Get user's default beneficiary
      const { data: beneficiary } = await supabase
        .from('payout_beneficiaries')
        .select('*')
        .eq('user_id', userId)
        .eq('is_default', true)
        .single();

      if (!beneficiary?.bread_beneficiary_id) {
        throw new Error('No default beneficiary found');
      }

      // Check if deposit address already exists
      const { data: existingAddress } = await supabase
        .from('deposit_addresses')
        .select('*')
        .eq('user_id', userId)
        .eq('chain', chain)
        .eq('asset', asset)
        .is('disabled_at', null)
        .single();

      if (existingAddress) {
        return existingAddress as DepositAddress;
      }

      // Create Bread wallet
      const wallet = await this.breadService.wallet.findOrCreateWallet(
        user.bread_identity_id,
        chain,
        beneficiary.bread_beneficiary_id
      );

      // Create deposit address record
      const { data: newAddress, error } = await supabase
        .from('deposit_addresses')
        .insert({
          user_id: userId,
          chain,
          asset,
          address: wallet.address,
          derivation_path: '', // Not applicable for Bread wallets
          bread_wallet_id: wallet.id,
          bread_wallet_type: wallet.type,
          bread_synced_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      logger.info({
        msg: 'Deposit address created via Bread',
        userId,
        chain,
        asset,
        address: wallet.address,
      });

      return newAddress as DepositAddress;
    } catch (error) {
      logger.error({
        msg: 'Failed to create deposit address via Bread',
        userId,
        chain,
        asset,
        error,
      });
      throw error;
    }
  }

  /**
   * Get quote using Bread rates
   */
  async getQuote(
    asset: Asset,
    chain: Chain,
    cryptoAmount: string
  ): Promise<{
    spotPrice: string;
    fiatAmount: string;
    fee: string;
    netAmount: string;
  }> {
    if (!this.breadService) {
      throw new Error('Bread integration not enabled');
    }

    try {
      const quote = await this.breadService.offramp.getQuote(
        asset,
        chain,
        parseFloat(cryptoAmount)
      );

      // Calculate net amount (output - fee)
      const netAmount = quote.data.output_amount - quote.data.fee;

      return {
        spotPrice: quote.data.rate.toString(),
        fiatAmount: quote.data.output_amount.toString(),
        fee: quote.data.fee.toString(),
        netAmount: netAmount.toString(),
      };
    } catch (error) {
      logger.error({
        msg: 'Failed to get quote from Bread',
        asset,
        chain,
        cryptoAmount,
        error,
      });
      throw error;
    }
  }

  /**
   * Execute payout using Bread offramp
   */
  async executePayout(payout: Payout): Promise<string> {
    if (!this.breadService) {
      throw new Error('Bread integration not enabled');
    }

    try {
      // Get deposit address with Bread wallet ID
      const { data: quote } = await supabase
        .from('quotes')
        .select('*, deposit_addresses!inner(*)')
        .eq('id', payout.quote_id)
        .single();

      if (!quote?.deposit_addresses?.bread_wallet_id) {
        throw new Error('No Bread wallet found for this quote');
      }

      // Get beneficiary
      const { data: beneficiary } = await supabase
        .from('payout_beneficiaries')
        .select('*')
        .eq('id', payout.beneficiary_id)
        .single();

      if (!beneficiary?.bread_beneficiary_id) {
        throw new Error('Beneficiary not synced with Bread');
      }

      // Execute offramp with correct Bread API format
      const offramp = await this.breadService.offramp.executeOfframp({
        wallet_id: quote.deposit_addresses.bread_wallet_id,
        amount: parseFloat(quote.crypto_amount),
        beneficiary_id: beneficiary.bread_beneficiary_id,
        asset: `${quote.chain}:${quote.asset.toLowerCase()}` as any,
      });

      // Update payout with Bread offramp ID
      await supabase
        .from('payouts')
        .update({
          bread_offramp_id: offramp.data.id,
          bread_tx_hash: offramp.data.tx_hash,
          bread_synced_at: new Date().toISOString(),
          status: 'processing',
        })
        .eq('id', payout.id);

      logger.info({
        msg: 'Payout executed via Bread',
        payoutId: payout.id,
        offrampId: offramp.data.id,
      });

      return offramp.data.id;
    } catch (error) {
      logger.error({
        msg: 'Failed to execute payout via Bread',
        payoutId: payout.id,
        error,
      });
      throw error;
    }
  }
}

