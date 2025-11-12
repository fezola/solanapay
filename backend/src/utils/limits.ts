/**
 * Transaction Limits Utility
 * Shared function for creating user transaction limits based on KYC tier
 */

import { supabaseAdmin } from './supabase.js';
import { logger } from './logger.js';

/**
 * Create or update transaction limits for a user based on their KYC tier
 */
export async function createUserLimits(userId: string, tier: number): Promise<void> {
  const limitsByTier: Record<number, { daily: number; weekly: number; monthly: number }> = {
    1: {
      daily: 5000000, // 5M NGN
      weekly: 25000000, // 25M NGN
      monthly: 50000000, // 50M NGN
    },
    2: {
      daily: 10000000, // 10M NGN
      weekly: 50000000, // 50M NGN
      monthly: 100000000, // 100M NGN
    },
  };

  const limits = limitsByTier[tier];
  if (!limits) {
    logger.warn({
      msg: 'Invalid KYC tier for creating limits',
      userId,
      tier,
    });
    return;
  }

  const now = new Date();
  const periods = [
    {
      period: 'daily',
      period_end: new Date(now.getTime() + 24 * 60 * 60 * 1000),
      limit_amount: limits.daily,
    },
    {
      period: 'weekly',
      period_end: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
      limit_amount: limits.weekly,
    },
    {
      period: 'monthly',
      period_end: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
      limit_amount: limits.monthly,
    },
  ];

  for (const limit of periods) {
    // Check if limit already exists for this period
    const { data: existingLimit } = await supabaseAdmin
      .from('transaction_limits')
      .select('id')
      .eq('user_id', userId)
      .eq('period', limit.period)
      .single();

    if (existingLimit) {
      // Limit already exists, skip creation
      logger.debug({
        msg: 'Transaction limit already exists, skipping',
        userId,
        period: limit.period,
      });
      continue;
    }

    // Create new limit
    await supabaseAdmin.from('transaction_limits').insert({
      user_id: userId,
      period: limit.period,
      limit_amount: limit.limit_amount.toString(),
      used_amount: '0',
      period_start: now.toISOString(),
      period_end: limit.period_end.toISOString(),
    });
  }

  logger.info({
    msg: 'Transaction limits created/updated for user',
    userId,
    tier,
    limits,
  });
}

