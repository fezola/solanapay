/**
 * Bread Africa Offramp Service
 * Handles crypto-to-fiat conversions and payouts
 */

import { BreadClient } from './client.js';
import {
  BreadAsset,
  BreadAssetInfo,
  BreadBank,
  OfframpQuoteRequest,
  OfframpQuoteResponse,
  OfframpRateResponse,
  AssetsListResponse,
  BanksListResponse,
  ExecuteOfframpRequest,
  ExecuteOfframpResponse,
  OfframpStatusResponse,
} from './types.js';
import { logger } from '../../utils/logger.js';
import { Asset, Chain } from '../../types/index.js';

export class BreadOfframpService {
  constructor(private client: BreadClient) {}

  /**
   * Map SolPay asset + chain to Bread asset format
   */
  mapAssetToBread(asset: Asset, chain: Chain): BreadAsset {
    // Map chain to Bread format
    const chainMap: Record<string, string> = {
      solana: 'solana',
      base: 'base',
      ethereum: 'ethereum',
      polygon: 'polygon',
      arbitrum: 'arbitrum',
      optimism: 'optimism',
      bsc: 'bsc',
      tron: 'tron',
    };

    const breadNetwork = chainMap[chain];
    if (!breadNetwork) {
      throw new Error(`Unsupported chain: ${chain}`);
    }

    // Map asset to lowercase
    const assetLower = asset.toLowerCase();

    // SOL is only supported on Solana, not on other chains
    if (asset === 'SOL' && chain !== 'solana') {
      throw new Error(`SOL is only supported on Solana network`);
    }

    // ETH is only supported on Ethereum and EVM chains
    if (asset === 'ETH' && chain === 'solana') {
      throw new Error(`ETH is not supported on Solana network`);
    }

    // Construct Bread asset ID
    const breadAsset = `${breadNetwork}:${assetLower}` as BreadAsset;

    logger.debug({
      msg: 'Mapped SolPay asset to Bread',
      solpayAsset: asset,
      solpayChain: chain,
      breadAsset,
    });

    return breadAsset;
  }

  /**
   * Get offramp quote (crypto → fiat)
   */
  async getQuote(
    asset: Asset,
    chain: Chain,
    cryptoAmount: number
  ): Promise<OfframpQuoteResponse> {
    const breadAsset = this.mapAssetToBread(asset, chain);

    logger.info({
      msg: 'Getting Bread offramp quote',
      asset,
      chain,
      breadAsset,
      cryptoAmount,
    });

    const request: OfframpQuoteRequest = {
      amount: cryptoAmount,
      currency: 'NGN',
      asset: breadAsset,
      is_exact_output: false, // Amount is in crypto
    };

    const response = await this.client.post<OfframpQuoteResponse>(
      '/quote/offramp',
      request
    );

    logger.info({
      msg: 'Bread offramp quote fetched',
      rate: response.data.rate,
      outputAmount: response.data.output_amount,
      fee: response.data.fee,
    });

    return response;
  }

  /**
   * Get current exchange rate for an asset
   */
  async getRate(asset: Asset, chain: Chain): Promise<OfframpRateResponse> {
    const breadAsset = this.mapAssetToBread(asset, chain);

    logger.debug({
      msg: 'Fetching Bread exchange rate',
      asset,
      chain,
      breadAsset,
    });

    const response = await this.client.get<OfframpRateResponse>(
      '/rate/offramp',
      {
        params: {
          currency: 'NGN',
          asset: breadAsset,
        },
      }
    );

    logger.debug({
      msg: 'Bread exchange rate fetched',
      rate: response.data.rate,
    });

    return response;
  }

  /**
   * Get list of supported assets
   */
  async getAssets(): Promise<BreadAssetInfo[]> {
    logger.debug({ msg: 'Fetching Bread supported assets' });

    const response = await this.client.get<AssetsListResponse>('/assets');

    logger.debug({
      msg: 'Bread assets fetched',
      count: response.data.length,
    });

    return response.data;
  }

  /**
   * Get list of supported banks
   */
  async getBanks(): Promise<BreadBank[]> {
    logger.debug({ msg: 'Fetching Bread supported banks' });

    const response = await this.client.get<BanksListResponse>('/banks', {
      params: {
        currency: 'NGN',
      },
    });

    logger.debug({
      msg: 'Bread banks fetched',
      count: response.data.length,
    });

    return response.data;
  }

  /**
   * Lookup/verify bank account details
   * This MUST be called before creating a beneficiary
   */
  async lookupAccount(bankCode: string, accountNumber: string): Promise<{
    account_name: string;
    account_number: string;
    bank_code: string;
  }> {
    logger.info({
      msg: 'Looking up bank account',
      bankCode,
      accountNumber,
    });

    try {
      const response = await this.client.post<any>('/lookup', {
        currency: 'NGN',
        bank_code: bankCode,
        account_number: accountNumber,
      });

      logger.info({
        msg: 'Bank account lookup successful',
        accountName: response.data?.account_name || response.account_name,
        fullResponse: JSON.stringify(response, null, 2),
      });

      // Handle different response formats
      const data = response.data || response;

      return {
        account_name: data.account_name,
        account_number: data.account_number || accountNumber,
        bank_code: data.bank_code || bankCode,
      };
    } catch (error: any) {
      logger.error({
        msg: 'Bank account lookup failed',
        bankCode,
        accountNumber,
        error: error.message,
        errorResponse: error.response?.data,
      });
      throw error;
    }
  }

  /**
   * Execute offramp transaction
   * Uses POST /offramp endpoint (not /offramp/execute)
   */
  async executeOfframp(
    request: ExecuteOfframpRequest
  ): Promise<ExecuteOfframpResponse> {
    logger.info({
      msg: 'Executing Bread offramp',
      asset: request.asset,
      amount: request.amount,
      walletId: request.wallet_id,
      beneficiaryId: request.beneficiary_id,
    });

    try {
      const response = await this.client.post<ExecuteOfframpResponse>(
        '/offramp',  // Changed from /offramp/execute
        request
      );

      logger.info({
        msg: 'Bread offramp executed successfully',
        offrampId: response.data?.id,
        status: response.data?.status,
      });

      return response;
    } catch (error: any) {
      logger.error({
        msg: 'Bread offramp execution failed',
        error: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });
      throw error;
    }
  }

  /**
   * Get offramp status
   * Uses GET /offramp/{id} endpoint to fetch offramp details including status
   */
  async getOfframpStatus(offrampId: string): Promise<OfframpStatusResponse> {
    logger.debug({
      msg: 'Fetching Bread offramp status',
      offrampId,
    });

    const response = await this.client.get<OfframpStatusResponse>(
      `/offramp/${offrampId}`
    );

    logger.debug({
      msg: 'Bread offramp status fetched',
      offrampId,
      status: response.data.status,
    });

    return response;
  }

  /**
   * Calculate quote (alias for getQuote for compatibility)
   */
  async calculateQuote(
    asset: Asset,
    chain: Chain,
    cryptoAmount: number
  ): Promise<OfframpQuoteResponse> {
    return this.getQuote(asset, chain, cryptoAmount);
  }

  /**
   * Create offramp (alias for executeOfframp for compatibility)
   */
  async createOfframp(
    request: ExecuteOfframpRequest
  ): Promise<ExecuteOfframpResponse> {
    return this.executeOfframp(request);
  }
}

