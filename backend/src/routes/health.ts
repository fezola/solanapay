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
};

