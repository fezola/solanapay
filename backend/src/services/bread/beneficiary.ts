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

    const response = await this.client.post<CreateBeneficiaryResponse>(
      '/beneficiary',
      {
        ...request,
        currency: request.currency || 'NGN',
      }
    );

    logger.info({
      msg: 'Bread beneficiary created',
      beneficiaryId: response.beneficiary.id,
      accountName: response.beneficiary.accountName,
    });

    return response.beneficiary;
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
   * Verify bank account details
   * This is typically done automatically by Bread when creating a beneficiary
   */
  async verifyBankAccount(
    bankCode: string,
    accountNumber: string
  ): Promise<{ accountName: string; verified: boolean }> {
    logger.info({
      msg: 'Verifying bank account',
      bankCode,
      accountNumber,
    });

    const response = await this.client.post<{
      accountName: string;
      verified: boolean;
    }>('/beneficiary/verify', {
      bankCode,
      accountNumber,
    });

    logger.info({
      msg: 'Bank account verified',
      accountName: response.accountName,
      verified: response.verified,
    });

    return response;
  }

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

