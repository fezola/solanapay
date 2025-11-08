-- Migration: Make beneficiary_id optional in payouts table
-- Description: Allow payouts without beneficiary for NGN wallet credits
-- Date: 2025-11-08

-- Make beneficiary_id nullable in payouts table
-- This allows offramps to credit NGN wallet without requiring a bank account
ALTER TABLE payouts
ALTER COLUMN beneficiary_id DROP NOT NULL;

-- Add bread_wallet_id to users table for storing user's Bread wallet
-- This is different from deposit_addresses.bread_wallet_id which is per-chain
ALTER TABLE users
ADD COLUMN IF NOT EXISTS bread_wallet_id TEXT;

-- Add comments
COMMENT ON COLUMN payouts.beneficiary_id IS 'Bank account beneficiary ID. NULL for NGN wallet credits, set for bank withdrawals.';
COMMENT ON COLUMN users.bread_wallet_id IS 'User Bread Africa wallet ID for offramps (no beneficiary attached)';

-- Add index for faster lookups of wallet credits (NULL beneficiary)
CREATE INDEX IF NOT EXISTS idx_payouts_wallet_credits ON payouts(user_id, created_at) WHERE beneficiary_id IS NULL;

-- Add index for faster lookups of bank withdrawals (with beneficiary)
CREATE INDEX IF NOT EXISTS idx_payouts_bank_withdrawals ON payouts(user_id, beneficiary_id, created_at) WHERE beneficiary_id IS NOT NULL;

