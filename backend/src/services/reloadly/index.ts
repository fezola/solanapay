/**
 * Reloadly Service
 * Handles airtime and data top-up operations for Nigerian networks
 */

import { env } from '../../config/env.js';
import { logger } from '../../utils/logger.js';
import { ReloadlyClient } from './client.js';
import {
  ReloadlyOperator,
  ReloadlyTopupRequest,
  ReloadlyTopupResponse,
  ReloadlyAutoDetectResponse,
  ReloadlyAPIError,
  NIGERIAN_OPERATORS,
} from './types.js';

export * from './types.js';

class ReloadlyService {
  private client: ReloadlyClient | null = null;
  private operatorsCache: ReloadlyOperator[] | null = null;
  private operatorsCacheExpiry: number = 0;

  private getClient(): ReloadlyClient {
    if (!this.client) {
      if (!env.RELOADLY_CLIENT_ID || !env.RELOADLY_CLIENT_SECRET) {
        throw new ReloadlyAPIError(
          'CONFIG_ERROR',
          'Reloadly API credentials not configured',
          500
        );
      }
      this.client = new ReloadlyClient({
        clientId: env.RELOADLY_CLIENT_ID,
        clientSecret: env.RELOADLY_CLIENT_SECRET,
        sandbox: env.RELOADLY_SANDBOX,
      });
    }
    return this.client;
  }

  /**
   * Get all Nigerian operators (with caching)
   */
  async getNigerianOperators(): Promise<ReloadlyOperator[]> {
    // Return cached operators if still valid (cache for 1 hour)
    if (this.operatorsCache && Date.now() < this.operatorsCacheExpiry) {
      return this.operatorsCache;
    }

    const client = this.getClient();
    const operators = await client.get<ReloadlyOperator[]>('/operators/countries/NG');
    
    this.operatorsCache = operators;
    this.operatorsCacheExpiry = Date.now() + 3600000; // 1 hour

    logger.info({ msg: 'Fetched Nigerian operators', count: operators.length });
    return operators;
  }

  /**
   * Auto-detect operator from phone number
   */
  async detectOperator(phoneNumber: string): Promise<ReloadlyAutoDetectResponse> {
    const client = this.getClient();
    // Format phone number (remove leading 0, add country code)
    const formattedNumber = this.formatPhoneNumber(phoneNumber);
    
    const result = await client.get<ReloadlyAutoDetectResponse>(
      `/operators/auto-detect/phone/${formattedNumber}/countries/NG`
    );
    
    logger.info({ msg: 'Auto-detected operator', phone: formattedNumber, operator: result.name });
    return result;
  }

  /**
   * Get operator by ID
   */
  async getOperator(operatorId: number): Promise<ReloadlyOperator> {
    const client = this.getClient();
    return client.get<ReloadlyOperator>(`/operators/${operatorId}`);
  }

  /**
   * Send airtime top-up
   */
  async sendTopup(params: {
    operatorId: number;
    phoneNumber: string;
    amount: number;
    useLocalAmount?: boolean;
    customIdentifier: string;
  }): Promise<ReloadlyTopupResponse> {
    const client = this.getClient();
    const formattedNumber = this.formatPhoneNumber(params.phoneNumber);

    const request: ReloadlyTopupRequest = {
      operatorId: params.operatorId,
      amount: params.amount,
      useLocalAmount: params.useLocalAmount ?? true,
      customIdentifier: params.customIdentifier,
      recipientPhone: {
        countryCode: 'NG',
        number: formattedNumber,
      },
    };

    logger.info({
      msg: 'Sending airtime top-up',
      operatorId: params.operatorId,
      amount: params.amount,
      phone: formattedNumber,
    });

    const result = await client.post<ReloadlyTopupResponse>('/topups', request);

    logger.info({
      msg: 'Airtime top-up successful',
      transactionId: result.transactionId,
      deliveredAmount: result.deliveredAmount,
    });

    return result;
  }

  /**
   * Get account balance
   */
  async getBalance(): Promise<{ balance: number; currencyCode: string }> {
    const client = this.getClient();
    return client.get('/accounts/balance');
  }

  /**
   * Format Nigerian phone number
   */
  private formatPhoneNumber(phone: string): string {
    // Remove spaces, dashes, and other characters
    let cleaned = phone.replace(/[\s\-\(\)]/g, '');
    
    // Remove leading + if present
    if (cleaned.startsWith('+')) {
      cleaned = cleaned.substring(1);
    }
    
    // If starts with 234, it's already formatted
    if (cleaned.startsWith('234')) {
      return cleaned;
    }
    
    // If starts with 0, replace with 234
    if (cleaned.startsWith('0')) {
      return '234' + cleaned.substring(1);
    }
    
    // Otherwise, assume it needs 234 prefix
    return '234' + cleaned;
  }

  /**
   * Check if service is configured
   */
  isConfigured(): boolean {
    return !!(env.RELOADLY_CLIENT_ID && env.RELOADLY_CLIENT_SECRET);
  }
}

export const reloadlyService = new ReloadlyService();

