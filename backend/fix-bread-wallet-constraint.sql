-- Fix: Remove UNIQUE constraint on bread_wallet_id
-- Reason: Multiple assets on the same chain share the same Bread wallet
-- Example: SOL, USDC, USDT all use the same Solana Bread wallet

-- Drop the unique constraint on bread_wallet_id
ALTER TABLE deposit_addresses DROP CONSTRAINT IF EXISTS deposit_addresses_bread_wallet_id_key;

-- Keep the index for performance but without uniqueness
DROP INDEX IF EXISTS idx_deposit_addresses_bread_wallet_id;
CREATE INDEX IF NOT EXISTS idx_deposit_addresses_bread_wallet_id ON deposit_addresses(bread_wallet_id);

-- Verify the change
SELECT 
  conname AS constraint_name,
  contype AS constraint_type
FROM pg_constraint
WHERE conrelid = 'deposit_addresses'::regclass
  AND conname LIKE '%bread_wallet%';

