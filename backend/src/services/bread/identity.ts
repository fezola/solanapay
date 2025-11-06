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
    // Bread API expects: type: "Link", name: "Full Name", details: { email, country }
    const breadRequest: any = {
      type: 'Link', // Use link-based verification
      name: `${request.firstName} ${request.lastName}`.trim(),
      details: {
        email: request.email,
        country: request.address?.country || 'NG', // Default to Nigeria
      },
    };

    logger.info({
      msg: 'Bread API identity request payload',
      payload: breadRequest,
    });

    try {
      const response = await this.client.post<any>(
        '/identity',
        breadRequest
      );

      logger.info({
        msg: 'Bread identity created',
        identityId: response.data?.id,
        fullResponse: response,
      });

      // Bread API returns: { success, status, message, timestamp, data: { id, link } }
      // Map to our BreadIdentity interface
      return {
        id: response.data.id,
        firstName: request.firstName,
        lastName: request.lastName,
        email: request.email,
        phoneNumber: request.phoneNumber,
        status: 'pending',
        createdAt: response.timestamp || new Date().toISOString(),
      };
    } catch (error: any) {
      logger.error({
        msg: 'Failed to create Bread identity',
        error: error.message,
        errorCode: error.code,
        errorStatus: error.statusCode,
        errorDetails: error.details,
        fullError: error,
      });
      throw error;
    }
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

