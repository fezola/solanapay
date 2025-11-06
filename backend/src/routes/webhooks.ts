import { FastifyPluginAsync } from 'fastify';

export const webhookRoutes: FastifyPluginAsync = async (fastify) => {
  // Paystack webhook removed - we only use Bread Africa now
  // Bread webhooks are handled in /api/bread-webhooks

  /**
   * Solana webhook (if using a service like Helius)
   */
  fastify.post('/solana', async (request, reply) => {
    // Process Solana transaction webhooks
    // This would be called by services like Helius or QuickNode
    const event = request.body as any;

    fastify.log.info('Received Solana webhook:', event);

    // Process the event
    // The monitor service already handles this, but webhooks provide faster notifications

    return { received: true };
  });

  /**
   * Base webhook (if using a service like Alchemy)
   */
  fastify.post('/base', async (request, reply) => {
    // Process Base transaction webhooks
    const event = request.body as any;

    fastify.log.info('Received Base webhook:', event);

    return { received: true };
  });
};

