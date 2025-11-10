-- ============================================================================
-- REFERRAL SYSTEM MIGRATION
-- ============================================================================
-- This migration adds a complete referral system to SolPay
-- Users can refer friends and earn $1 USD (as USDC) per successful referral

-- ============================================================================
-- 1. CREATE REFERRAL_CODES TABLE
-- ============================================================================
-- Stores unique referral codes for each user
CREATE TABLE IF NOT EXISTS referral_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  code VARCHAR(8) NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Indexes
  CONSTRAINT referral_codes_code_format CHECK (code ~ '^[A-Z0-9]{6,8}$')
);

-- Index for fast code lookups
CREATE INDEX IF NOT EXISTS idx_referral_codes_code ON referral_codes(code);
CREATE INDEX IF NOT EXISTS idx_referral_codes_user_id ON referral_codes(user_id);

-- ============================================================================
-- 2. CREATE REFERRALS TABLE
-- ============================================================================
-- Tracks referral relationships and reward status
CREATE TABLE IF NOT EXISTS referrals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  referrer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  referred_user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  referral_code VARCHAR(8) NOT NULL,
  
  -- Status tracking
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),
  
  -- Reward tracking
  reward_amount_usd DECIMAL(10, 2) DEFAULT 1.00,
  reward_credited BOOLEAN DEFAULT FALSE,
  reward_credited_at TIMESTAMPTZ,
  reward_transaction_id UUID REFERENCES wallet_transactions(id),
  
  -- Fraud prevention
  signup_ip_address INET,
  signup_user_agent TEXT,
  signup_device_fingerprint TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  
  -- Constraints
  CONSTRAINT referrals_no_self_referral CHECK (referrer_id != referred_user_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_referrals_referrer_id ON referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referred_user_id ON referrals(referred_user_id);
CREATE INDEX IF NOT EXISTS idx_referrals_status ON referrals(status);
CREATE INDEX IF NOT EXISTS idx_referrals_created_at ON referrals(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_referrals_ip_address ON referrals(signup_ip_address) WHERE signup_ip_address IS NOT NULL;

-- ============================================================================
-- 3. UPDATE WALLET_TRANSACTIONS SOURCE ENUM
-- ============================================================================
-- Add 'referral_bonus' to the allowed sources for wallet transactions
-- Note: PostgreSQL doesn't support ALTER TYPE ADD VALUE in a transaction,
-- so we need to check if it exists first

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'referral_bonus' 
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'wallet_transaction_source')
  ) THEN
    -- If the enum type doesn't exist, we need to handle it differently
    -- Check if wallet_transactions table uses TEXT with CHECK constraint instead
    DECLARE
      constraint_def TEXT;
    BEGIN
      SELECT pg_get_constraintdef(oid) INTO constraint_def
      FROM pg_constraint
      WHERE conname LIKE '%wallet_transactions%source%'
      AND contype = 'c'
      LIMIT 1;
      
      IF constraint_def IS NOT NULL AND constraint_def LIKE '%bread_offramp%' THEN
        -- Drop the old constraint
        ALTER TABLE wallet_transactions DROP CONSTRAINT IF EXISTS wallet_transactions_source_check;
        
        -- Add new constraint with referral_bonus included
        ALTER TABLE wallet_transactions ADD CONSTRAINT wallet_transactions_source_check 
        CHECK (source IN ('bread_offramp', 'withdrawal', 'platform_fee', 'refund', 'manual', 'bonus', 'referral_bonus'));
      END IF;
    END;
  END IF;
END$$;

-- ============================================================================
-- 4. CREATE FUNCTION TO GENERATE UNIQUE REFERRAL CODE
-- ============================================================================
CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS VARCHAR(8) AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- Exclude confusing chars: 0, O, 1, I
  result VARCHAR(8);
  attempts INT := 0;
  max_attempts INT := 100;
BEGIN
  LOOP
    -- Generate 6-character code
    result := '';
    FOR i IN 1..6 LOOP
      result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    END LOOP;
    
    -- Check if code already exists
    IF NOT EXISTS (SELECT 1 FROM referral_codes WHERE code = result) THEN
      RETURN result;
    END IF;
    
    attempts := attempts + 1;
    IF attempts >= max_attempts THEN
      RAISE EXCEPTION 'Failed to generate unique referral code after % attempts', max_attempts;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 5. CREATE FUNCTION TO AUTO-GENERATE REFERRAL CODE FOR NEW USERS
-- ============================================================================
CREATE OR REPLACE FUNCTION create_referral_code_for_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Generate and insert referral code for new user
  INSERT INTO referral_codes (user_id, code)
  VALUES (NEW.id, generate_referral_code());
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 6. CREATE TRIGGER TO AUTO-GENERATE REFERRAL CODES
-- ============================================================================
DROP TRIGGER IF EXISTS trigger_create_referral_code ON users;
CREATE TRIGGER trigger_create_referral_code
  AFTER INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION create_referral_code_for_user();

-- ============================================================================
-- 7. CREATE FUNCTION TO CREDIT REFERRAL REWARD
-- ============================================================================
CREATE OR REPLACE FUNCTION credit_referral_reward(
  p_referral_id UUID,
  p_reward_amount_usd DECIMAL(10, 2) DEFAULT 1.00
)
RETURNS UUID AS $$
DECLARE
  v_referrer_id UUID;
  v_referred_user_id UUID;
  v_reward_already_credited BOOLEAN;
  v_transaction_id UUID;
  v_reward_amount_ngn BIGINT;
  v_exchange_rate DECIMAL(10, 2) := 1650.00; -- Default NGN/USD rate, should be fetched from pricing service
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
  
  -- Convert USD to NGN (in kobo)
  v_reward_amount_ngn := (p_reward_amount_usd * v_exchange_rate * 100)::BIGINT;
  
  -- Credit the referrer's NGN wallet
  SELECT id INTO v_transaction_id
  FROM credit_naira_wallet(
    v_referrer_id,
    v_reward_amount_ngn,
    'referral_bonus',
    format('Referral bonus for referring user %s', v_referred_user_id),
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
-- 8. CREATE FUNCTION TO CHECK AND CREDIT REFERRAL ON KYC APPROVAL
-- ============================================================================
CREATE OR REPLACE FUNCTION check_referral_on_kyc_approval()
RETURNS TRIGGER AS $$
DECLARE
  v_referral_id UUID;
BEGIN
  -- Check if KYC status changed to 'approved' and tier is at least 1
  IF NEW.kyc_status = 'approved' AND NEW.kyc_tier >= 1 AND 
     (OLD.kyc_status != 'approved' OR OLD.kyc_tier < 1) THEN
    
    -- Check if this user was referred
    SELECT id INTO v_referral_id
    FROM referrals
    WHERE referred_user_id = NEW.id
    AND status = 'pending'
    AND reward_credited = FALSE;
    
    -- If referral exists, credit the reward
    IF v_referral_id IS NOT NULL THEN
      PERFORM credit_referral_reward(v_referral_id);
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 9. CREATE TRIGGER TO AUTO-CREDIT REFERRAL ON KYC APPROVAL
-- ============================================================================
DROP TRIGGER IF EXISTS trigger_credit_referral_on_kyc ON users;
CREATE TRIGGER trigger_credit_referral_on_kyc
  AFTER UPDATE ON users
  FOR EACH ROW
  WHEN (NEW.kyc_status = 'approved' AND NEW.kyc_tier >= 1)
  EXECUTE FUNCTION check_referral_on_kyc_approval();

-- ============================================================================
-- 10. ADD COMMENTS FOR DOCUMENTATION
-- ============================================================================
COMMENT ON TABLE referral_codes IS 'Stores unique referral codes for each user';
COMMENT ON TABLE referrals IS 'Tracks referral relationships and reward status';
COMMENT ON COLUMN referrals.status IS 'pending: waiting for KYC, completed: reward credited, cancelled: referral invalid';
COMMENT ON COLUMN referrals.reward_amount_usd IS 'Reward amount in USD (default $1.00)';
COMMENT ON FUNCTION generate_referral_code() IS 'Generates a unique 6-character alphanumeric referral code';
COMMENT ON FUNCTION credit_referral_reward(UUID, DECIMAL) IS 'Credits referral reward to referrer NGN wallet';
COMMENT ON FUNCTION check_referral_on_kyc_approval() IS 'Automatically credits referral reward when referred user completes KYC';

