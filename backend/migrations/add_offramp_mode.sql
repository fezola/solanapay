-- Migration: Add offramp mode support
-- Date: 2025-11-07
-- Description: Adds support for both automatic and basic (manual) offramp modes

-- Step 1: Add offramp_mode column to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS offramp_mode VARCHAR(20) DEFAULT 'basic' 
CHECK (offramp_mode IN ('automatic', 'basic'));

-- Step 2: Add wallet_type and Bread fields to deposit_addresses table
ALTER TABLE deposit_addresses 
ADD COLUMN IF NOT EXISTS wallet_type VARCHAR(20) DEFAULT 'basic' 
CHECK (wallet_type IN ('automatic', 'basic'));

ALTER TABLE deposit_addresses 
ADD COLUMN IF NOT EXISTS bread_wallet_id VARCHAR(255);

ALTER TABLE deposit_addresses 
ADD COLUMN IF NOT EXISTS bread_wallet_type VARCHAR(20);

ALTER TABLE deposit_addresses 
ADD COLUMN IF NOT EXISTS bread_synced_at TIMESTAMP WITH TIME ZONE;

-- Step 3: Update existing users to basic mode (safer default)
UPDATE users 
SET offramp_mode = 'basic' 
WHERE offramp_mode IS NULL;

-- Step 4: Update existing deposit addresses to basic mode
UPDATE deposit_addresses 
SET wallet_type = 'basic' 
WHERE wallet_type IS NULL;

-- Step 5: Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_offramp_mode ON users(offramp_mode);
CREATE INDEX IF NOT EXISTS idx_deposit_addresses_wallet_type ON deposit_addresses(wallet_type);
CREATE INDEX IF NOT EXISTS idx_deposit_addresses_bread_wallet_id ON deposit_addresses(bread_wallet_id);

-- Verification queries (comment out in production)
-- SELECT offramp_mode, COUNT(*) FROM users GROUP BY offramp_mode;
-- SELECT wallet_type, COUNT(*) FROM deposit_addresses GROUP BY wallet_type;

