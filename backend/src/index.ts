import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import { env } from './config/env.js';
import { logger } from './utils/logger.js';
import { authRoutes } from './routes/auth.js';
import { depositRoutes } from './routes/deposits.js';
import { quoteRoutes } from './routes/quotes.js';
import { payoutRoutes } from './routes/payouts.js';
import { kycRoutes } from './routes/kyc.js';
import { transactionRoutes } from './routes/transactions.js';
import { webhookRoutes } from './routes/webhooks.js';
import { adminRoutes } from './routes/admin.js';
import { healthRoutes } from './routes/health.js';
import { initializeServices, shutdownServices } from './services/index.js';

const fastify = Fastify({
  logger: logger,
  trustProxy: true,
  requestIdHeader: 'x-request-id',
  requestIdLogLabel: 'reqId',
});

// Register plugins
await fastify.register(cors, {
  origin: env.NODE_ENV === 'production' 
    ? ['https://yourdomain.com'] 
    : true,
  credentials: true,
});

await fastify.register(helmet, {
  contentSecurityPolicy: false,
});

await fastify.register(rateLimit, {
  max: 100,
  timeWindow: '1 minute',
  cache: 10000,
  allowList: ['127.0.0.1'],
  redis: env.REDIS_URL,
});

// Health check (no auth)
await fastify.register(healthRoutes, { prefix: '/health' });

// Webhooks (no auth, but verify signatures)
await fastify.register(webhookRoutes, { prefix: '/webhooks' });

// Public routes
await fastify.register(authRoutes, { prefix: '/api/auth' });

// Protected routes (require authentication)
await fastify.register(depositRoutes, { prefix: '/api/deposits' });
await fastify.register(quoteRoutes, { prefix: '/api/quotes' });
await fastify.register(payoutRoutes, { prefix: '/api/payouts' });
await fastify.register(kycRoutes, { prefix: '/api/kyc' });
await fastify.register(transactionRoutes, { prefix: '/api/transactions' });

// Admin routes (require admin auth)
await fastify.register(adminRoutes, { prefix: '/api/admin' });

// Error handler
fastify.setErrorHandler((error, request, reply) => {
  request.log.error(error);
  
  const statusCode = error.statusCode || 500;
  const message = env.NODE_ENV === 'production' && statusCode === 500
    ? 'Internal Server Error'
    : error.message;

  reply.status(statusCode).send({
    error: {
      message,
      statusCode,
      ...(env.NODE_ENV !== 'production' && { stack: error.stack }),
    },
  });
});

// Initialize background services
await initializeServices();

// Start server
const start = async () => {
  try {
    await fastify.listen({ 
      port: env.PORT, 
      host: '0.0.0.0' 
    });
    
    logger.info(`🚀 Server running on port ${env.PORT}`);
    logger.info(`📊 Environment: ${env.NODE_ENV}`);
    logger.info(`🔗 Solana Network: ${env.SOLANA_NETWORK}`);
    logger.info(`🔗 Base Chain ID: ${env.BASE_CHAIN_ID}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

// Graceful shutdown
const shutdown = async () => {
  logger.info('Shutting down gracefully...');
  await shutdownServices();
  await fastify.close();
  process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

start();

