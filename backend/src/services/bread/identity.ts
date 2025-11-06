/**
 * Bread Africa Identity Service
 * Handles KYC/Identity verification
 */

import { BreadClient } from './client.js';
import {
  BreadIdentity,
  CreateIdentityRequest,
  CreateIdentityResponse,
} from './types.js';
import { logger } from '../../utils/logger.js';

export class BreadIdentityService {
  constructor(private client: BreadClient) {}

  /**
   * Create a new identity for KYC verification
   */
  async createIdentity(request: CreateIdentityRequest): Promise<BreadIdentity> {
    logger.info({
      msg: 'Creating Bread identity',
      email: request.email,
    });

    // Transform request to match Bread API format
    // Bread API expects: type: "link", name: "Full Name", email, phone_number
    const breadRequest: any = {
      type: 'link', // Use link-based verification
      name: `${request.firstName} ${request.lastName}`.trim(),
      email: request.email,
      phone_number: request.phoneNumber,
    };

    logger.debug({
      msg: 'Bread API identity request payload',
      payload: breadRequest,
    });

    const response = await this.client.post<CreateIdentityResponse>(
      '/identity',
      breadRequest
    );

    logger.info({
      msg: 'Bread identity created',
      identityId: response.identity.id,
      status: response.identity.status,
    });

    return response.identity;
  }

  /**
   * Get identity by ID
   */
  async getIdentity(identityId: string): Promise<BreadIdentity> {
    logger.debug({
      msg: 'Fetching Bread identity',
      identityId,
    });

    const identity = await this.client.get<BreadIdentity>(
      `/identity/${identityId}`
    );

    return identity;
  }

  /**
   * Update identity information
   */
  async updateIdentity(
    identityId: string,
    updates: Partial<CreateIdentityRequest>
  ): Promise<BreadIdentity> {
    logger.info({
      msg: 'Updating Bread identity',
      identityId,
    });

    const identity = await this.client.patch<BreadIdentity>(
      `/identity/${identityId}`,
      updates
    );

    logger.info({
      msg: 'Bread identity updated',
      identityId: identity.id,
      status: identity.status,
    });

    return identity;
  }

  /**
   * Check identity verification status
   */
  async getVerificationStatus(identityId: string): Promise<{
    status: BreadIdentity['status'];
    verified: boolean;
  }> {
    const identity = await this.getIdentity(identityId);

    return {
      status: identity.status,
      verified: identity.status === 'verified',
    };
  }
}

