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
import { Asset, Network } from '../../types/index.js';

export class BreadOfframpService {
  constructor(private client: BreadClient) {}

  /**
   * Map SolPay asset + network to Bread asset format
   */
  mapAssetToBread(asset: Asset, network: Network): BreadAsset {
    // Map network to Bread format
    const networkMap: Record<Network, string> = {
      solana: 'solana',
      base: 'base',
      ethereum: 'ethereum',
      bnb: 'bsc',
    };

    const breadNetwork = networkMap[network];
    if (!breadNetwork) {
      throw new Error(`Unsupported network: ${network}`);
    }

    // Map asset to lowercase
    const assetLower = asset.toLowerCase();

    // Construct Bread asset ID
    const breadAsset = `${breadNetwork}:${assetLower}` as BreadAsset;

    logger.debug({
      msg: 'Mapped SolPay asset to Bread',
      solpayAsset: asset,
      solpayNetwork: network,
      breadAsset,
    });

    return breadAsset;
  }

  /**
   * Get offramp quote (crypto → fiat)
   */
  async getQuote(
    asset: Asset,
    network: Network,
    cryptoAmount: number
  ): Promise<OfframpQuoteResponse> {
    const breadAsset = this.mapAssetToBread(asset, network);

    logger.info({
      msg: 'Getting Bread offramp quote',
      asset,
      network,
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
  async getRate(asset: Asset, network: Network): Promise<OfframpRateResponse> {
    const breadAsset = this.mapAssetToBread(asset, network);

    logger.debug({
      msg: 'Fetching Bread exchange rate',
      asset,
      network,
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
   * Execute offramp transaction
   * TODO: Update this when we get actual API documentation for execute endpoint
   */
  async executeOfframp(
    request: ExecuteOfframpRequest
  ): Promise<ExecuteOfframpResponse> {
    logger.info({
      msg: 'Executing Bread offramp',
      asset: request.asset,
      amount: request.amount,
      bankCode: request.bank_code,
    });

    const response = await this.client.post<ExecuteOfframpResponse>(
      '/offramp/execute',
      request
    );

    logger.info({
      msg: 'Bread offramp executed',
      offrampId: response.data.id,
      status: response.data.status,
    });

    return response;
  }

  /**
   * Get offramp status
   * TODO: Update this when we get actual API documentation for status endpoint
   */
  async getOfframpStatus(offrampId: string): Promise<OfframpStatusResponse> {
    logger.debug({
      msg: 'Fetching Bread offramp status',
      offrampId,
    });

    const response = await this.client.get<OfframpStatusResponse>(
      `/offramp/status/${offrampId}`
    );

    logger.debug({
      msg: 'Bread offramp status fetched',
      offrampId,
      status: response.data.status,
    });

    return response;
  }
}

