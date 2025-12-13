import { FastifyPluginAsync } from 'fastify';
import { env } from '../config/env.js';

export const healthRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/', async (request, reply) => {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      environment: env.NODE_ENV,
      version: '1.0.0',
    };
  });

  fastify.get('/ready', async (request, reply) => {
    // Check if all services are ready
    try {
      // Could add checks for DB, Redis, RPC connections here
      return {
        status: 'ready',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      reply.status(503).send({
        status: 'not_ready',
        error: 'Service dependencies not available',
      });
    }
  });

  // Diagnostic endpoint to check platform fee configuration
  fastify.get('/fee-config', async (request, reply) => {
    const treasuryAddresses = {
      solana: process.env.PLATFORM_TREASURY_ADDRESS_SOLANA || process.env.PLATFORM_TREASURY_ADDRESS || null,
      base: process.env.PLATFORM_TREASURY_ADDRESS_BASE || null,
      polygon: process.env.PLATFORM_TREASURY_ADDRESS_POLYGON || null,
    };

    const gasSponsorKeys = {
      base: process.env.BASE_GAS_SPONSOR_PRIVATE_KEY ? 'SET' : 'NOT SET',
      polygon: process.env.POLYGON_GAS_SPONSOR_PRIVATE_KEY ? 'SET' : 'NOT SET',
    };

    const encryptionKey = process.env.WALLET_ENCRYPTION_KEY ? 'SET' : 'NOT SET';
    const encryptionKeyAlt = process.env.ENCRYPTION_KEY ? 'SET' : 'NOT SET';

    return {
      timestamp: new Date().toISOString(),
      treasuryAddresses: {
        solana: treasuryAddresses.solana ? `${treasuryAddresses.solana.slice(0, 8)}...` : 'NOT SET',
        base: treasuryAddresses.base ? `${treasuryAddresses.base.slice(0, 8)}...` : 'NOT SET',
        polygon: treasuryAddresses.polygon ? `${treasuryAddresses.polygon.slice(0, 8)}...` : 'NOT SET',
      },
      gasSponsorKeys,
      encryptionKeys: {
        WALLET_ENCRYPTION_KEY: encryptionKey,
        ENCRYPTION_KEY: encryptionKeyAlt,
      },
      feeConfigured: {
        solana: !!treasuryAddresses.solana,
        base: !!treasuryAddresses.base,
        polygon: !!treasuryAddresses.polygon,
      },
    };
  });
};

