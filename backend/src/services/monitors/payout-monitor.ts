/**
 * Payout Status Monitor
 * Polls Bread API to check status of pending payouts and update them
 */

import { supabaseAdmin } from '../../utils/supabase.js';
import { logger } from '../../utils/logger.js';
import { breadService } from '../bread/index.js';

export class PayoutMonitor {
  private isRunning = false;
  private pollInterval = 30000; // 30 seconds

  /**
   * Start monitoring payout statuses
   */
  async start() {
    if (this.isRunning) {
      logger.warn('Payout monitor already running');
      return;
    }

    this.isRunning = true;
    logger.info('🔍 Starting payout status monitor...');

    // Start polling
    this.poll();
  }

  /**
   * Stop monitoring
   */
  stop() {
    this.isRunning = false;
    logger.info('Stopped payout monitor');
  }

  /**
   * Poll for pending payouts
   */
  private async poll() {
    while (this.isRunning) {
      try {
        await this.checkPendingPayouts();
      } catch (error) {
        logger.error('Error in payout monitor poll:', error);
      }

      await new Promise((resolve) => setTimeout(resolve, this.pollInterval));
    }
  }

  /**
   * Check pending payouts and update their status
   */
  private async checkPendingPayouts() {
    // Get all pending/processing payouts from last 24 hours
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { data: payouts, error } = await supabaseAdmin
      .from('payouts')
      .select('*')
      .in('status', ['pending', 'processing'])
      .gte('created_at', twentyFourHoursAgo)
      .order('created_at', { ascending: false });

    if (error) {
      logger.error({ error }, 'Failed to fetch pending payouts');
      return;
    }

    if (!payouts || payouts.length === 0) {
      return; // No pending payouts
    }

    logger.info({ count: payouts.length }, 'Checking pending payouts');

    for (const payout of payouts) {
      try {
        await this.updatePayoutStatus(payout);
      } catch (error) {
        logger.error({ error, payoutId: payout.id }, 'Failed to update payout status');
      }
    }
  }

  /**
   * Update a single payout's status by checking Bread API
   */
  private async updatePayoutStatus(payout: any) {
    // Get offramp ID (either from bread_offramp_id or provider_reference)
    const offrampId = payout.bread_offramp_id || payout.provider_reference;

    if (!offrampId) {
      logger.warn({ payoutId: payout.id }, 'Payout has no offramp ID');
      return;
    }

    try {
      // Check status from Bread API
      const offrampStatus = await breadService.offramp.getOfframpStatus(offrampId);

      if (!offrampStatus || !offrampStatus.data) {
        logger.warn({ payoutId: payout.id, offrampId }, 'Could not fetch offramp status');
        return;
      }

      const breadStatus = offrampStatus.data.status;
      logger.debug({ payoutId: payout.id, offrampId, breadStatus }, 'Fetched offramp status');

      // Map Bread status to our status
      let newStatus = payout.status;
      const updateData: any = {};

      if (breadStatus === 'completed' || breadStatus === 'success') {
        newStatus = 'success';
        updateData.status = 'success';
        updateData.completed_at = new Date().toISOString();
        updateData.bread_tx_hash = offrampStatus.data.tx_hash || offrampStatus.data.txHash;
      } else if (breadStatus === 'failed') {
        newStatus = 'failed';
        updateData.status = 'failed';
        updateData.error_message = offrampStatus.data.error_message || offrampStatus.data.errorMessage;
      } else if (breadStatus === 'processing') {
        newStatus = 'processing';
        updateData.status = 'processing';
      }

      // Only update if status changed
      if (newStatus !== payout.status) {
        logger.info({
          payoutId: payout.id,
          oldStatus: payout.status,
          newStatus,
        }, 'Updating payout status');

        const { error: updateError } = await supabaseAdmin
          .from('payouts')
          .update(updateData)
          .eq('id', payout.id);

        if (updateError) {
          logger.error({ error: updateError, payoutId: payout.id }, 'Failed to update payout');
        } else {
          logger.info({ payoutId: payout.id, newStatus }, 'Payout status updated successfully');
        }
      }
    } catch (error: any) {
      // If we get 404, the offramp might be completed but not in Bread's system anymore
      // In this case, if the payout is older than 5 minutes, mark it as success
      if (error.message?.includes('404') || error.statusCode === 404) {
        const payoutAge = Date.now() - new Date(payout.created_at).getTime();
        const fiveMinutes = 5 * 60 * 1000;

        if (payoutAge > fiveMinutes) {
          logger.info({
            payoutId: payout.id,
            age: payoutAge,
          }, 'Offramp not found in Bread API and payout is old - marking as success');

          await supabaseAdmin
            .from('payouts')
            .update({
              status: 'success',
              completed_at: new Date().toISOString(),
            })
            .eq('id', payout.id);
        }
      } else {
        throw error;
      }
    }
  }
}

// Export singleton instance
export const payoutMonitor = new PayoutMonitor();

