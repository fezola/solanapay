-- Migration: Add Bread Africa Integration Fields
-- Description: Adds Bread-specific IDs and metadata to existing tables

-- Add Bread identity ID to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS bread_identity_id TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS bread_identity_status TEXT CHECK (bread_identity_status IN ('pending', 'verified', 'rejected')),
ADD COLUMN IF NOT EXISTS bread_synced_at TIMESTAMPTZ;

-- Add Bread beneficiary ID to payout_beneficiaries table
ALTER TABLE payout_beneficiaries
ADD COLUMN IF NOT EXISTS bread_beneficiary_id TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS bread_synced_at TIMESTAMPTZ;

-- Add Bread wallet ID to deposit_addresses table
ALTER TABLE deposit_addresses
ADD COLUMN IF NOT EXISTS bread_wallet_id TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS bread_wallet_type TEXT CHECK (bread_wallet_type IN ('offramp', 'basic')),
ADD COLUMN IF NOT EXISTS bread_synced_at TIMESTAMPTZ;

-- Add Bread offramp ID to payouts table
ALTER TABLE payouts
ADD COLUMN IF NOT EXISTS bread_offramp_id TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS bread_tx_hash TEXT,
ADD COLUMN IF NOT EXISTS bread_synced_at TIMESTAMPTZ;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_bread_identity_id ON users(bread_identity_id);
CREATE INDEX IF NOT EXISTS idx_beneficiaries_bread_id ON payout_beneficiaries(bread_beneficiary_id);
CREATE INDEX IF NOT EXISTS idx_deposit_addresses_bread_wallet_id ON deposit_addresses(bread_wallet_id);
CREATE INDEX IF NOT EXISTS idx_payouts_bread_offramp_id ON payouts(bread_offramp_id);

-- Create table for Bread webhook events
CREATE TABLE IF NOT EXISTS bread_webhook_events (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  event_type TEXT NOT NULL,
  event_id TEXT UNIQUE,
  payload JSONB NOT NULL,
  processed BOOLEAN DEFAULT FALSE,
  processed_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bread_webhooks_event_type ON bread_webhook_events(event_type);
CREATE INDEX IF NOT EXISTS idx_bread_webhooks_processed ON bread_webhook_events(processed);
CREATE INDEX IF NOT EXISTS idx_bread_webhooks_created_at ON bread_webhook_events(created_at);

-- Create table for Bread API logs (for debugging)
CREATE TABLE IF NOT EXISTS bread_api_logs (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id TEXT REFERENCES users(id),
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL,
  request_payload JSONB,
  response_payload JSONB,
  status_code INTEGER,
  error_message TEXT,
  duration_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bread_api_logs_user_id ON bread_api_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_bread_api_logs_endpoint ON bread_api_logs(endpoint);
CREATE INDEX IF NOT EXISTS idx_bread_api_logs_created_at ON bread_api_logs(created_at);

-- Add comments for documentation
COMMENT ON COLUMN users.bread_identity_id IS 'Bread Africa identity ID for KYC';
COMMENT ON COLUMN users.bread_identity_status IS 'Bread identity verification status';
COMMENT ON COLUMN payout_beneficiaries.bread_beneficiary_id IS 'Bread Africa beneficiary ID';
COMMENT ON COLUMN deposit_addresses.bread_wallet_id IS 'Bread Africa wallet ID';
COMMENT ON COLUMN deposit_addresses.bread_wallet_type IS 'Bread wallet type (offramp or basic)';
COMMENT ON COLUMN payouts.bread_offramp_id IS 'Bread Africa offramp transaction ID';
COMMENT ON TABLE bread_webhook_events IS 'Stores webhook events from Bread Africa API';
COMMENT ON TABLE bread_api_logs IS 'Logs all Bread Africa API calls for debugging';

