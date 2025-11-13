/**
 * Bread Africa Wallet Service
 * Handles crypto wallet creation and management
 */

import { BreadClient } from './client.js';
import {
  BreadWallet,
  BreadWalletType,
  BreadNetwork,
  BreadChain,
  CreateWalletRequest,
  CreateWalletResponse,
  ListWalletsResponse,
} from './types.js';
import { logger } from '../../utils/logger.js';
import { Chain } from '../../types/index.js';

export class BreadWalletService {
  constructor(private client: BreadClient) {}

  /**
   * Map SolPay chain to Bread chain
   */
  private mapChainToBread(chain: Chain): { network: BreadNetwork; chain: BreadChain } {
    switch (chain) {
      case 'solana':
        return { network: 'svm', chain: 'solana' };
      case 'base':
        return { network: 'evm', chain: 'base' };
      case 'ethereum':
        return { network: 'evm', chain: 'ethereum' };
      case 'polygon':
        return { network: 'evm', chain: 'polygon' };
      default:
        throw new Error(`Unsupported chain: ${chain}`);
    }
  }

  /**
   * Create a new wallet
   *
   * @param identityId - Bread identity ID
   * @param chain - Blockchain (solana, base, ethereum)
   * @param type - Wallet type:
   *   - 'offramp': Auto-converts crypto to fiat when received (requires beneficiary)
   *   - 'basic': Manual operations, crypto stays in wallet until you trigger offramp
   *   - 'onramp': For buying crypto (not commonly used)
   * @param beneficiaryId - Required for 'offramp' type wallets
   */
  async createWallet(
    identityId: string,
    chain: Chain,
    type: BreadWalletType = 'offramp',
    beneficiaryId?: string
  ): Promise<BreadWallet> {
    const { network, chain: breadChain } = this.mapChainToBread(chain);

    logger.info({
      msg: 'Creating Bread wallet',
      identityId,
      type,
      network,
      chain: breadChain,
    });

    // Generate a unique reference for the wallet
    const reference = `wallet_${identityId}_${chain}_${Date.now()}`;

    // Build Bread API request based on wallet type
    // For offramp wallets, we need to include offramp: true and beneficiary_id
    const breadRequest: any = {
      reference,
    };

    // If this is an offramp wallet, include offramp flag and beneficiary
    if (type === 'offramp' && beneficiaryId) {
      breadRequest.offramp = true;
      breadRequest.beneficiary_id = beneficiaryId;

      logger.info({
        msg: 'Creating offramp wallet with beneficiary',
        reference,
        beneficiaryId,
      });
    }

    logger.debug({
      msg: 'Bread API request payload',
      payload: breadRequest,
    });

    const response = await this.client.post<any>(
      '/wallet',
      breadRequest
    );

    logger.info({
      msg: 'Bread wallet created - raw response',
      response: JSON.stringify(response),
    });

    // Bread API returns: { success, status, message, timestamp, data: { wallet_id, address: { svm, evm }, ... } }
    const walletData = response.data || response;
    const walletId = walletData.wallet_id || walletData.id;
    const address = walletData.address?.svm || walletData.address?.evm || walletData.address;

    if (!walletId) {
      logger.error({ response }, 'Failed to extract wallet ID from Bread response');
      throw new Error('Invalid wallet creation response from Bread API');
    }

    const wallet: BreadWallet = {
      id: walletId,
      identityId,
      type,
      network,
      chain: breadChain,
      address: address || '',
      beneficiaryId,
      status: 'active',
      createdAt: walletData.created_at || new Date().toISOString(),
    };

    logger.info({
      msg: 'Bread wallet created',
      walletId: wallet.id,
      address: wallet.address,
      type: wallet.type,
    });

    return wallet;
  }

  /**
   * Get wallet by ID
   */
  async getWallet(walletId: string): Promise<BreadWallet> {
    logger.debug({
      msg: 'Fetching Bread wallet',
      walletId,
    });

    const response = await this.client.get<any>(`/wallet/${walletId}`);

    // Bread API wraps response in { success, status, message, data: {...} }
    const walletData = response.data || response;

    // Extract the address based on network type
    const address = walletData.address?.svm || walletData.address?.evm || walletData.address || '';

    logger.debug({
      msg: 'Bread wallet fetched',
      walletId,
      address,
      rawResponse: JSON.stringify(response),
    });

    // Map to our BreadWallet interface
    const wallet: BreadWallet = {
      id: walletData.wallet_id || walletData.id || walletId,
      identityId: walletData.identity_id || walletData.identityId || '',
      type: walletData.type || 'offramp',
      network: walletData.network || 'svm',
      chain: walletData.chain || 'solana',
      address,
      beneficiaryId: walletData.beneficiary_id || walletData.beneficiaryId,
      status: walletData.status || 'active',
      createdAt: walletData.created_at || walletData.createdAt || new Date().toISOString(),
    };

    return wallet;
  }

  /**
   * List all wallets for an identity
   */
  async listWallets(identityId: string): Promise<BreadWallet[]> {
    logger.debug({
      msg: 'Listing Bread wallets',
      identityId,
    });

    const response = await this.client.get<ListWalletsResponse>(
      `/identity/${identityId}/wallets`
    );

    return response.wallets;
  }

  /**
   * Get wallet balance
   */
  async getWalletBalance(walletId: string): Promise<{
    balance: string;
    asset: string;
  }> {
    logger.debug({
      msg: 'Fetching Bread wallet balance',
      walletId,
    });

    const response = await this.client.get<{
      balance: string;
      asset: string;
    }>(`/wallet/${walletId}/balance`);

    return response;
  }

  /**
   * Get wallet transactions
   */
  async getWalletTransactions(
    walletId: string,
    options?: {
      page?: number;
      limit?: number;
    }
  ): Promise<any[]> {
    logger.debug({
      msg: 'Fetching Bread wallet transactions',
      walletId,
      options,
    });

    const params = new URLSearchParams();
    if (options?.page) params.append('page', options.page.toString());
    if (options?.limit) params.append('limit', options.limit.toString());

    const response = await this.client.get<{ transactions: any[] }>(
      `/wallet/${walletId}/transactions?${params.toString()}`
    );

    return response.transactions;
  }

  /**
   * Disable a wallet
   */
  async disableWallet(walletId: string): Promise<void> {
    logger.info({
      msg: 'Disabling Bread wallet',
      walletId,
    });

    await this.client.patch(`/wallet/${walletId}`, {
      status: 'inactive',
    });

    logger.info({
      msg: 'Bread wallet disabled',
      walletId,
    });
  }

  /**
   * Find or create wallet for a specific chain
   */
  async findOrCreateWallet(
    identityId: string,
    chain: Chain,
    beneficiaryId?: string
  ): Promise<BreadWallet> {
    const { network, chain: breadChain } = this.mapChainToBread(chain);

    // Try to find existing wallet (check for both 'basic' and 'offramp' types)
    const wallets = await this.listWallets(identityId);
    const existingWallet = wallets.find(
      (w) =>
        w.network === network &&
        w.chain === breadChain &&
        w.status === 'active'
        // Accept any wallet type - we prefer 'basic' but will use 'offramp' if it exists
    );

    if (existingWallet) {
      logger.info({
        msg: 'Found existing Bread wallet',
        walletId: existingWallet.id,
        address: existingWallet.address,
        type: existingWallet.type,
      });
      return existingWallet;
    }

    // Create new wallet - always use 'basic' type so user can choose bank account
    return this.createWallet(identityId, chain, 'basic');
  }
}

