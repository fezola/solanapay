/**
 * Bread Africa Rate & Quote Routes
 * Provides endpoints for fetching exchange rates and quotes
 */

import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { BreadClient } from '../services/bread/client.js';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import {
  BreadAsset,
  OfframpQuoteRequest,
  OfframpQuoteResponse,
  OfframpRateRequest,
  OfframpRateResponse,
} from '../services/bread/types.js';

// Initialize Bread client
const breadClient = env.BREAD_API_KEY
  ? new BreadClient({
      apiKey: env.BREAD_API_KEY,
      baseUrl: env.BREAD_API_URL || 'https://processor-prod.up.railway.app',
    })
  : null;

// Validation schemas
const getRateSchema = z.object({
  currency: z.enum(['NGN']).default('NGN'),
  asset: z.string(),
});

const getQuoteSchema = z.object({
  asset: z.string(),
  amount: z.number().positive(),
  currency: z.enum(['NGN']).default('NGN'),
  is_exact_output: z.boolean().optional().default(false),
});

export const breadRateRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * GET /api/rates/offramp
   * Get current exchange rate for an asset
   */
  fastify.get('/offramp', async (request, reply) => {
    if (!breadClient) {
      return reply.status(503).send({
        error: 'Bread service not configured',
        message: 'Exchange rate service is not available',
      });
    }

    try {
      const query = getRateSchema.parse(request.query);

      logger.info({
        msg: 'Fetching offramp rate',
        asset: query.asset,
        currency: query.currency,
      });

      const response = await breadClient.get<OfframpRateResponse>(
        `/rate/offramp`,
        {
          params: {
            currency: query.currency,
            asset: query.asset,
          },
        }
      );

      logger.info({
        msg: 'Offramp rate fetched',
        asset: query.asset,
        rate: response.data?.rate,
      });

      return {
        success: true,
        asset: query.asset,
        currency: query.currency,
        rate: response.data?.rate,
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      logger.error({
        msg: 'Failed to fetch offramp rate',
        error: error.message,
        response: error.response?.data,
      });

      return reply.status(error.statusCode || 500).send({
        error: 'Failed to fetch rate',
        message: error.message,
        details: error.response?.data,
      });
    }
  });

  /**
   * POST /api/rates/quote
   * Get precise quote for a specific amount
   */
  fastify.post('/quote', async (request, reply) => {
    if (!breadClient) {
      return reply.status(503).send({
        error: 'Bread service not configured',
        message: 'Quote service is not available',
      });
    }

    try {
      const body = getQuoteSchema.parse(request.body);

      logger.info({
        msg: 'Fetching offramp quote',
        asset: body.asset,
        amount: body.amount,
        currency: body.currency,
        is_exact_output: body.is_exact_output,
      });

      const response = await breadClient.post<OfframpQuoteResponse>(
        `/quote/offramp`,
        {
          asset: body.asset as BreadAsset,
          amount: body.amount,
          currency: body.currency,
          is_exact_output: body.is_exact_output,
        }
      );

      const quoteData = response.data;

      logger.info({
        msg: 'Offramp quote fetched',
        asset: body.asset,
        input_amount: quoteData.input_amount,
        output_amount: quoteData.output_amount,
        rate: quoteData.rate,
        fee: quoteData.fee,
      });

      return {
        success: true,
        asset: body.asset,
        currency: body.currency,
        input_amount: quoteData.input_amount,
        output_amount: quoteData.output_amount,
        rate: quoteData.rate,
        fee: quoteData.fee,
        expiry: quoteData.expiry,
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      logger.error({
        msg: 'Failed to fetch offramp quote',
        error: error.message,
        response: error.response?.data,
      });

      return reply.status(error.statusCode || 500).send({
        error: 'Failed to fetch quote',
        message: error.message,
        details: error.response?.data,
      });
    }
  });
};

