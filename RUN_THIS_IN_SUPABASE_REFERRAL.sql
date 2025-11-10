-- ============================================================================
-- SOLPAY REFERRAL SYSTEM - RUN THIS IN SUPABASE SQL EDITOR
-- ============================================================================
-- This script sets up the complete referral system for SolPay
-- Users earn $1 USD (credited as NGN) when their referrals complete KYC
-- ============================================================================

-- 1. Create referral_codes table
CREATE TABLE IF NOT EXISTS referral_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  code VARCHAR(8) NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT referral_codes_code_format CHECK (code ~ '^[A-Z0-9]{6,8}$')
);

-- 2. Create referrals table
CREATE TABLE IF NOT EXISTS referrals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  referrer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  referred_user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  referral_code VARCHAR(8) NOT NULL,
  
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),
  
  reward_amount_usd DECIMAL(10, 2) DEFAULT 1.00,
  reward_credited BOOLEAN DEFAULT FALSE,
  reward_credited_at TIMESTAMPTZ,
  reward_transaction_id UUID REFERENCES wallet_transactions(id),
  
  signup_ip_address INET,
  signup_user_agent TEXT,
  signup_device_fingerprint TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  
  CONSTRAINT referrals_no_self_referral CHECK (referrer_id != referred_user_id)
);

-- 3. Create indexes
CREATE INDEX IF NOT EXISTS idx_referral_codes_code ON referral_codes(code);
CREATE INDEX IF NOT EXISTS idx_referral_codes_user_id ON referral_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referrer_id ON referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referred_user_id ON referrals(referred_user_id);
CREATE INDEX IF NOT EXISTS idx_referrals_status ON referrals(status);
CREATE INDEX IF NOT EXISTS idx_referrals_created_at ON referrals(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_referrals_ip_address ON referrals(signup_ip_address) WHERE signup_ip_address IS NOT NULL;

-- 4. Update wallet_transactions source constraint to include 'referral_bonus'
ALTER TABLE wallet_transactions DROP CONSTRAINT IF EXISTS wallet_transactions_source_check;
ALTER TABLE wallet_transactions ADD CONSTRAINT wallet_transactions_source_check 
CHECK (source IN ('bread_offramp', 'withdrawal', 'platform_fee', 'refund', 'manual', 'bonus', 'referral_bonus'));

-- 5. Function to generate unique referral codes
CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS VARCHAR(8) AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result VARCHAR(8);
  attempts INT := 0;
  max_attempts INT := 100;
BEGIN
  LOOP
    result := '';
    FOR i IN 1..6 LOOP
      result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    END LOOP;
    
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

-- 6. Function to auto-create referral code for new users
CREATE OR REPLACE FUNCTION create_referral_code_for_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO referral_codes (user_id, code)
  VALUES (NEW.id, generate_referral_code());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 7. Trigger to auto-generate referral codes
DROP TRIGGER IF EXISTS trigger_create_referral_code ON users;
CREATE TRIGGER trigger_create_referral_code
  AFTER INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION create_referral_code_for_user();

-- 8. Function to credit referral reward (uses existing credit_naira_wallet function)
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
  v_exchange_rate DECIMAL(10, 2) := 1650.00;
BEGIN
  SELECT referrer_id, referred_user_id, reward_credited
  INTO v_referrer_id, v_referred_user_id, v_reward_already_credited
  FROM referrals
  WHERE id = p_referral_id;
  
  IF v_reward_already_credited THEN
    RAISE EXCEPTION 'Referral reward already credited for referral_id: %', p_referral_id;
  END IF;
  
  v_reward_amount_ngn := (p_reward_amount_usd * v_exchange_rate * 100)::BIGINT;
  
  v_transaction_id := credit_naira_wallet(
    v_referrer_id,
    v_reward_amount_ngn,
    'referral_bonus',
    format('Referral bonus for referring user %s', v_referred_user_id),
    format('REFERRAL_%s', p_referral_id),
    NULL
  );
  
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

-- 9. Function to check and credit referral on KYC approval
CREATE OR REPLACE FUNCTION check_referral_on_kyc_approval()
RETURNS TRIGGER AS $$
DECLARE
  v_referral_id UUID;
BEGIN
  IF NEW.kyc_status = 'approved' AND NEW.kyc_tier >= 1 AND 
     (OLD.kyc_status != 'approved' OR OLD.kyc_tier < 1) THEN
    
    SELECT id INTO v_referral_id
    FROM referrals
    WHERE referred_user_id = NEW.id
    AND status = 'pending'
    AND reward_credited = FALSE;
    
    IF v_referral_id IS NOT NULL THEN
      PERFORM credit_referral_reward(v_referral_id);
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 10. Trigger to auto-credit referral on KYC approval
DROP TRIGGER IF EXISTS trigger_credit_referral_on_kyc ON users;
CREATE TRIGGER trigger_credit_referral_on_kyc
  AFTER UPDATE ON users
  FOR EACH ROW
  WHEN (NEW.kyc_status = 'approved' AND NEW.kyc_tier >= 1)
  EXECUTE FUNCTION check_referral_on_kyc_approval();

-- 11. Enable Row Level Security
ALTER TABLE referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;

-- 12. Create RLS Policies
CREATE POLICY "Users can view their own referral code" ON referral_codes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can view referrals they made" ON referrals FOR SELECT USING (auth.uid() = referrer_id);
CREATE POLICY "Users can view referrals they received" ON referrals FOR SELECT USING (auth.uid() = referred_user_id);

-- 13. Generate referral codes for existing users (backfill)
INSERT INTO referral_codes (user_id, code)
SELECT id, generate_referral_code()
FROM users
WHERE id NOT IN (SELECT user_id FROM referral_codes)
ON CONFLICT (user_id) DO NOTHING;

-- ============================================================================
-- DONE! Referral system is now set up.
-- ============================================================================
-- Next steps:
-- 1. Create backend API endpoints (/api/referrals/*)
-- 2. Update signup flow to accept referral codes
-- 3. Create UI components for referral dashboard
-- ============================================================================

