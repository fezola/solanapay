import axios, { AxiosInstance } from 'axios';
import { env } from '../../config/env.js';
import { logger } from '../../utils/logger.js';

interface BankAccount {
  account_number: string;
  account_name: string;
  bank_code: string;
}

interface TransferRecipient {
  recipient_code: string;
  type: string;
  name: string;
  details: {
    account_number: string;
    account_name: string;
    bank_code: string;
    bank_name: string;
  };
}

interface Transfer {
  reference: string;
  amount: number;
  recipient: string;
  reason?: string;
}

interface TransferResponse {
  status: boolean;
  message: string;
  data: {
    reference: string;
    transfer_code: string;
    status: 'pending' | 'success' | 'failed';
    amount: number;
  };
}

export class PaystackService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: 'https://api.paystack.co',
      headers: {
        Authorization: `Bearer ${env.PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });
  }

  /**
   * Verify bank account using NUBAN
   */
  async verifyBankAccount(
    accountNumber: string,
    bankCode: string
  ): Promise<{ account_name: string; account_number: string }> {
    // Mock mode for development
    if (env.PAYSTACK_MOCK_MODE) {
      logger.info(`[MOCK MODE] Verifying bank account: ${accountNumber}`);
      return {
        account_name: 'JOHN DOE TEST ACCOUNT',
        account_number: accountNumber,
      };
    }

    try {
      const response = await this.client.get('/bank/resolve', {
        params: {
          account_number: accountNumber,
          bank_code: bankCode,
        },
      });

      if (!response.data.status) {
        throw new Error(response.data.message || 'Account verification failed');
      }

      logger.info(`Verified bank account: ${response.data.data.account_name}`);

      return {
        account_name: response.data.data.account_name,
        account_number: response.data.data.account_number,
      };
    } catch (error: any) {
      logger.error('Bank account verification failed:', error.response?.data || error.message);
      throw new Error('Failed to verify bank account');
    }
  }

  /**
   * Get list of supported banks
   */
  async getBanks(): Promise<Array<{ name: string; code: string; slug: string }>> {
    // Mock mode for development
    if (env.PAYSTACK_MOCK_MODE) {
      logger.info('[MOCK MODE] Returning mock Nigerian banks');
      return [
        { name: 'Access Bank', code: '044', slug: 'access-bank' },
        { name: 'GTBank', code: '058', slug: 'gtbank' },
        { name: 'First Bank', code: '011', slug: 'first-bank' },
        { name: 'Zenith Bank', code: '057', slug: 'zenith-bank' },
        { name: 'UBA', code: '033', slug: 'uba' },
        { name: 'Kuda Bank', code: '50211', slug: 'kuda-bank' },
        { name: 'Opay', code: '999992', slug: 'opay' },
        { name: 'Palmpay', code: '999991', slug: 'palmpay' },
      ];
    }

    try {
      const response = await this.client.get('/bank', {
        params: {
          country: 'nigeria',
          use_cursor: false,
          perPage: 100,
        },
      });

      if (!response.data.status) {
        throw new Error('Failed to fetch banks');
      }

      return response.data.data.map((bank: any) => ({
        name: bank.name,
        code: bank.code,
        slug: bank.slug,
      }));
    } catch (error: any) {
      logger.error('Failed to fetch banks:', error.response?.data || error.message);
      throw new Error('Failed to fetch banks');
    }
  }

  /**
   * Create transfer recipient
   */
  async createTransferRecipient(params: {
    type: 'nuban';
    name: string;
    account_number: string;
    bank_code: string;
    currency?: string;
  }): Promise<TransferRecipient> {
    try {
      const response = await this.client.post('/transferrecipient', {
        type: params.type,
        name: params.name,
        account_number: params.account_number,
        bank_code: params.bank_code,
        currency: params.currency || 'NGN',
      });

      if (!response.data.status) {
        throw new Error(response.data.message || 'Failed to create recipient');
      }

      logger.info(`Created transfer recipient: ${response.data.data.recipient_code}`);

      return response.data.data;
    } catch (error: any) {
      logger.error('Failed to create recipient:', error.response?.data || error.message);
      throw new Error('Failed to create transfer recipient');
    }
  }

  /**
   * Initiate transfer
   */
  async initiateTransfer(params: {
    amount: number; // in kobo (NGN * 100)
    recipient: string; // recipient_code
    reason?: string;
    reference?: string;
  }): Promise<TransferResponse['data']> {
    try {
      const reference = params.reference || `TXF_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const response = await this.client.post('/transfer', {
        source: 'balance',
        amount: params.amount,
        recipient: params.recipient,
        reason: params.reason || 'Crypto off-ramp payout',
        reference,
      });

      if (!response.data.status) {
        throw new Error(response.data.message || 'Transfer initiation failed');
      }

      logger.info(`Initiated transfer: ${reference} - ${params.amount / 100} NGN`);

      return response.data.data;
    } catch (error: any) {
      logger.error('Transfer initiation failed:', error.response?.data || error.message);
      
      const errorMessage = error.response?.data?.message || error.message;
      throw new Error(`Transfer failed: ${errorMessage}`);
    }
  }

  /**
   * Verify transfer status
   */
  async verifyTransfer(reference: string): Promise<{
    status: 'pending' | 'success' | 'failed' | 'reversed';
    amount: number;
    recipient: any;
    reason?: string;
  }> {
    try {
      const response = await this.client.get(`/transfer/verify/${reference}`);

      if (!response.data.status) {
        throw new Error('Transfer verification failed');
      }

      const data = response.data.data;

      return {
        status: data.status,
        amount: data.amount,
        recipient: data.recipient,
        reason: data.reason,
      };
    } catch (error: any) {
      logger.error('Transfer verification failed:', error.response?.data || error.message);
      throw new Error('Failed to verify transfer');
    }
  }

  /**
   * Get transfer by reference
   */
  async getTransfer(reference: string) {
    try {
      const response = await this.client.get(`/transfer`, {
        params: { reference },
      });

      if (!response.data.status || !response.data.data.length) {
        throw new Error('Transfer not found');
      }

      return response.data.data[0];
    } catch (error: any) {
      logger.error('Failed to get transfer:', error.response?.data || error.message);
      throw new Error('Failed to get transfer');
    }
  }

  /**
   * Handle webhook event
   */
  async handleWebhook(event: any): Promise<{
    reference: string;
    status: 'success' | 'failed' | 'reversed';
    amount: number;
  }> {
    const { event: eventType, data } = event;

    if (eventType === 'transfer.success') {
      return {
        reference: data.reference,
        status: 'success',
        amount: data.amount,
      };
    } else if (eventType === 'transfer.failed') {
      return {
        reference: data.reference,
        status: 'failed',
        amount: data.amount,
      };
    } else if (eventType === 'transfer.reversed') {
      return {
        reference: data.reference,
        status: 'reversed',
        amount: data.amount,
      };
    }

    throw new Error(`Unsupported webhook event: ${eventType}`);
  }

  /**
   * Get account balance
   */
  async getBalance(): Promise<{ balance: number; currency: string }> {
    try {
      const response = await this.client.get('/balance');

      if (!response.data.status) {
        throw new Error('Failed to fetch balance');
      }

      const balanceData = response.data.data.find((b: any) => b.currency === 'NGN');

      return {
        balance: balanceData.balance / 100, // Convert from kobo to NGN
        currency: balanceData.currency,
      };
    } catch (error: any) {
      logger.error('Failed to fetch balance:', error.response?.data || error.message);
      throw new Error('Failed to fetch balance');
    }
  }
}

export const paystackService = new PaystackService();

