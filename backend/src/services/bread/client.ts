/**
 * Bread Africa API Client
 * Core HTTP client for interacting with Bread API
 */

import axios, { AxiosInstance, AxiosError, AxiosRequestConfig } from 'axios';
import { logger } from '../../utils/logger.js';
import { BreadConfig, BreadAPIError, BreadErrorResponse } from './types.js';

export class BreadClient {
  private client: AxiosInstance;
  private config: Required<BreadConfig>;

  constructor(config: BreadConfig) {
    this.config = {
      apiKey: config.apiKey,
      baseUrl: config.baseUrl || 'https://processor-prod.up.railway.app',
      timeout: config.timeout || 30000,
      retries: config.retries || 3,
    };

    this.client = axios.create({
      baseURL: this.config.baseUrl,
      timeout: this.config.timeout,
      headers: {
        'Content-Type': 'application/json',
        'x-service-key': this.config.apiKey,
      },
    });

    // Request interceptor for logging
    this.client.interceptors.request.use(
      (config) => {
        logger.debug({
          msg: 'Bread API Request',
          method: config.method?.toUpperCase(),
          url: config.url,
          data: config.data,
        });
        return config;
      },
      (error) => {
        logger.error({ msg: 'Bread API Request Error', error });
        return Promise.reject(error);
      }
    );

    // Response interceptor for logging and error handling
    this.client.interceptors.response.use(
      (response) => {
        logger.debug({
          msg: 'Bread API Response',
          status: response.status,
          data: response.data,
        });
        return response;
      },
      async (error: AxiosError<BreadErrorResponse>) => {
        return this.handleError(error);
      }
    );
  }

  /**
   * Handle API errors and convert to BreadAPIError
   */
  private async handleError(error: AxiosError<BreadErrorResponse>): Promise<never> {
    if (error.response) {
      // Server responded with error
      const { status, data } = error.response;

      // Bread API returns errors in format: { status, message, data }
      // NOT { error: { code, message } }
      const errorMessage = (data as any)?.message || data?.error?.message || 'An unknown error occurred';
      const errorCode = data?.error?.code || 'BREAD_API_ERROR';
      const errorDetails = data?.error?.details || (data as any)?.data;

      logger.error({
        msg: 'Bread API Error Response',
        status,
        errorMessage,
        errorCode,
        fullResponse: data,
      });

      throw new BreadAPIError(
        errorCode,
        errorMessage,
        status,
        errorDetails
      );
    } else if (error.request) {
      // Request made but no response
      logger.error({
        msg: 'Bread API No Response',
        error: error.message,
      });

      throw new BreadAPIError(
        'NETWORK_ERROR',
        'No response from Bread API',
        0
      );
    } else {
      // Error setting up request
      logger.error({
        msg: 'Bread API Request Setup Error',
        error: error.message,
      });

      throw new BreadAPIError(
        'REQUEST_ERROR',
        error.message,
        0
      );
    }
  }

  /**
   * Make a GET request
   */
  async get<T>(path: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.get<T>(path, config);
    return response.data;
  }

  /**
   * Make a POST request
   */
  async post<T>(path: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.post<T>(path, data, config);
    return response.data;
  }

  /**
   * Make a PUT request
   */
  async put<T>(path: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.put<T>(path, data, config);
    return response.data;
  }

  /**
   * Make a PATCH request
   */
  async patch<T>(path: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.patch<T>(path, data, config);
    return response.data;
  }

  /**
   * Make a DELETE request
   */
  async delete<T>(path: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.delete<T>(path, config);
    return response.data;
  }

  /**
   * Check if API is healthy
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.get('/health');
      return true;
    } catch (error) {
      logger.error({ msg: 'Bread API health check failed', error });
      return false;
    }
  }
}

