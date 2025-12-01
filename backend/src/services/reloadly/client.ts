/**
 * Reloadly API Client
 * Core HTTP client for interacting with Reloadly Airtime API
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import { logger } from '../../utils/logger.js';
import {
  ReloadlyConfig,
  ReloadlyAuthResponse,
  ReloadlyAPIError,
} from './types.js';

export class ReloadlyClient {
  private client: AxiosInstance;
  private config: Required<ReloadlyConfig>;
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;

  private readonly AUTH_URL = 'https://auth.reloadly.com/oauth/token';
  private readonly SANDBOX_URL = 'https://topups-sandbox.reloadly.com';
  private readonly PRODUCTION_URL = 'https://topups.reloadly.com';

  constructor(config: ReloadlyConfig) {
    this.config = {
      clientId: config.clientId,
      clientSecret: config.clientSecret,
      sandbox: config.sandbox ?? false,
    };

    const baseURL = this.config.sandbox ? this.SANDBOX_URL : this.PRODUCTION_URL;

    this.client = axios.create({
      baseURL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/com.reloadly.topups-v1+json',
      },
    });

    // Request interceptor to add auth token
    this.client.interceptors.request.use(
      async (config) => {
        const token = await this.getAccessToken();
        config.headers.Authorization = `Bearer ${token}`;
        logger.debug({
          msg: 'Reloadly API Request',
          method: config.method?.toUpperCase(),
          url: config.url,
        });
        return config;
      },
      (error) => {
        logger.error({ msg: 'Reloadly API Request Error', error });
        return Promise.reject(error);
      }
    );

    // Response interceptor for logging and error handling
    this.client.interceptors.response.use(
      (response) => {
        logger.debug({
          msg: 'Reloadly API Response',
          status: response.status,
        });
        return response;
      },
      async (error: AxiosError) => {
        return this.handleError(error);
      }
    );
  }

  /**
   * Get OAuth2 access token (with caching)
   */
  private async getAccessToken(): Promise<string> {
    // Return cached token if still valid (with 60s buffer)
    if (this.accessToken && Date.now() < this.tokenExpiry - 60000) {
      return this.accessToken;
    }

    try {
      const audience = this.config.sandbox
        ? 'https://topups-sandbox.reloadly.com'
        : 'https://topups.reloadly.com';

      const response = await axios.post<ReloadlyAuthResponse>(this.AUTH_URL, {
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        grant_type: 'client_credentials',
        audience,
      });

      this.accessToken = response.data.access_token;
      this.tokenExpiry = Date.now() + response.data.expires_in * 1000;

      logger.info({ msg: 'Reloadly access token refreshed' });
      return this.accessToken;
    } catch (error) {
      logger.error({ msg: 'Failed to get Reloadly access token', error });
      throw new ReloadlyAPIError(
        'AUTH_ERROR',
        'Failed to authenticate with Reloadly',
        401
      );
    }
  }

  /**
   * Handle API errors
   */
  private async handleError(error: AxiosError<any>): Promise<never> {
    if (error.response) {
      const { status, data } = error.response;
      const errorMessage = data?.message || data?.error || 'Unknown error';
      const errorCode = data?.errorCode || 'RELOADLY_API_ERROR';

      logger.error({
        msg: 'Reloadly API Error',
        status,
        errorMessage,
        errorCode,
        data,
      });

      throw new ReloadlyAPIError(errorCode, errorMessage, status, data);
    } else if (error.request) {
      logger.error({ msg: 'Reloadly API No Response', error: error.message });
      throw new ReloadlyAPIError('NETWORK_ERROR', 'No response from Reloadly API', 0);
    } else {
      logger.error({ msg: 'Reloadly API Request Setup Error', error: error.message });
      throw new ReloadlyAPIError('REQUEST_ERROR', error.message, 0);
    }
  }

  async get<T>(path: string, params?: Record<string, any>): Promise<T> {
    const response = await this.client.get<T>(path, { params });
    return response.data;
  }

  async post<T>(path: string, data?: any): Promise<T> {
    const response = await this.client.post<T>(path, data);
    return response.data;
  }
}

