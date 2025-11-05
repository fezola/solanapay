-- ============================================================================
-- CRYPTO OFF-RAMP DATABASE SCHEMA
-- ============================================================================
-- This schema handles user authentication, transactions, KYC, and bank accounts
-- for the crypto off-ramp mobile application
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- USERS TABLE
-- ============================================================================
-- Extends Supabase auth.users with additional profile information
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  phone_number TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- KYC Information
  kyc_tier INTEGER DEFAULT 0 CHECK (kyc_tier >= 0 AND kyc_tier <= 2),
  kyc_status TEXT DEFAULT 'not_started' CHECK (kyc_status IN ('not_started', 'pending', 'approved', 'rejected')),
  bvn TEXT,
  bvn_verified BOOLEAN DEFAULT FALSE,
  document_type TEXT CHECK (document_type IN ('nin', 'passport', 'drivers_license')),
  document_number TEXT,
  document_verified BOOLEAN DEFAULT FALSE,
  selfie_verified BOOLEAN DEFAULT FALSE,
  address_verified BOOLEAN DEFAULT FALSE,
  kyc_submitted_at TIMESTAMPTZ,
  kyc_approved_at TIMESTAMPTZ,
  
  -- Metadata
  last_login_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE
);

-- ============================================================================
-- DEPOSIT ADDRESSES TABLE
-- ============================================================================
-- Stores unique deposit addresses for each user and asset
CREATE TABLE IF NOT EXISTS public.deposit_addresses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  
  -- Asset information
  asset_symbol TEXT NOT NULL CHECK (asset_symbol IN ('USDC', 'USDT', 'SOL', 'ETH')),
  network TEXT NOT NULL CHECK (network IN ('solana', 'base', 'ethereum')),
  
  -- Address details
  address TEXT NOT NULL,
  private_key_encrypted TEXT NOT NULL, -- Encrypted with backend encryption key
  derivation_path TEXT NOT NULL,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_used_at TIMESTAMPTZ,
  
  -- Ensure one address per user per asset per network
  UNIQUE(user_id, asset_symbol, network)
);

-- ============================================================================
-- BANK ACCOUNTS TABLE
-- ============================================================================
-- Stores user bank accounts for NGN payouts
CREATE TABLE IF NOT EXISTS public.bank_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  
  -- Bank details
  bank_name TEXT NOT NULL,
  bank_code TEXT NOT NULL,
  account_number TEXT NOT NULL,
  account_name TEXT NOT NULL,
  
  -- Verification
  is_verified BOOLEAN DEFAULT FALSE,
  verified_at TIMESTAMPTZ,
  
  -- Metadata
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure unique account per user
  UNIQUE(user_id, account_number, bank_code)
);

-- ============================================================================
-- TRANSACTIONS TABLE
-- ============================================================================
-- Records all crypto deposits and off-ramp transactions
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  
  -- Transaction type
  type TEXT NOT NULL CHECK (type IN ('deposit', 'offramp', 'withdrawal')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  
  -- Crypto details
  crypto_asset TEXT NOT NULL,
  crypto_network TEXT NOT NULL,
  crypto_amount DECIMAL(20, 8) NOT NULL,
  crypto_address TEXT, -- Deposit address or withdrawal destination
  
  -- Blockchain details
  blockchain_tx_hash TEXT,
  blockchain_confirmations INTEGER DEFAULT 0,
  required_confirmations INTEGER DEFAULT 1,
  
  -- Fiat details (for off-ramp)
  fiat_currency TEXT DEFAULT 'NGN',
  fiat_amount DECIMAL(20, 2),
  exchange_rate DECIMAL(20, 2), -- Crypto to fiat rate at time of transaction
  
  -- Fees
  fee_amount DECIMAL(20, 2) DEFAULT 0,
  fee_currency TEXT DEFAULT 'NGN',
  spread_bps INTEGER DEFAULT 50, -- Spread in basis points
  
  -- Payout details (for off-ramp)
  bank_account_id UUID REFERENCES public.bank_accounts(id),
  payout_reference TEXT, -- Paystack/Flutterwave reference
  payout_status TEXT CHECK (payout_status IN ('pending', 'processing', 'paid', 'failed')),
  payout_completed_at TIMESTAMPTZ,
  
  -- Quote details
  quote_id UUID,
  quote_locked_until TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  error_message TEXT
);

-- ============================================================================
-- TRANSACTION LIMITS TABLE
-- ============================================================================
-- Tracks transaction limits and usage per user
CREATE TABLE IF NOT EXISTS public.transaction_limits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  
  -- Limit period
  period TEXT NOT NULL CHECK (period IN ('daily', 'weekly', 'monthly')),
  
  -- Limits (in NGN)
  limit_amount DECIMAL(20, 2) NOT NULL,
  used_amount DECIMAL(20, 2) DEFAULT 0,
  
  -- Period tracking
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure one limit per user per period
  UNIQUE(user_id, period, period_start)
);

-- ============================================================================
-- QUOTES TABLE
-- ============================================================================
-- Stores price quotes for off-ramp transactions
CREATE TABLE IF NOT EXISTS public.quotes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  
  -- Quote details
  crypto_asset TEXT NOT NULL,
  crypto_network TEXT NOT NULL,
  crypto_amount DECIMAL(20, 8) NOT NULL,
  
  -- Pricing
  spot_price DECIMAL(20, 2) NOT NULL, -- USD price of crypto
  fx_rate DECIMAL(20, 4) NOT NULL, -- USD to NGN rate
  spread_bps INTEGER NOT NULL,
  flat_fee DECIMAL(20, 2) NOT NULL,
  variable_fee_bps INTEGER NOT NULL,
  
  -- Calculated amounts
  fiat_amount DECIMAL(20, 2) NOT NULL,
  total_fees DECIMAL(20, 2) NOT NULL,
  final_amount DECIMAL(20, 2) NOT NULL, -- Amount user receives
  
  -- Quote validity
  locked_until TIMESTAMPTZ NOT NULL,
  is_used BOOLEAN DEFAULT FALSE,
  used_at TIMESTAMPTZ,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- ============================================================================
-- AUDIT LOG TABLE
-- ============================================================================
-- Tracks all important actions for compliance
CREATE TABLE IF NOT EXISTS public.audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  
  -- Action details
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id UUID,
  
  -- Details
  old_values JSONB,
  new_values JSONB,
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Context
  ip_address INET,
  user_agent TEXT,
  
  -- Timestamp
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Users indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_kyc_status ON public.users(kyc_status);
CREATE INDEX IF NOT EXISTS idx_users_kyc_tier ON public.users(kyc_tier);

-- Deposit addresses indexes
CREATE INDEX IF NOT EXISTS idx_deposit_addresses_user_id ON public.deposit_addresses(user_id);
CREATE INDEX IF NOT EXISTS idx_deposit_addresses_address ON public.deposit_addresses(address);
CREATE INDEX IF NOT EXISTS idx_deposit_addresses_network ON public.deposit_addresses(network);

-- Bank accounts indexes
CREATE INDEX IF NOT EXISTS idx_bank_accounts_user_id ON public.bank_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_bank_accounts_account_number ON public.bank_accounts(account_number);

-- Transactions indexes
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON public.transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON public.transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON public.transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON public.transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_blockchain_tx_hash ON public.transactions(blockchain_tx_hash);
CREATE INDEX IF NOT EXISTS idx_transactions_payout_reference ON public.transactions(payout_reference);

-- Transaction limits indexes
CREATE INDEX IF NOT EXISTS idx_transaction_limits_user_id ON public.transaction_limits(user_id);
CREATE INDEX IF NOT EXISTS idx_transaction_limits_period ON public.transaction_limits(period, period_start, period_end);

-- Quotes indexes
CREATE INDEX IF NOT EXISTS idx_quotes_user_id ON public.quotes(user_id);
CREATE INDEX IF NOT EXISTS idx_quotes_locked_until ON public.quotes(locked_until);
CREATE INDEX IF NOT EXISTS idx_quotes_is_used ON public.quotes(is_used);

-- Audit log indexes
CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON public.audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON public.audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON public.audit_log(action);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bank_accounts_updated_at BEFORE UPDATE ON public.bank_accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transaction_limits_updated_at BEFORE UPDATE ON public.transaction_limits
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deposit_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transaction_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- Deposit addresses policies
CREATE POLICY "Users can view own deposit addresses" ON public.deposit_addresses
  FOR SELECT USING (auth.uid() = user_id);

-- Bank accounts policies
CREATE POLICY "Users can view own bank accounts" ON public.bank_accounts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own bank accounts" ON public.bank_accounts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own bank accounts" ON public.bank_accounts
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own bank accounts" ON public.bank_accounts
  FOR DELETE USING (auth.uid() = user_id);

-- Transactions policies
CREATE POLICY "Users can view own transactions" ON public.transactions
  FOR SELECT USING (auth.uid() = user_id);

-- Transaction limits policies
CREATE POLICY "Users can view own limits" ON public.transaction_limits
  FOR SELECT USING (auth.uid() = user_id);

-- Quotes policies
CREATE POLICY "Users can view own quotes" ON public.quotes
  FOR SELECT USING (auth.uid() = user_id);

-- Audit log policies (read-only for users)
CREATE POLICY "Users can view own audit logs" ON public.audit_log
  FOR SELECT USING (auth.uid() = user_id);

-- ============================================================================
-- INITIAL DATA
-- ============================================================================

-- This will be populated when users sign up
-- No initial data needed for production

-- ============================================================================
-- COMPLETED
-- ============================================================================
-- Database schema created successfully!
-- Next steps:
-- 1. Run this SQL in your Supabase SQL Editor
-- 2. Configure your backend .env with Supabase credentials
-- 3. Test authentication and transaction creation
-- ============================================================================

