-- Migration: Add Bread Africa fields to bank_accounts table
-- Description: Add bread_beneficiary_id and bread_synced_at to bank_accounts table
-- Date: 2025-11-24
-- Reason: The code uses bank_accounts table instead of payout_beneficiaries table for Bread integration

-- Add Bread beneficiary ID to bank_accounts table
ALTER TABLE bank_accounts
ADD COLUMN IF NOT EXISTS bread_beneficiary_id TEXT,
ADD COLUMN IF NOT EXISTS bread_synced_at TIMESTAMPTZ;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_bank_accounts_bread_beneficiary_id ON bank_accounts(bread_beneficiary_id);

-- Add comment for documentation
COMMENT ON COLUMN bank_accounts.bread_beneficiary_id IS 'Bread Africa beneficiary ID for offramp';
COMMENT ON COLUMN bank_accounts.bread_synced_at IS 'Timestamp when beneficiary was synced with Bread Africa';

