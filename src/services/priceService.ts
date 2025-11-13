/**
 * Price Service
 * Fetches and caches exchange rates from Bread Africa API
 */

import { payoutsApi } from './api';

interface PriceCache {
  [key: string]: {
    rate: number;
    timestamp: number;
  };
}

class PriceService {
  private cache: PriceCache = {};
  private cacheDuration = 60000; // 1 minute cache

  /**
   * Get exchange rate for an asset
   * Returns rate in NGN per token
   */
  async getRate(asset: string, chain: string): Promise<number> {
    const cacheKey = `${asset}-${chain}`;
    const cached = this.cache[cacheKey];

    // Return cached rate if still valid
    if (cached && Date.now() - cached.timestamp < this.cacheDuration) {
      return cached.rate;
    }

    try {
      // Fetch fresh rate from API
      const response = await payoutsApi.getRate(asset, chain);
      const rate = response.rate;

      // Cache the rate
      this.cache[cacheKey] = {
        rate,
        timestamp: Date.now(),
      };

      return rate;
    } catch (error) {
      console.error(`Failed to fetch rate for ${asset} on ${chain}:`, error);
      
      // Return cached rate if available, even if expired
      if (cached) {
        console.warn(`Using expired cached rate for ${asset} on ${chain}`);
        return cached.rate;
      }

      // Fallback rates if no cache available
      const fallbackRates: { [key: string]: number } = {
        'USDC-solana': 1600,
        'USDC-base': 1600,
        'USDC-polygon': 1600,
        'USDT-solana': 1600,
        'USDT-polygon': 1600,
        'SOL-solana': 250000,
      };

      return fallbackRates[cacheKey] || 1600;
    }
  }

  /**
   * Get all rates for dashboard display
   * Returns rates in NGN per token
   */
  async getAllRates(): Promise<{
    usdcSolana: number;
    usdcBase: number;
    usdcPolygon: number;
    usdtSolana: number;
    usdtPolygon: number;
    sol: number;
  }> {
    try {
      // Fetch all rates in parallel
      const [usdcSolana, usdcBase, usdcPolygon, usdtSolana, usdtPolygon, sol] = await Promise.all([
        this.getRate('USDC', 'solana'),
        this.getRate('USDC', 'base'),
        this.getRate('USDC', 'polygon'),
        this.getRate('USDT', 'solana'),
        this.getRate('USDT', 'polygon'),
        this.getRate('SOL', 'solana'),
      ]);

      return {
        usdcSolana,
        usdcBase,
        usdcPolygon,
        usdtSolana,
        usdtPolygon,
        sol,
      };
    } catch (error) {
      console.error('Failed to fetch all rates:', error);

      // Return fallback rates
      return {
        usdcSolana: 1600,
        usdcBase: 1600,
        usdcPolygon: 1600,
        usdtSolana: 1600,
        usdtPolygon: 1600,
        sol: 250000,
      };
    }
  }

  /**
   * Clear the cache (useful for testing or forcing refresh)
   */
  clearCache() {
    this.cache = {};
  }
}

// Export singleton instance
export const priceService = new PriceService();

