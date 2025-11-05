/**
 * Bread Africa Offramp Service
 * Handles crypto-to-fiat conversions and payouts
 */

import { BreadClient } from './client.js';
import {
  BreadOfframp,
  CreateOfframpRequest,
  CreateOfframpResponse,
  GetRateRequest,
  GetRateResponse,
  ListOfframpsResponse,
} from './types.js';
import { logger } from '../../utils/logger.js';
import { Asset } from '../../types/index.js';

export class BreadOfframpService {
  constructor(private client: BreadClient) {}

  /**
   * Map SolPay asset to Bread crypto asset
   */
  private mapAssetToBread(asset: Asset): string {
    const assetMap: Record<Asset, string> = {
      USDC: 'USDC',
      SOL: 'SOL',
      USDT: 'USDT',
      ETH: 'ETH',
    };

    return assetMap[asset] || asset;
  }

  /**
   * Get current exchange rate
   */
  async getRate(
    asset: Asset,
    fiatCurrency: string = 'NGN',
    cryptoAmount?: string,
    fiatAmount?: string
  ): Promise<GetRateResponse> {
    const cryptoAsset = this.mapAssetToBread(asset);

    logger.debug({
      msg: 'Fetching Bread exchange rate',
      cryptoAsset,
      fiatCurrency,
      cryptoAmount,
      fiatAmount,
    });

    const request: GetRateRequest = {
      cryptoAsset,
      fiatCurrency,
      cryptoAmount,
      fiatAmount,
    };

    const response = await this.client.post<GetRateResponse>('/rate', request);

    logger.debug({
      msg: 'Bread exchange rate fetched',
      rate: response.rate.rate,
      cryptoAmount: response.cryptoAmount,
      fiatAmount: response.fiatAmount,
    });

    return response;
  }

  /**
   * Create an offramp transaction
   */
  async createOfframp(
    walletId: string,
    beneficiaryId: string,
    cryptoAmount: string
  ): Promise<BreadOfframp> {
    logger.info({
      msg: 'Creating Bread offramp',
      walletId,
      beneficiaryId,
      cryptoAmount,
    });

    const request: CreateOfframpRequest = {
      walletId,
      beneficiaryId,
      cryptoAmount,
    };

    const response = await this.client.post<CreateOfframpResponse>(
      '/offramp',
      request
    );

    logger.info({
      msg: 'Bread offramp created',
      offrampId: response.offramp.id,
      status: response.offramp.status,
      fiatAmount: response.offramp.fiatAmount,
    });

    return response.offramp;
  }

  /**
   * Get offramp by ID
   */
  async getOfframp(offrampId: string): Promise<BreadOfframp> {
    logger.debug({
      msg: 'Fetching Bread offramp',
      offrampId,
    });

    const offramp = await this.client.get<BreadOfframp>(
      `/offramp/${offrampId}`
    );

    return offramp;
  }

  /**
   * List offramps for an identity
   */
  async listOfframps(
    identityId: string,
    options?: {
      page?: number;
      limit?: number;
      status?: string;
    }
  ): Promise<ListOfframpsResponse> {
    logger.debug({
      msg: 'Listing Bread offramps',
      identityId,
      options,
    });

    const params = new URLSearchParams();
    if (options?.page) params.append('page', options.page.toString());
    if (options?.limit) params.append('limit', options.limit.toString());
    if (options?.status) params.append('status', options.status);

    const response = await this.client.get<ListOfframpsResponse>(
      `/identity/${identityId}/offramps?${params.toString()}`
    );

    return response;
  }

  /**
   * Cancel an offramp transaction
   */
  async cancelOfframp(offrampId: string): Promise<BreadOfframp> {
    logger.info({
      msg: 'Cancelling Bread offramp',
      offrampId,
    });

    const offramp = await this.client.post<BreadOfframp>(
      `/offramp/${offrampId}/cancel`
    );

    logger.info({
      msg: 'Bread offramp cancelled',
      offrampId: offramp.id,
      status: offramp.status,
    });

    return offramp;
  }

  /**
   * Get offramp status
   */
  async getOfframpStatus(offrampId: string): Promise<{
    status: BreadOfframp['status'];
    completed: boolean;
    failed: boolean;
  }> {
    const offramp = await this.getOfframp(offrampId);

    return {
      status: offramp.status,
      completed: offramp.status === 'completed',
      failed: offramp.status === 'failed',
    };
  }

  /**
   * Calculate quote for offramp
   * This combines rate fetching with fee calculation
   */
  async calculateQuote(
    asset: Asset,
    cryptoAmount: string,
    fiatCurrency: string = 'NGN'
  ): Promise<{
    cryptoAsset: string;
    cryptoAmount: string;
    fiatCurrency: string;
    fiatAmount: string;
    exchangeRate: string;
    fee: string;
    netAmount: string;
  }> {
    const rateResponse = await this.getRate(asset, fiatCurrency, cryptoAmount);

    const fiatAmount = parseFloat(rateResponse.fiatAmount || '0');
    const fee = parseFloat(rateResponse.fee || '0');
    const netAmount = fiatAmount - fee;

    return {
      cryptoAsset: this.mapAssetToBread(asset),
      cryptoAmount,
      fiatCurrency,
      fiatAmount: fiatAmount.toString(),
      exchangeRate: rateResponse.rate.rate,
      fee: fee.toString(),
      netAmount: netAmount.toString(),
    };
  }
}

