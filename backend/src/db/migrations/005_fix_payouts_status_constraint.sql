-- Migration: Fix payouts status constraint to allow 'completed'
-- Description: The payouts table currently only allows 'success' but code uses 'completed'
-- Date: 2025-11-08

-- Drop the old constraint
ALTER TABLE payouts
DROP CONSTRAINT IF EXISTS payouts_status_check;

-- Add new constraint that allows 'completed'
ALTER TABLE payouts
ADD CONSTRAINT payouts_status_check
CHECK (status IN ('pending', 'processing', 'completed', 'success', 'failed', 'reversed'));

-- Add comment
COMMENT ON COLUMN payouts.status IS 'Payout status: pending, processing, completed, success, failed, reversed';

