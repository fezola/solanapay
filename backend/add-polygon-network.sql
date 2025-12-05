-- Migration: Add 'polygon' to deposit_addresses network constraint
-- Description: Allow Polygon network in deposit_addresses table
-- Date: 2025-11-22

-- Drop the old constraint
ALTER TABLE deposit_addresses
DROP CONSTRAINT IF EXISTS deposit_addresses_network_check;

-- Add new constraint that includes 'polygon' .
ALTER TABLE deposit_addresses
ADD CONSTRAINT deposit_addresses_network_check
CHECK (network IN ('solana', 'base', 'ethereum', 'polygon'));

-- Verify the change
SELECT 
  conname AS constraint_name,
  pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'deposit_addresses'::regclass
  AND conname = 'deposit_addresses_network_check';

