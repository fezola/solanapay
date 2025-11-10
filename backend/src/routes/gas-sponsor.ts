/**
 * Gas Sponsorship API Routes
 * 
 * Endpoints for monitoring and managing gas fee sponsorship
 */

import { FastifyPluginAsync } from 'fastify';
import { gasSponsorService } from '../services/gas-sponsor/index.js';
import { authMiddleware } from '../middleware/auth.js';

export const gasSponsorRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * Get gas sponsorship stats (admin only)
   * GET /api/gas-sponsor/stats
   */
  fastify.get('/stats', async (request, reply) => {
    try {
      const stats = await gasSponsorService.getGasSponsorshipStats();
      
      return {
        success: true,
        stats,
      };
    } catch (error: any) {
      request.log.error({ error }, 'Failed to get gas sponsor stats');
      return reply.status(500).send({
        error: 'Failed to get gas sponsor stats',
        message: error.message,
      });
    }
  });

  /**
   * Check if gas sponsorship is available
   * GET /api/gas-sponsor/available
   */
  fastify.get('/available', async (request, reply) => {
    try {
      const { hasEnough } = await gasSponsorService.checkGasSponsorBalance();
      
      return {
        success: true,
        available: hasEnough,
      };
    } catch (error: any) {
      request.log.error({ error }, 'Failed to check gas sponsor availability');
      return reply.status(500).send({
        error: 'Failed to check availability',
        message: error.message,
      });
    }
  });
};

