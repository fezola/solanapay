-- Migration: Add Sumsub KYC Integration
-- Description: Add Sumsub-specific fields to users table and create KYC verifications table

-- Add Sumsub fields to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS sumsub_applicant_id TEXT,
ADD COLUMN IF NOT EXISTS kyc_verified_at TIMESTAMPTZ;

-- Create index on sumsub_applicant_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_sumsub_applicant_id ON users(sumsub_applicant_id);

-- Create KYC verifications table for audit trail
CREATE TABLE IF NOT EXISTS kyc_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'sumsub',
  applicant_id TEXT NOT NULL,
  status TEXT NOT NULL,
  tier INTEGER NOT NULL DEFAULT 0,
  review_result TEXT,
  reject_labels TEXT[],
  webhook_type TEXT,
  raw_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for KYC verifications
CREATE INDEX IF NOT EXISTS idx_kyc_verifications_user_id ON kyc_verifications(user_id);
CREATE INDEX IF NOT EXISTS idx_kyc_verifications_applicant_id ON kyc_verifications(applicant_id);
CREATE INDEX IF NOT EXISTS idx_kyc_verifications_status ON kyc_verifications(status);
CREATE INDEX IF NOT EXISTS idx_kyc_verifications_created_at ON kyc_verifications(created_at DESC);

-- Add updated_at trigger for kyc_verifications
CREATE OR REPLACE FUNCTION update_kyc_verifications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER kyc_verifications_updated_at
BEFORE UPDATE ON kyc_verifications
FOR EACH ROW
EXECUTE FUNCTION update_kyc_verifications_updated_at();

-- Add comment
COMMENT ON TABLE kyc_verifications IS 'Audit trail for KYC verification events from Sumsub';
COMMENT ON COLUMN users.sumsub_applicant_id IS 'Sumsub applicant ID for KYC verification';
COMMENT ON COLUMN users.kyc_verified_at IS 'Timestamp when KYC was approved';

