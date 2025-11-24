-- ============================================================================
-- FIX: Add Bread Africa fields to bank_accounts table
-- ============================================================================
-- This migration adds the missing bread_beneficiary_id and bread_synced_at
-- columns to the bank_accounts table.
--
-- ISSUE: Users getting "Invalid uuid" error when trying to offramp because
-- the bank_accounts table is missing the bread_beneficiary_id column.
--
-- HOW TO RUN:
-- 1. Go to https://supabase.com/dashboard (your project)
-- 2. Click "SQL Editor" in the left sidebar
-- 3. Click "New Query"
-- 4. Copy and paste this entire file
-- 5. Click "Run" or press Cmd/Ctrl + Enter
-- ============================================================================

-- Add Bread beneficiary ID to bank_accounts table
ALTER TABLE bank_accounts
ADD COLUMN IF NOT EXISTS bread_beneficiary_id TEXT,
ADD COLUMN IF NOT EXISTS bread_synced_at TIMESTAMPTZ;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_bank_accounts_bread_beneficiary_id ON bank_accounts(bread_beneficiary_id);

-- Add comment for documentation
COMMENT ON COLUMN bank_accounts.bread_beneficiary_id IS 'Bread Africa beneficiary ID for offramp';
COMMENT ON COLUMN bank_accounts.bread_synced_at IS 'Timestamp when beneficiary was synced with Bread Africa';

-- ============================================================================
-- VERIFICATION
-- ============================================================================
-- Run this query to verify the columns were added:
-- SELECT column_name, data_type 
-- FROM information_schema.columns 
-- WHERE table_name = 'bank_accounts' 
-- AND column_name IN ('bread_beneficiary_id', 'bread_synced_at');
-- ============================================================================

