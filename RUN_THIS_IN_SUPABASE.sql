-- ============================================================================
-- NAIRA WALLET MIGRATION - RUN THIS IN SUPABASE SQL EDITOR
-- ============================================================================
-- Copy this entire file and paste it into Supabase SQL Editor, then click Run
-- ============================================================================

-- 1. Add naira_balance column to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS naira_balance BIGINT NOT NULL DEFAULT 0 CHECK (naira_balance >= 0);

COMMENT ON COLUMN users.naira_balance IS 'User NGN balance in kobo (₦ * 100)';

-- 2. Create wallet_transactions table
CREATE TABLE IF NOT EXISTS wallet_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('credit', 'debit', 'fee', 'refund')),
  source TEXT NOT NULL CHECK (source IN ('bread_offramp', 'withdrawal', 'platform_fee', 'refund', 'manual', 'bonus')),
  amount BIGINT NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL DEFAULT 'NGN' CHECK (currency = 'NGN'),
  balance_after BIGINT NOT NULL CHECK (balance_after >= 0),
  description TEXT,
  reference TEXT,
  payout_id UUID REFERENCES payouts(id),
  quote_id UUID REFERENCES quotes(id),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Create withdrawals table
CREATE TABLE IF NOT EXISTS withdrawals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount BIGINT NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL DEFAULT 'NGN',
  bank_account_id UUID NOT NULL REFERENCES bank_accounts(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'refunded')),
  provider TEXT NOT NULL DEFAULT 'bread',
  provider_reference TEXT,
  provider_response JSONB,
  wallet_transaction_id UUID REFERENCES wallet_transactions(id),
  payout_id UUID REFERENCES payouts(id),
  error_code TEXT,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processing_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  refunded_at TIMESTAMPTZ
);

-- 4. Create platform_fees table
CREATE TABLE IF NOT EXISTS platform_fees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount BIGINT NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL DEFAULT 'NGN',
  fee_type TEXT NOT NULL CHECK (fee_type IN ('offramp', 'withdrawal', 'other')),
  wallet_transaction_id UUID REFERENCES wallet_transactions(id),
  quote_id UUID REFERENCES quotes(id),
  description TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Create indexes
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_user_id ON wallet_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_type ON wallet_transactions(type);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_source ON wallet_transactions(source);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_created_at ON wallet_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_reference ON wallet_transactions(reference) WHERE reference IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_wallet_transactions_unique_reference ON wallet_transactions(reference) WHERE reference IS NOT NULL AND type = 'credit';

CREATE INDEX IF NOT EXISTS idx_withdrawals_user_id ON withdrawals(user_id);
CREATE INDEX IF NOT EXISTS idx_withdrawals_status ON withdrawals(status);
CREATE INDEX IF NOT EXISTS idx_withdrawals_created_at ON withdrawals(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_withdrawals_provider_reference ON withdrawals(provider_reference) WHERE provider_reference IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_platform_fees_user_id ON platform_fees(user_id);
CREATE INDEX IF NOT EXISTS idx_platform_fees_fee_type ON platform_fees(fee_type);
CREATE INDEX IF NOT EXISTS idx_platform_fees_created_at ON platform_fees(created_at DESC);

-- 6. Enable Row Level Security
ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE withdrawals ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_fees ENABLE ROW LEVEL SECURITY;

-- 7. Create RLS Policies
CREATE POLICY "Users can view their own wallet transactions" ON wallet_transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can view their own withdrawals" ON withdrawals FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own withdrawals" ON withdrawals FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view their own fees" ON platform_fees FOR SELECT USING (auth.uid() = user_id);

-- 8. Create helper functions
CREATE OR REPLACE FUNCTION get_naira_balance(p_user_id UUID)
RETURNS DECIMAL(20, 2) AS $$
BEGIN
  RETURN (SELECT naira_balance / 100.0 FROM users WHERE id = p_user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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
  UPDATE users SET naira_balance = naira_balance + p_amount_kobo WHERE id = p_user_id RETURNING naira_balance INTO v_new_balance;
  INSERT INTO wallet_transactions (user_id, type, source, amount, balance_after, description, reference, quote_id)
  VALUES (p_user_id, 'credit', p_source, p_amount_kobo, v_new_balance, p_description, p_reference, p_quote_id)
  RETURNING id INTO v_transaction_id;
  RETURN v_transaction_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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
  SELECT naira_balance INTO v_current_balance FROM users WHERE id = p_user_id FOR UPDATE;
  IF v_current_balance < p_amount_kobo THEN
    RAISE EXCEPTION 'Insufficient balance. Available: % kobo, Required: % kobo', v_current_balance, p_amount_kobo;
  END IF;
  UPDATE users SET naira_balance = naira_balance - p_amount_kobo WHERE id = p_user_id RETURNING naira_balance INTO v_new_balance;
  INSERT INTO wallet_transactions (user_id, type, source, amount, balance_after, description, reference)
  VALUES (p_user_id, 'debit', p_source, p_amount_kobo, v_new_balance, p_description, p_reference)
  RETURNING id INTO v_transaction_id;
  RETURN v_transaction_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- DONE! Your database now supports NGN wallets! 🎉
-- ============================================================================

