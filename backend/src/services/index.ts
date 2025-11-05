import { solanaMonitor } from './monitors/solana-monitor.js';
import { baseMonitor } from './monitors/base-monitor.js';
import { logger } from '../utils/logger.js';

/**
 * Initialize all background services
 */
export async function initializeServices() {
  logger.info('🚀 Initializing background services...');

  try {
    // Start blockchain monitors
    await solanaMonitor.start();
    await baseMonitor.start();

    logger.info('✅ All services initialized successfully');
  } catch (error) {
    logger.error('❌ Failed to initialize services:', error);
    throw error;
  }
}

/**
 * Shutdown all services gracefully
 */
export async function shutdownServices() {
  logger.info('Shutting down services...');

  solanaMonitor.stop();
  baseMonitor.stop();

  logger.info('All services stopped');
}

