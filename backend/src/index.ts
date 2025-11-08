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
import { breadWebhookRoutes } from './routes/bread-webhooks.js';
import { sumsubWebhookRoutes } from './routes/sumsub-webhooks.js';
import { breadRateRoutes } from './routes/bread-rates.js';
import { adminRoutes } from './routes/admin.js';
import { healthRoutes } from './routes/health.js';
// import { walletRoutes } from './routes/wallet.js'; // Removed - NGN wallet feature removed
import { initializeServices, shutdownServices } from './services/index.js';
import { runMigrations } from './db/migrate.js';

const fastify = Fastify({
  logger: true,
  trustProxy: true,
  requestIdHeader: 'x-request-id',
  requestIdLogLabel: 'reqId',
});

// Register plugins
// CORS configuration - handle wildcard and specific origins
const corsOrigin = env.CORS_ORIGIN === '*'
  ? true // Allow all origins when wildcard is set
  : env.CORS_ORIGIN.split(',').map(o => o.trim());

await fastify.register(cors, {
  origin: corsOrigin,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
});

await fastify.register(helmet, {
  contentSecurityPolicy: false,
});

await fastify.register(rateLimit, {
  max: 100,
  timeWindow: '1 minute',
  cache: 10000,
  allowList: ['127.0.0.1'],
  ...(env.REDIS_URL ? { redis: env.REDIS_URL } : {}),
});

// Health check (no auth)
await fastify.register(healthRoutes, { prefix: '/health' });

// Webhooks (no auth, but verify signatures)
await fastify.register(webhookRoutes, { prefix: '/webhooks' });
await fastify.register(breadWebhookRoutes, { prefix: '/api/webhooks/bread' });
await fastify.register(sumsubWebhookRoutes, { prefix: '/api/webhooks/sumsub' });

// Public routes
await fastify.register(authRoutes, { prefix: '/api/auth' });

// Protected routes (require authentication)
await fastify.register(depositRoutes, { prefix: '/api/deposits' });
await fastify.register(quoteRoutes, { prefix: '/api/quotes' });
await fastify.register(payoutRoutes, { prefix: '/api/payouts' });
await fastify.register(kycRoutes, { prefix: '/api/kyc' });
await fastify.register(transactionRoutes, { prefix: '/api/transactions' });
await fastify.register(breadRateRoutes, { prefix: '/api/rates' });
// await fastify.register(walletRoutes, { prefix: '/api/wallet' }); // Removed - NGN wallet feature removed

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
    // Run database migrations before starting server
    logger.info('🔄 Running database migrations...');
    try {
      await runMigrations();
      logger.info('✅ Database migrations completed');
    } catch (migrationError) {
      logger.error('⚠️ Migration failed, but continuing server startup:', migrationError);
      // Don't exit - migrations might fail if already applied
    }

    await fastify.listen({
      port: env.PORT,
      host: '0.0.0.0'
    });

    logger.info(`🚀 Server running on port ${env.PORT}`);
    logger.info(`📊 Environment: ${env.NODE_ENV}`);
    logger.info(`🔗 Solana Network: ${env.SOLANA_NETWORK}`);
    logger.info(`🔗 Base Chain ID: ${env.BASE_CHAIN_ID}`);
    logger.info(`🍞 Bread Integration: ${env.BREAD_ENABLED ? 'ENABLED' : 'DISABLED'}`);
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

