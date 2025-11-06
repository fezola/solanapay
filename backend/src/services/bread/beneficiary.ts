/**
 * Bread Africa Beneficiary Service
 * Handles bank account management for payouts
 */

import { BreadClient } from './client.js';
import {
  BreadBeneficiary,
  CreateBeneficiaryRequest,
  CreateBeneficiaryResponse,
  ListBeneficiariesResponse,
} from './types.js';
import { logger } from '../../utils/logger.js';

export class BreadBeneficiaryService {
  constructor(private client: BreadClient) {}

  /**
   * Create a new beneficiary (bank account)
   */
  async createBeneficiary(
    request: CreateBeneficiaryRequest
  ): Promise<BreadBeneficiary> {
    logger.info({
      msg: 'Creating Bread beneficiary',
      identityId: request.identityId,
      bankCode: request.bankCode,
      accountNumber: request.accountNumber,
    });

    // Transform request to match Bread API format
    const breadRequest = {
      currency: (request.currency || 'NGN').toUpperCase(),
      identity_id: request.identityId,
      details: {
        account_number: request.accountNumber,
        bank_code: request.bankCode,
      },
    };

    logger.debug({
      msg: 'Bread API request payload',
      payload: breadRequest,
    });

    const response = await this.client.post<any>(
      '/beneficiary',
      breadRequest
    );

    logger.info({
      msg: 'Bread API response',
      fullResponse: JSON.stringify(response, null, 2),
    });

    // Bread API returns: { success, status, message, timestamp, data: { id } }
    const beneficiaryId = response.data?.id || response.id;

    if (!beneficiaryId) {
      logger.error({
        msg: 'No beneficiary ID in Bread API response',
        response,
      });
      throw new Error('Bread API did not return a beneficiary ID');
    }

    logger.info({
      msg: 'Bread beneficiary created successfully',
      beneficiaryId,
    });

    // Return a BreadBeneficiary object
    return {
      id: beneficiaryId,
      identityId: request.identityId,
      bankCode: request.bankCode,
      accountNumber: request.accountNumber,
      accountName: '', // Bread doesn't return account name in beneficiary creation
      currency: request.currency || 'NGN',
      createdAt: response.timestamp || new Date().toISOString(),
    };
  }

  /**
   * Get beneficiary by ID
   */
  async getBeneficiary(beneficiaryId: string): Promise<BreadBeneficiary> {
    logger.debug({
      msg: 'Fetching Bread beneficiary',
      beneficiaryId,
    });

    const beneficiary = await this.client.get<BreadBeneficiary>(
      `/beneficiary/${beneficiaryId}`
    );

    return beneficiary;
  }

  /**
   * List all beneficiaries for an identity
   */
  async listBeneficiaries(identityId: string): Promise<BreadBeneficiary[]> {
    logger.debug({
      msg: 'Listing Bread beneficiaries',
      identityId,
    });

    const response = await this.client.get<ListBeneficiariesResponse>(
      `/identity/${identityId}/beneficiaries`
    );

    return response.beneficiaries;
  }

  /**
   * NOTE: Bread Africa does not have a standalone bank verification endpoint.
   * Bank account verification happens automatically when creating a beneficiary.
   * The verified account name is returned in the beneficiary creation response.
   *
   * This method has been removed. Use createBeneficiary() instead.
   */

  /**
   * Delete a beneficiary
   */
  async deleteBeneficiary(beneficiaryId: string): Promise<void> {
    logger.info({
      msg: 'Deleting Bread beneficiary',
      beneficiaryId,
    });

    await this.client.delete(`/beneficiary/${beneficiaryId}`);

    logger.info({
      msg: 'Bread beneficiary deleted',
      beneficiaryId,
    });
  }
}

