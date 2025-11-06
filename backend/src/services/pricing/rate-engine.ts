import axios from 'axios';
import { env } from '../../config/env.js';
import { logger } from '../../utils/logger.js';
import type { Asset, Chain } from '../../types/index.js';

interface PriceData {
  asset: Asset;
  usdPrice: number;
  timestamp: number;
  source: 'pyth' | 'fallback';
}

interface FXRate {
  from: string;
  to: string;
  rate: number;
  timestamp: number;
}

export class RateEngine {
  private priceCache: Map<Asset, PriceData> = new Map();
  private fxCache: Map<string, FXRate> = new Map();
  private cacheTTL = 30000; // 30 seconds

  /**
   * Get current price for an asset in USD
   */
  async getAssetPrice(asset: Asset): Promise<number> {
    const cached = this.priceCache.get(asset);
    
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.usdPrice;
    }

    try {
      // Try Pyth first
      const price = await this.getPriceFromPyth(asset);
      
      this.priceCache.set(asset, {
        asset,
        usdPrice: price,
        timestamp: Date.now(),
        source: 'pyth',
      });

      return price;
    } catch (error) {
      logger.warn(`Pyth price fetch failed for ${asset}, using fallback`);
      
      // Fallback to centralized source
      const price = await this.getPriceFromFallback(asset);
      
      this.priceCache.set(asset, {
        asset,
        usdPrice: price,
        timestamp: Date.now(),
        source: 'fallback',
      });

      return price;
    }
  }

  /**
   * Get price from Pyth Network
   */
  private async getPriceFromPyth(asset: Asset): Promise<number> {
    const priceIds: Record<Asset, string> = {
      USDC: '0xeaa020c61cc479712813461ce153894a96a6c00b21ed0cfc2798d1f9a9e9c94a', // USDC/USD
      USDT: '0x2b89b9dc8fdf9f34709a5b106b472f0f39bb6ca9ce04b0fd7f2e971688e2e53b', // USDT/USD
      SOL: '0xef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d', // SOL/USD
      ETH: '0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace', // ETH/USD
    };

    const priceId = priceIds[asset];
    if (!priceId) {
      throw new Error(`No Pyth price ID for ${asset}`);
    }

    const response = await axios.get(
      `${env.PYTH_PRICE_SERVICE_URL}/api/latest_price_feeds`,
      {
        params: { ids: [priceId] },
        headers: env.PYTH_API_KEY ? { 'X-API-Key': env.PYTH_API_KEY } : {},
        timeout: 5000,
      }
    );

    const priceData = response.data[0];
    if (!priceData || !priceData.price) {
      throw new Error('Invalid Pyth response');
    }

    // Pyth returns price with exponent
    const price = parseFloat(priceData.price.price) * Math.pow(10, priceData.price.expo);
    
    logger.debug(`Pyth price for ${asset}: $${price}`);
    return price;
  }

  /**
   * Get price from fallback source (e.g., CoinGecko, Binance)
   */
  private async getPriceFromFallback(asset: Asset): Promise<number> {
    if (!env.PRICE_FALLBACK_URL) {
      throw new Error('PRICE_FALLBACK_URL not configured');
    }

    const response = await axios.get(env.PRICE_FALLBACK_URL, {
      params: { asset },
      timeout: 5000,
    });

    if (!response.data || !response.data.price) {
      throw new Error('Invalid fallback response');
    }

    return parseFloat(response.data.price);
  }

  /**
   * Get FX rate (e.g., USD to NGN)
   */
  async getFXRate(from: string = 'USD', to: string = 'NGN'): Promise<number> {
    const cacheKey = `${from}_${to}`;
    const cached = this.fxCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.rate;
    }

    // For NGN, use a reliable source or fixed rate
    // In production, integrate with CBN API or forex provider
    let rate: number;

    if (from === 'USD' && to === 'NGN') {
      // Fetch from forex API or use fixed rate
      // For demo, using approximate rate
      rate = 1600; // 1 USD = 1600 NGN (update with real API)
    } else {
      throw new Error(`Unsupported FX pair: ${from}/${to}`);
    }

    this.fxCache.set(cacheKey, {
      from,
      to,
      rate,
      timestamp: Date.now(),
    });

    return rate;
  }

  /**
   * Calculate quote for crypto to fiat conversion
   */
  async calculateQuote(params: {
    asset: Asset;
    chain: Chain;
    cryptoAmount?: number;
    fiatTarget?: number;
    currency?: string;
  }): Promise<{
    cryptoAmount: number;
    spotPrice: number;
    fxRate: number;
    spreadBps: number;
    flatFee: number;
    variableFeeBps: number;
    totalFee: number;
    fiatAmount: number;
    grossFiatAmount: number;
  }> {
    const { asset, cryptoAmount, fiatTarget, currency = 'NGN' } = params;

    // Get spot price in USD
    const spotPriceUSD = await this.getAssetPrice(asset);

    // Get FX rate
    const fxRate = await this.getFXRate('USD', currency);

    // Spot price in target currency
    const spotPrice = spotPriceUSD * fxRate;

    // Apply spread
    const spreadBps = env.DEFAULT_SPREAD_BPS;
    const spreadMultiplier = 1 - spreadBps / 10000;

    let finalCryptoAmount: number;
    let grossFiatAmount: number;

    if (cryptoAmount) {
      // User specified crypto amount
      finalCryptoAmount = cryptoAmount;
      grossFiatAmount = cryptoAmount * spotPrice * spreadMultiplier;
    } else if (fiatTarget) {
      // User specified fiat target (reverse calculation)
      grossFiatAmount = fiatTarget;
      finalCryptoAmount = fiatTarget / (spotPrice * spreadMultiplier);
    } else {
      throw new Error('Must specify either cryptoAmount or fiatTarget');
    }

    // Calculate fees
    const flatFee = env.FLAT_FEE_NGN;
    const variableFeeBps = env.VARIABLE_FEE_BPS;
    const variableFee = (grossFiatAmount * variableFeeBps) / 10000;
    const totalFee = flatFee + variableFee;

    // Final amount user receives
    const fiatAmount = grossFiatAmount - totalFee;

    if (fiatAmount <= 0) {
      throw new Error('Amount too small after fees');
    }

    return {
      cryptoAmount: finalCryptoAmount,
      spotPrice,
      fxRate,
      spreadBps,
      flatFee,
      variableFeeBps,
      totalFee,
      fiatAmount,
      grossFiatAmount,
    };
  }

  /**
   * Validate quote is still valid (within slippage tolerance)
   */
  async validateQuote(
    asset: Asset,
    originalSpotPrice: number,
    slippageToleranceBps: number = 100 // 1%
  ): Promise<boolean> {
    const currentPrice = await this.getAssetPrice(asset);
    const priceDiff = Math.abs(currentPrice - originalSpotPrice);
    const slippageBps = (priceDiff / originalSpotPrice) * 10000;

    return slippageBps <= slippageToleranceBps;
  }

  /**
   * Get all current prices
   */
  async getAllPrices(): Promise<Record<Asset, number>> {
    const assets: Asset[] = ['USDC', 'USDT', 'SOL', 'ETH'];
    const prices: Partial<Record<Asset, number>> = {};

    await Promise.all(
      assets.map(async (asset) => {
        try {
          prices[asset] = await this.getAssetPrice(asset);
        } catch (error) {
          logger.error(`Failed to get price for ${asset}:`, error);
        }
      })
    );

    return prices as Record<Asset, number>;
  }

  /**
   * Clear cache (for testing or manual refresh)
   */
  clearCache() {
    this.priceCache.clear();
    this.fxCache.clear();
    logger.info('Price cache cleared');
  }
}

export const rateEngine = new RateEngine();

