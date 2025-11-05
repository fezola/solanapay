/**
 * Smile Identity API Client
 * Handles communication with Smile ID API for KYC verification
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import crypto from 'crypto';
import { logger } from '../../utils/logger.js';
import type {
  SmileIDConfig,
  SmileIDSubmitJobRequest,
  SmileIDJobResponse,
  SmileIDError,
} from './types.js';

export class SmileIDClient {
  private client: AxiosInstance;
  private config: SmileIDConfig;
  private baseUrl: string;

  constructor(config: SmileIDConfig) {
    this.config = config;
    this.baseUrl = config.sandbox
      ? 'https://testapi.smileidentity.com/v1'
      : 'https://api.smileidentity.com/v1';

    this.client = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 30000, // 30 seconds
    });

    // Request interceptor for logging
    this.client.interceptors.request.use(
      (config) => {
        logger.info('Smile ID API Request', {
          method: config.method,
          url: config.url,
          sandbox: this.config.sandbox,
        });
        return config;
      },
      (error) => {
        logger.error('Smile ID Request Error', { error });
        return Promise.reject(error);
      }
    );

    // Response interceptor for logging and error handling
    this.client.interceptors.response.use(
      (response) => {
        logger.info('Smile ID API Response', {
          status: response.status,
          url: response.config.url,
        });
        return response;
      },
      (error: AxiosError) => {
        this.handleError(error);
        return Promise.reject(error);
      }
    );
  }

  /**
   * Generate signature for Smile ID API requests
   */
  private generateSignature(timestamp: string): string {
    const message = `${this.config.partnerId}${timestamp}`;
    return crypto
      .createHmac('sha256', this.config.apiKey)
      .update(message)
      .digest('hex');
  }

  /**
   * Submit a KYC verification job
   */
  async submitJob(request: SmileIDSubmitJobRequest): Promise<SmileIDJobResponse> {
    try {
      const timestamp = new Date().toISOString();
      const signature = this.generateSignature(timestamp);

      const payload = {
        ...request,
        partner_id: this.config.partnerId,
        timestamp,
        signature,
        callback_url: request.callback_url || this.config.callbackUrl,
      };

      const response = await this.client.post<SmileIDJobResponse>(
        '/submit_job',
        payload
      );

      logger.info('Smile ID job submitted successfully', {
        job_id: request.partner_params.job_id,
        user_id: request.partner_params.user_id,
      });

      return response.data;
    } catch (error) {
      logger.error('Failed to submit Smile ID job', { error });
      throw error;
    }
  }

  /**
   * Get job status
   */
  async getJobStatus(
    userId: string,
    jobId: string,
    includeImageLinks: boolean = false
  ): Promise<SmileIDJobResponse> {
    try {
      const timestamp = new Date().toISOString();
      const signature = this.generateSignature(timestamp);

      const response = await this.client.post<SmileIDJobResponse>(
        '/job_status',
        {
          partner_id: this.config.partnerId,
          user_id: userId,
          job_id: jobId,
          image_links: includeImageLinks,
          timestamp,
          signature,
        }
      );

      return response.data;
    } catch (error) {
      logger.error('Failed to get Smile ID job status', { error, userId, jobId });
      throw error;
    }
  }

  /**
   * Verify BVN (Bank Verification Number)
   */
  async verifyBVN(
    userId: string,
    jobId: string,
    bvn: string,
    userInfo: {
      firstName: string;
      lastName: string;
      dateOfBirth: string; // YYYY-MM-DD
      phoneNumber?: string;
    }
  ): Promise<SmileIDJobResponse> {
    const request: SmileIDSubmitJobRequest = {
      partner_params: {
        user_id: userId,
        job_id: jobId,
        job_type: 5, // Enhanced KYC
      },
      id_info: {
        country: 'NG',
        id_type: 'BVN',
        id_number: bvn,
        first_name: userInfo.firstName,
        last_name: userInfo.lastName,
        dob: userInfo.dateOfBirth,
        phone_number: userInfo.phoneNumber,
        entered: true,
      },
      images: [], // BVN verification doesn't require images
    };

    return this.submitJob(request);
  }

  /**
   * Verify NIN (National Identity Number)
   */
  async verifyNIN(
    userId: string,
    jobId: string,
    nin: string,
    userInfo: {
      firstName: string;
      lastName: string;
      dateOfBirth?: string;
      phoneNumber?: string;
    }
  ): Promise<SmileIDJobResponse> {
    const request: SmileIDSubmitJobRequest = {
      partner_params: {
        user_id: userId,
        job_id: jobId,
        job_type: 5, // Enhanced KYC
      },
      id_info: {
        country: 'NG',
        id_type: 'NIN',
        id_number: nin,
        first_name: userInfo.firstName,
        last_name: userInfo.lastName,
        dob: userInfo.dateOfBirth,
        phone_number: userInfo.phoneNumber,
        entered: true,
      },
      images: [],
    };

    return this.submitJob(request);
  }

  /**
   * Verify document with biometric (selfie + ID card)
   */
  async verifyDocumentWithBiometric(
    userId: string,
    jobId: string,
    documentType: 'DRIVERS_LICENSE' | 'VOTERS_CARD' | 'PASSPORT' | 'NATIONAL_ID',
    selfieImage: string, // Base64
    idCardFrontImage: string, // Base64
    idCardBackImage?: string, // Base64
    userInfo?: {
      firstName?: string;
      lastName?: string;
      idNumber?: string;
    }
  ): Promise<SmileIDJobResponse> {
    const images: any[] = [
      {
        image_type_id: 0, // Selfie
        image: selfieImage,
      },
      {
        image_type_id: 1, // ID Card Front
        image: idCardFrontImage,
      },
    ];

    if (idCardBackImage) {
      images.push({
        image_type_id: 2, // ID Card Back
        image: idCardBackImage,
      });
    }

    const request: SmileIDSubmitJobRequest = {
      partner_params: {
        user_id: userId,
        job_id: jobId,
        job_type: 1, // Biometric KYC
      },
      id_info: {
        country: 'NG',
        id_type: documentType,
        id_number: userInfo?.idNumber,
        first_name: userInfo?.firstName,
        last_name: userInfo?.lastName,
        entered: !!userInfo,
      },
      images,
    };

    return this.submitJob(request);
  }

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(payload: any, receivedSignature: string): boolean {
    try {
      const timestamp = payload.timestamp;
      const expectedSignature = this.generateSignature(timestamp);
      return expectedSignature === receivedSignature;
    } catch (error) {
      logger.error('Failed to verify webhook signature', { error });
      return false;
    }
  }

  /**
   * Handle API errors
   */
  private handleError(error: AxiosError): void {
    if (error.response) {
      const status = error.response.status;
      const data: any = error.response.data;

      logger.error('Smile ID API Error', {
        status,
        code: data?.code,
        message: data?.message,
        details: data,
      });

      throw new Error(
        data?.message || `Smile ID API error: ${status}`
      );
    } else if (error.request) {
      logger.error('Smile ID Network Error', { error: error.message });
      throw new Error('Network error connecting to Smile ID');
    } else {
      logger.error('Smile ID Request Error', { error: error.message });
      throw error;
    }
  }
}

