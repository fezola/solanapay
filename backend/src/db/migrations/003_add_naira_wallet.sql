-- ============================================================================
-- MIGRATION: Add Naira Wallet Feature
-- ============================================================================
-- This migration adds the ability for users to hold NGN balances in-app
-- and withdraw to their bank accounts when they want.
--
-- Flow:
-- 1. User off-ramps USDC → NGN balance is credited
-- 2. User can hold NGN in-app
-- 3. User withdraws to bank when needed
-- ============================================================================

-- Add naira_balance to users table
-- Store in kobo (₦ * 100) to avoid floating point issues
-- Example: ₦1,453.47 → 145347 kobo
ALTER TABLE users
ADD COLUMN IF NOT EXISTS naira_balance BIGINT NOT NULL DEFAULT 0 CHECK (naira_balance >= 0);

-- Add comment
COMMENT ON COLUMN users.naira_balance IS 'User NGN balance in kobo (₦ * 100). Example: ₦1,453.47 = 145347 kobo';

-- ============================================================================
-- WALLET TRANSACTIONS TABLE
-- ============================================================================
-- Records all NGN wallet transactions (credits, debits, fees)
CREATE TABLE IF NOT EXISTS wallet_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Transaction type
  type TEXT NOT NULL CHECK (type IN ('credit', 'debit', 'fee', 'refund')),
  
  -- Source of transaction
  source TEXT NOT NULL CHECK (source IN (
    'bread_offramp',      -- Credit from USDC → NGN conversion
    'withdrawal',         -- Debit for bank withdrawal
    'platform_fee',       -- Platform fee deduction
    'refund',            -- Refund from failed withdrawal
    'manual',            -- Manual adjustment (admin)
    'bonus'              -- Promotional bonus
  )),
  
  -- Amount in kobo
  amount BIGINT NOT NULL CHECK (amount > 0),
  
  -- Currency (always NGN for now)
  currency TEXT NOT NULL DEFAULT 'NGN' CHECK (currency = 'NGN'),
  
  -- Balance after this transaction (for reconciliation)
  balance_after BIGINT NOT NULL CHECK (balance_after >= 0),
  
  -- Description
  description TEXT,
  
  -- Reference to external transaction
  reference TEXT, -- Bread reference, payout ID, etc.
  
  -- Related records
  payout_id UUID REFERENCES payouts(id),
  quote_id UUID REFERENCES quotes(id),
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  
  -- Timestamp
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for wallet_transactions
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_user_id ON wallet_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_type ON wallet_transactions(type);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_source ON wallet_transactions(source);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_created_at ON wallet_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_reference ON wallet_transactions(reference) WHERE reference IS NOT NULL;

-- Unique constraint on reference to prevent duplicate credits
CREATE UNIQUE INDEX IF NOT EXISTS idx_wallet_transactions_unique_reference 
ON wallet_transactions(reference) 
WHERE reference IS NOT NULL AND type = 'credit';

-- ============================================================================
-- WITHDRAWALS TABLE
-- ============================================================================
-- Tracks NGN withdrawals from wallet to bank account
CREATE TABLE IF NOT EXISTS withdrawals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Amount in kobo
  amount BIGINT NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL DEFAULT 'NGN',
  
  -- Bank account
  bank_account_id UUID NOT NULL REFERENCES bank_accounts(id),
  
  -- Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending',      -- Created, not yet sent to Bread
    'processing',   -- Sent to Bread, waiting for confirmation
    'completed',    -- Successfully sent to bank
    'failed',       -- Failed to send
    'refunded'      -- Failed and refunded to wallet
  )),
  
  -- Provider details (Bread Africa)
  provider TEXT NOT NULL DEFAULT 'bread',
  provider_reference TEXT, -- Bread payout reference
  provider_response JSONB,
  
  -- Related records
  wallet_transaction_id UUID REFERENCES wallet_transactions(id),
  payout_id UUID REFERENCES payouts(id),
  
  -- Error handling
  error_code TEXT,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processing_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  refunded_at TIMESTAMPTZ
);

-- Indexes for withdrawals
CREATE INDEX IF NOT EXISTS idx_withdrawals_user_id ON withdrawals(user_id);
CREATE INDEX IF NOT EXISTS idx_withdrawals_status ON withdrawals(status);
CREATE INDEX IF NOT EXISTS idx_withdrawals_created_at ON withdrawals(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_withdrawals_provider_reference ON withdrawals(provider_reference) WHERE provider_reference IS NOT NULL;

-- ============================================================================
-- PLATFORM FEES TABLE
-- ============================================================================
-- Tracks platform fees collected (for accounting)
CREATE TABLE IF NOT EXISTS platform_fees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Fee amount in kobo
  amount BIGINT NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL DEFAULT 'NGN',
  
  -- Fee type
  fee_type TEXT NOT NULL CHECK (fee_type IN ('offramp', 'withdrawal', 'other')),
  
  -- Related transaction
  wallet_transaction_id UUID REFERENCES wallet_transactions(id),
  quote_id UUID REFERENCES quotes(id),
  
  -- Metadata
  description TEXT,
  metadata JSONB DEFAULT '{}',
  
  -- Timestamp
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for platform_fees
CREATE INDEX IF NOT EXISTS idx_platform_fees_user_id ON platform_fees(user_id);
CREATE INDEX IF NOT EXISTS idx_platform_fees_fee_type ON platform_fees(fee_type);
CREATE INDEX IF NOT EXISTS idx_platform_fees_created_at ON platform_fees(created_at DESC);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on new tables
ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE withdrawals ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_fees ENABLE ROW LEVEL SECURITY;

-- Policies for wallet_transactions
CREATE POLICY "Users can view their own wallet transactions"
  ON wallet_transactions FOR SELECT
  USING (auth.uid() = user_id);

-- Policies for withdrawals
CREATE POLICY "Users can view their own withdrawals"
  ON withdrawals FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own withdrawals"
  ON withdrawals FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policies for platform_fees (read-only for users)
CREATE POLICY "Users can view their own fees"
  ON platform_fees FOR SELECT
  USING (auth.uid() = user_id);

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function to get user's NGN balance in Naira (not kobo)
CREATE OR REPLACE FUNCTION get_naira_balance(p_user_id UUID)
RETURNS DECIMAL(20, 2) AS $$
BEGIN
  RETURN (
    SELECT naira_balance / 100.0
    FROM users
    WHERE id = p_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to credit NGN wallet (atomic operation)
CREATE OR REPLACE FUNCTION credit_naira_wallet(
  p_user_id UUID,
  p_amount_kobo BIGINT,
  p_source TEXT,
  p_description TEXT,
  p_reference TEXT DEFAULT NULL,
  p_quote_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_new_balance BIGINT;
  v_transaction_id UUID;
BEGIN
  -- Update user balance
  UPDATE users
  SET naira_balance = naira_balance + p_amount_kobo
  WHERE id = p_user_id
  RETURNING naira_balance INTO v_new_balance;
  
  -- Create wallet transaction record
  INSERT INTO wallet_transactions (
    user_id, type, source, amount, balance_after,
    description, reference, quote_id
  ) VALUES (
    p_user_id, 'credit', p_source, p_amount_kobo, v_new_balance,
    p_description, p_reference, p_quote_id
  ) RETURNING id INTO v_transaction_id;
  
  RETURN v_transaction_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to debit NGN wallet (atomic operation)
CREATE OR REPLACE FUNCTION debit_naira_wallet(
  p_user_id UUID,
  p_amount_kobo BIGINT,
  p_source TEXT,
  p_description TEXT,
  p_reference TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_current_balance BIGINT;
  v_new_balance BIGINT;
  v_transaction_id UUID;
BEGIN
  -- Check balance
  SELECT naira_balance INTO v_current_balance
  FROM users
  WHERE id = p_user_id
  FOR UPDATE; -- Lock the row
  
  IF v_current_balance < p_amount_kobo THEN
    RAISE EXCEPTION 'Insufficient balance. Available: % kobo, Required: % kobo', 
      v_current_balance, p_amount_kobo;
  END IF;
  
  -- Update user balance
  UPDATE users
  SET naira_balance = naira_balance - p_amount_kobo
  WHERE id = p_user_id
  RETURNING naira_balance INTO v_new_balance;
  
  -- Create wallet transaction record
  INSERT INTO wallet_transactions (
    user_id, type, source, amount, balance_after,
    description, reference
  ) VALUES (
    p_user_id, 'debit', p_source, p_amount_kobo, v_new_balance,
    p_description, p_reference
  ) RETURNING id INTO v_transaction_id;
  
  RETURN v_transaction_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE wallet_transactions IS 'Records all NGN wallet transactions (credits, debits, fees)';
COMMENT ON TABLE withdrawals IS 'Tracks NGN withdrawals from wallet to bank account';
COMMENT ON TABLE platform_fees IS 'Tracks platform fees collected for accounting';

COMMENT ON FUNCTION credit_naira_wallet IS 'Atomically credit user NGN wallet and create transaction record';
COMMENT ON FUNCTION debit_naira_wallet IS 'Atomically debit user NGN wallet with balance check and create transaction record';
COMMENT ON FUNCTION get_naira_balance IS 'Get user NGN balance in Naira (converts from kobo)';

