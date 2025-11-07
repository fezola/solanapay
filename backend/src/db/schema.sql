-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(20) UNIQUE,
  kyc_tier INTEGER DEFAULT 0 CHECK (kyc_tier IN (0, 1, 2)),
  kyc_status VARCHAR(20) DEFAULT 'not_started' CHECK (kyc_status IN ('not_started', 'pending', 'approved', 'rejected')),
  risk_score INTEGER DEFAULT 0,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'banned')),
  offramp_mode VARCHAR(20) DEFAULT 'basic' CHECK (offramp_mode IN ('automatic', 'basic')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- KYC Verifications
CREATE TABLE kyc_verifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider VARCHAR(50) NOT NULL,
  level INTEGER NOT NULL CHECK (level IN (0, 1, 2)),
  status VARCHAR(20) NOT NULL CHECK (status IN ('not_started', 'pending', 'approved', 'rejected')),
  bvn VARCHAR(11),
  nin VARCHAR(11),
  document_type VARCHAR(50),
  document_number VARCHAR(100),
  document_url TEXT,
  selfie_url TEXT,
  address_proof_url TEXT,
  result_json JSONB,
  rejection_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  verified_at TIMESTAMP WITH TIME ZONE
);

-- Deposit Addresses (Custodial)
CREATE TABLE deposit_addresses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  chain VARCHAR(20) NOT NULL,
  asset VARCHAR(10) NOT NULL,
  address VARCHAR(255) NOT NULL,
  derivation_path VARCHAR(100) NOT NULL,
  encrypted_private_key TEXT,
  wallet_type VARCHAR(20) DEFAULT 'basic' CHECK (wallet_type IN ('automatic', 'basic')),
  bread_wallet_id VARCHAR(255),
  bread_wallet_type VARCHAR(20),
  bread_synced_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  disabled_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(user_id, chain, asset),
  UNIQUE(address, chain)
);

-- Onchain Deposits
CREATE TABLE onchain_deposits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  deposit_address_id UUID NOT NULL REFERENCES deposit_addresses(id),
  chain VARCHAR(20) NOT NULL,
  asset VARCHAR(10) NOT NULL,
  address VARCHAR(255) NOT NULL,
  tx_hash VARCHAR(255) NOT NULL,
  amount DECIMAL(36, 18) NOT NULL,
  confirmations INTEGER DEFAULT 0,
  required_confirmations INTEGER NOT NULL,
  detected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  confirmed_at TIMESTAMP WITH TIME ZONE,
  swept_at TIMESTAMP WITH TIME ZONE,
  status VARCHAR(20) DEFAULT 'detected' CHECK (status IN ('detected', 'confirming', 'confirmed', 'swept', 'failed')),
  from_address VARCHAR(255),
  block_number BIGINT,
  metadata JSONB DEFAULT '{}',
  UNIQUE(tx_hash, chain)
);

-- Quotes
CREATE TABLE quotes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  asset VARCHAR(10) NOT NULL,
  chain VARCHAR(20) NOT NULL,
  crypto_amount DECIMAL(36, 18) NOT NULL,
  spot_price DECIMAL(36, 18) NOT NULL,
  fx_rate DECIMAL(36, 18) NOT NULL,
  spread_bps INTEGER NOT NULL,
  flat_fee DECIMAL(36, 2) NOT NULL,
  variable_fee_bps INTEGER NOT NULL,
  total_fee DECIMAL(36, 2) NOT NULL,
  fiat_amount DECIMAL(36, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'NGN',
  lock_expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'locked', 'expired', 'executed', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  executed_at TIMESTAMP WITH TIME ZONE
);

-- Payout Beneficiaries
CREATE TABLE payout_beneficiaries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  bank_code VARCHAR(10) NOT NULL,
  bank_name VARCHAR(100) NOT NULL,
  account_number VARCHAR(20) NOT NULL,
  account_name VARCHAR(255) NOT NULL,
  verified_at TIMESTAMP WITH TIME ZONE,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, account_number, bank_code)
);

-- Payouts
CREATE TABLE payouts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  quote_id UUID NOT NULL REFERENCES quotes(id),
  beneficiary_id UUID NOT NULL REFERENCES payout_beneficiaries(id),
  fiat_amount DECIMAL(36, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'NGN',
  provider VARCHAR(50) NOT NULL,
  provider_reference VARCHAR(255),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'success', 'failed', 'reversed')),
  error_code VARCHAR(50),
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Limits
CREATE TABLE limits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  period VARCHAR(20) NOT NULL CHECK (period IN ('daily', 'weekly', 'monthly')),
  asset VARCHAR(10) DEFAULT 'ALL',
  max_amount DECIMAL(36, 2) NOT NULL,
  used_amount DECIMAL(36, 2) DEFAULT 0,
  resets_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, period, asset)
);

-- Risk Events
CREATE TABLE risk_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  weight INTEGER NOT NULL,
  reason_code VARCHAR(100) NOT NULL,
  context JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Audit Logs
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_id UUID,
  actor_type VARCHAR(20) CHECK (actor_type IN ('user', 'admin', 'system')),
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID,
  payload JSONB DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Treasury Wallets
CREATE TABLE treasury_wallets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chain VARCHAR(20) NOT NULL,
  asset VARCHAR(10) NOT NULL,
  hot_address VARCHAR(255) NOT NULL,
  cold_address VARCHAR(255),
  balance DECIMAL(36, 18) DEFAULT 0,
  last_sweep_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(chain, asset)
);

-- Feature Flags
CREATE TABLE feature_flags (
  key VARCHAR(100) PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_users_kyc_status ON users(kyc_status);
CREATE INDEX idx_deposit_addresses_user_id ON deposit_addresses(user_id);
CREATE INDEX idx_deposit_addresses_address ON deposit_addresses(address);
CREATE INDEX idx_onchain_deposits_user_id ON onchain_deposits(user_id);
CREATE INDEX idx_onchain_deposits_tx_hash ON onchain_deposits(tx_hash);
CREATE INDEX idx_onchain_deposits_status ON onchain_deposits(status);
CREATE INDEX idx_quotes_user_id ON quotes(user_id);
CREATE INDEX idx_quotes_status ON quotes(status);
CREATE INDEX idx_payouts_user_id ON payouts(user_id);
CREATE INDEX idx_payouts_status ON payouts(status);
CREATE INDEX idx_limits_user_id ON limits(user_id);
CREATE INDEX idx_risk_events_user_id ON risk_events(user_id);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_actor ON audit_logs(actor_id);

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_kyc_verifications_updated_at BEFORE UPDATE ON kyc_verifications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_limits_updated_at BEFORE UPDATE ON limits
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_feature_flags_updated_at BEFORE UPDATE ON feature_flags
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

