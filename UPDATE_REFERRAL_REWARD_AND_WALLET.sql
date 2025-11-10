-- ============================================================================
-- UPDATE REFERRAL REWARD TO $0.70 AND CREATE FUNDING WALLET SYSTEM
-- ============================================================================
-- This script:
-- 1. Updates the default referral reward from $1.00 to $0.70
-- 2. Creates a referral_funding_wallet table to track the funding wallet
-- 3. Updates the credit_referral_reward function to check wallet balance
-- 4. Creates functions to manage the funding wallet

-- ============================================================================
-- 1. UPDATE DEFAULT REWARD AMOUNT IN REFERRALS TABLE
-- ============================================================================
ALTER TABLE referrals 
ALTER COLUMN reward_amount_usd SET DEFAULT 0.70;

-- ============================================================================
-- 2. CREATE REFERRAL FUNDING WALLET TABLE
-- ============================================================================
-- This table stores the wallet address that funds referral rewards
CREATE TABLE IF NOT EXISTS referral_funding_wallet (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wallet_address TEXT NOT NULL,
  network VARCHAR(20) NOT NULL DEFAULT 'solana' CHECK (network IN ('solana', 'base', 'ethereum')),
  asset VARCHAR(10) NOT NULL DEFAULT 'USDC' CHECK (asset IN ('USDC', 'USDT', 'SOL')),
  initial_balance_usd DECIMAL(10, 2) NOT NULL DEFAULT 50.00,
  current_balance_usd DECIMAL(10, 2) NOT NULL DEFAULT 50.00,
  total_rewards_paid_usd DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  total_referrals_credited INT NOT NULL DEFAULT 0,
  low_balance_threshold_usd DECIMAL(10, 2) NOT NULL DEFAULT 10.00,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_funded_at TIMESTAMPTZ,
  
  -- Only one active funding wallet at a time
  CONSTRAINT only_one_active_wallet UNIQUE (is_active) WHERE is_active = TRUE
);

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_referral_funding_wallet_active ON referral_funding_wallet(is_active) WHERE is_active = TRUE;

COMMENT ON TABLE referral_funding_wallet IS 'Tracks the wallet used to fund referral rewards';
COMMENT ON COLUMN referral_funding_wallet.current_balance_usd IS 'Current available balance for referral rewards';
COMMENT ON COLUMN referral_funding_wallet.low_balance_threshold_usd IS 'Alert threshold for low balance';

-- ============================================================================
-- 3. CREATE FUNCTION TO GET ACTIVE FUNDING WALLET
-- ============================================================================
CREATE OR REPLACE FUNCTION get_active_funding_wallet()
RETURNS TABLE (
  id UUID,
  wallet_address TEXT,
  current_balance_usd DECIMAL(10, 2),
  low_balance_threshold_usd DECIMAL(10, 2)
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    rfw.id,
    rfw.wallet_address,
    rfw.current_balance_usd,
    rfw.low_balance_threshold_usd
  FROM referral_funding_wallet rfw
  WHERE rfw.is_active = TRUE
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 4. CREATE FUNCTION TO DEDUCT FROM FUNDING WALLET
-- ============================================================================
CREATE OR REPLACE FUNCTION deduct_from_funding_wallet(
  p_amount_usd DECIMAL(10, 2)
)
RETURNS BOOLEAN AS $$
DECLARE
  v_wallet_id UUID;
  v_current_balance DECIMAL(10, 2);
BEGIN
  -- Get active funding wallet
  SELECT id, current_balance_usd
  INTO v_wallet_id, v_current_balance
  FROM referral_funding_wallet
  WHERE is_active = TRUE
  LIMIT 1;
  
  -- Check if wallet exists
  IF v_wallet_id IS NULL THEN
    RAISE EXCEPTION 'No active referral funding wallet found';
  END IF;
  
  -- Check if sufficient balance
  IF v_current_balance < p_amount_usd THEN
    RAISE EXCEPTION 'Insufficient balance in referral funding wallet. Available: $%, Required: $%', v_current_balance, p_amount_usd;
  END IF;
  
  -- Deduct amount
  UPDATE referral_funding_wallet
  SET 
    current_balance_usd = current_balance_usd - p_amount_usd,
    total_rewards_paid_usd = total_rewards_paid_usd + p_amount_usd,
    total_referrals_credited = total_referrals_credited + 1,
    updated_at = NOW()
  WHERE id = v_wallet_id;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 5. CREATE FUNCTION TO ADD FUNDS TO WALLET
-- ============================================================================
CREATE OR REPLACE FUNCTION add_funds_to_wallet(
  p_amount_usd DECIMAL(10, 2)
)
RETURNS BOOLEAN AS $$
DECLARE
  v_wallet_id UUID;
BEGIN
  -- Get active funding wallet
  SELECT id INTO v_wallet_id
  FROM referral_funding_wallet
  WHERE is_active = TRUE
  LIMIT 1;
  
  -- Check if wallet exists
  IF v_wallet_id IS NULL THEN
    RAISE EXCEPTION 'No active referral funding wallet found';
  END IF;
  
  -- Add funds
  UPDATE referral_funding_wallet
  SET 
    current_balance_usd = current_balance_usd + p_amount_usd,
    updated_at = NOW(),
    last_funded_at = NOW()
  WHERE id = v_wallet_id;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 6. UPDATE CREDIT_REFERRAL_REWARD FUNCTION TO USE FUNDING WALLET
-- ============================================================================
CREATE OR REPLACE FUNCTION credit_referral_reward(
  p_referral_id UUID,
  p_reward_amount_usd DECIMAL(10, 2) DEFAULT 0.70
)
RETURNS UUID AS $$
DECLARE
  v_referrer_id UUID;
  v_referred_user_id UUID;
  v_reward_already_credited BOOLEAN;
  v_transaction_id UUID;
  v_reward_amount_ngn BIGINT;
  v_exchange_rate DECIMAL(10, 2) := 1650.00;
  v_funding_wallet_balance DECIMAL(10, 2);
BEGIN
  -- Get referral details
  SELECT referrer_id, referred_user_id, reward_credited
  INTO v_referrer_id, v_referred_user_id, v_reward_already_credited
  FROM referrals
  WHERE id = p_referral_id;
  
  -- Check if reward already credited
  IF v_reward_already_credited THEN
    RAISE EXCEPTION 'Referral reward already credited for referral_id: %', p_referral_id;
  END IF;
  
  -- Check funding wallet balance
  SELECT current_balance_usd INTO v_funding_wallet_balance
  FROM referral_funding_wallet
  WHERE is_active = TRUE
  LIMIT 1;
  
  IF v_funding_wallet_balance IS NULL THEN
    RAISE EXCEPTION 'No active referral funding wallet found';
  END IF;
  
  IF v_funding_wallet_balance < p_reward_amount_usd THEN
    RAISE EXCEPTION 'Insufficient balance in referral funding wallet. Available: $%, Required: $%', v_funding_wallet_balance, p_reward_amount_usd;
  END IF;
  
  -- Deduct from funding wallet
  PERFORM deduct_from_funding_wallet(p_reward_amount_usd);
  
  -- Convert USD to NGN (in kobo)
  v_reward_amount_ngn := (p_reward_amount_usd * v_exchange_rate * 100)::BIGINT;
  
  -- Credit the referrer's NGN wallet
  v_transaction_id := credit_naira_wallet(
    v_referrer_id,
    v_reward_amount_ngn,
    'referral_bonus',
    format('Referral bonus for referring user %s ($%.2f)', v_referred_user_id, p_reward_amount_usd),
    format('REFERRAL_%s', p_referral_id),
    NULL
  );
  
  -- Update referral record
  UPDATE referrals
  SET 
    reward_credited = TRUE,
    reward_credited_at = NOW(),
    reward_transaction_id = v_transaction_id,
    status = 'completed',
    completed_at = NOW()
  WHERE id = p_referral_id;
  
  RETURN v_transaction_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 7. CREATE FUNCTION TO CHECK FUNDING WALLET BALANCE
-- ============================================================================
CREATE OR REPLACE FUNCTION check_funding_wallet_balance()
RETURNS TABLE (
  wallet_address TEXT,
  current_balance_usd DECIMAL(10, 2),
  total_rewards_paid_usd DECIMAL(10, 2),
  total_referrals_credited INT,
  low_balance_alert BOOLEAN,
  estimated_referrals_remaining INT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    rfw.wallet_address,
    rfw.current_balance_usd,
    rfw.total_rewards_paid_usd,
    rfw.total_referrals_credited,
    (rfw.current_balance_usd < rfw.low_balance_threshold_usd) AS low_balance_alert,
    FLOOR(rfw.current_balance_usd / 0.70)::INT AS estimated_referrals_remaining
  FROM referral_funding_wallet rfw
  WHERE rfw.is_active = TRUE
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 8. INSERT INITIAL FUNDING WALLET (PLACEHOLDER - UPDATE WITH REAL ADDRESS)
-- ============================================================================
-- NOTE: Replace 'YOUR_SOLANA_WALLET_ADDRESS_HERE' with your actual Solana wallet address
-- This wallet should be funded with $50 USDC on Solana network

INSERT INTO referral_funding_wallet (
  wallet_address,
  network,
  asset,
  initial_balance_usd,
  current_balance_usd,
  low_balance_threshold_usd,
  is_active
) VALUES (
  'YOUR_SOLANA_WALLET_ADDRESS_HERE', -- REPLACE THIS WITH YOUR ACTUAL WALLET ADDRESS
  'solana',
  'USDC',
  50.00,
  50.00,
  10.00,
  TRUE
)
ON CONFLICT (is_active) WHERE is_active = TRUE DO NOTHING;

-- ============================================================================
-- 9. GRANT PERMISSIONS (if using RLS)
-- ============================================================================
-- Enable RLS on referral_funding_wallet
ALTER TABLE referral_funding_wallet ENABLE ROW LEVEL SECURITY;

-- Only admins can view funding wallet (adjust based on your admin role setup)
CREATE POLICY "Only admins can view funding wallet"
  ON referral_funding_wallet
  FOR SELECT
  USING (false); -- No one can view by default, use service role for admin access

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================
-- Run these to verify the setup:

-- Check funding wallet status
-- SELECT * FROM check_funding_wallet_balance();

-- Check if default reward amount updated
-- SELECT column_default FROM information_schema.columns 
-- WHERE table_name = 'referrals' AND column_name = 'reward_amount_usd';

-- Test deducting from wallet (COMMENT OUT AFTER TESTING)
-- SELECT deduct_from_funding_wallet(0.70);

-- Test adding funds (COMMENT OUT AFTER TESTING)
-- SELECT add_funds_to_wallet(10.00);

