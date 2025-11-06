/**
 * Sumsub API Client
 * Documentation: https://developers.sumsub.com/api-reference/
 */

import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import crypto from 'crypto';
import { logger } from '../../utils/logger.js';
import {
  SumsubApplicant,
  CreateApplicantRequest,
  AccessTokenResponse,
  ApplicantStatusResponse,
} from './sumsub-types.js';

export interface SumsubConfig {
  appToken: string;
  secretKey: string;
  baseUrl?: string;
  levelName?: string;
}

export class SumsubClient {
  private client: AxiosInstance;
  private config: SumsubConfig;

  constructor(config: SumsubConfig) {
    this.config = {
      baseUrl: 'https://api.sumsub.com',
      levelName: 'basic-kyc-level',
      ...config,
    };

    this.client = axios.create({
      baseURL: this.config.baseUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add request interceptor for authentication
    this.client.interceptors.request.use((config) => {
      const signature = this.generateSignature(config);
      config.headers['X-App-Token'] = this.config.appToken;
      config.headers['X-App-Access-Sig'] = signature.signature;
      config.headers['X-App-Access-Ts'] = signature.timestamp.toString();
      return config;
    });

    // Add response interceptor for logging
    this.client.interceptors.response.use(
      (response) => {
        logger.debug({
          msg: 'Sumsub API response',
          method: response.config.method,
          url: response.config.url,
          status: response.status,
        });
        return response;
      },
      (error) => {
        logger.error({
          msg: 'Sumsub API error',
          method: error.config?.method,
          url: error.config?.url,
          status: error.response?.status,
          error: error.response?.data,
        });
        throw error;
      }
    );

    logger.info({
      msg: 'Sumsub client initialized',
      baseUrl: this.config.baseUrl,
      levelName: this.config.levelName,
    });
  }

  /**
   * Generate HMAC signature for Sumsub API
   */
  private generateSignature(config: AxiosRequestConfig): {
    signature: string;
    timestamp: number;
  } {
    const timestamp = Math.floor(Date.now() / 1000);
    const method = (config.method || 'GET').toUpperCase();
    const url = config.url || '';
    const body = config.data ? JSON.stringify(config.data) : '';

    // Signature format: timestamp + method + url + body
    const message = `${timestamp}${method}${url}${body}`;

    const signature = crypto
      .createHmac('sha256', this.config.secretKey)
      .update(message)
      .digest('hex');

    return { signature, timestamp };
  }

  /**
   * Create a new applicant
   */
  async createApplicant(
    request: CreateApplicantRequest
  ): Promise<SumsubApplicant> {
    logger.info({
      msg: 'Creating Sumsub applicant',
      externalUserId: request.externalUserId,
      levelName: request.levelName || this.config.levelName,
    });

    const payload = {
      externalUserId: request.externalUserId,
      levelName: request.levelName || this.config.levelName,
      ...(request.email && { email: request.email }),
      ...(request.phone && { phone: request.phone }),
      ...(request.fixedInfo && { fixedInfo: request.fixedInfo }),
    };

    const response = await this.client.post<SumsubApplicant>(
      '/resources/applicants',
      payload,
      {
        params: { levelName: payload.levelName },
      }
    );

    logger.info({
      msg: 'Sumsub applicant created',
      applicantId: response.data.id,
      externalUserId: request.externalUserId,
    });

    return response.data;
  }

  /**
   * Get applicant by ID
   */
  async getApplicant(applicantId: string): Promise<SumsubApplicant> {
    logger.debug({
      msg: 'Fetching Sumsub applicant',
      applicantId,
    });

    const response = await this.client.get<SumsubApplicant>(
      `/resources/applicants/${applicantId}/one`
    );

    return response.data;
  }

  /**
   * Get applicant by external user ID
   */
  async getApplicantByExternalId(
    externalUserId: string
  ): Promise<SumsubApplicant | null> {
    logger.debug({
      msg: 'Fetching Sumsub applicant by external ID',
      externalUserId,
    });

    try {
      const response = await this.client.get<SumsubApplicant>(
        `/resources/applicants/-;externalUserId=${externalUserId}/one`
      );
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Generate access token for Web SDK
   */
  async generateAccessToken(
    externalUserId: string,
    levelName?: string,
    ttlInSecs: number = 600
  ): Promise<AccessTokenResponse> {
    logger.info({
      msg: 'Generating Sumsub access token',
      externalUserId,
      levelName: levelName || this.config.levelName,
      ttlInSecs,
    });

    const response = await this.client.post<AccessTokenResponse>(
      '/resources/accessTokens',
      {
        externalUserId,
        levelName: levelName || this.config.levelName,
        ttlInSecs,
      },
      {
        params: {
          userId: externalUserId,
          levelName: levelName || this.config.levelName,
          ttlInSecs,
        },
      }
    );

    logger.info({
      msg: 'Sumsub access token generated',
      externalUserId,
      userId: response.data.userId,
    });

    return response.data;
  }

  /**
   * Get applicant status
   */
  async getApplicantStatus(
    applicantId: string
  ): Promise<ApplicantStatusResponse> {
    logger.debug({
      msg: 'Fetching Sumsub applicant status',
      applicantId,
    });

    const applicant = await this.getApplicant(applicantId);

    return {
      applicantId: applicant.id,
      status: this.mapApplicantStatus(applicant),
      reviewStatus: applicant.review?.reviewStatus || 'init',
      reviewResult: applicant.review?.reviewResult?.reviewAnswer,
      rejectLabels: applicant.review?.reviewResult?.rejectLabels,
      moderationComment: applicant.review?.reviewResult?.reviewRejectType,
    };
  }

  /**
   * Map Sumsub applicant to status
   */
  private mapApplicantStatus(
    applicant: SumsubApplicant
  ): ApplicantStatusResponse['status'] {
    if (!applicant.review) {
      return 'init';
    }

    const reviewStatus = applicant.review.reviewStatus;

    if (reviewStatus === 'completed') {
      return 'completed';
    } else if (reviewStatus === 'pending' || reviewStatus === 'queued') {
      return 'pending';
    } else if (reviewStatus === 'onHold') {
      return 'onHold';
    }

    return 'init';
  }

  /**
   * Reset applicant (for retry)
   */
  async resetApplicant(applicantId: string): Promise<void> {
    logger.info({
      msg: 'Resetting Sumsub applicant',
      applicantId,
    });

    await this.client.post(`/resources/applicants/${applicantId}/reset`);

    logger.info({
      msg: 'Sumsub applicant reset',
      applicantId,
    });
  }

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(
    payload: string,
    signature: string,
    secret: string
  ): boolean {
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  }
}

