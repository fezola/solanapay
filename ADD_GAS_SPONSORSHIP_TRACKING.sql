-- ============================================================================
-- GAS FEE SPONSORSHIP TRACKING
-- ============================================================================
-- This migration adds tracking for gas fees sponsored by the platform

-- ============================================================================
-- 1. CREATE GAS_FEES_SPONSORED TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS gas_fees_sponsored (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  transaction_signature TEXT NOT NULL UNIQUE,
  blockchain_network VARCHAR(20) NOT NULL DEFAULT 'solana' CHECK (blockchain_network IN ('solana', 'base', 'ethereum')),
  
  -- Fee details
  fee_amount_native BIGINT NOT NULL, -- Fee in lamports (Solana) or wei (Ethereum)
  fee_amount_usd DECIMAL(10, 6), -- Approximate USD value at time of transaction
  
  -- Transaction context
  transaction_type VARCHAR(50) NOT NULL CHECK (transaction_type IN ('offramp', 'deposit', 'withdrawal', 'transfer', 'other')),
  related_transaction_id UUID REFERENCES transactions(id),
  
  -- Sponsor wallet
  sponsor_wallet_address TEXT NOT NULL,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Metadata
  metadata JSONB
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_gas_fees_user_id ON gas_fees_sponsored(user_id);
CREATE INDEX IF NOT EXISTS idx_gas_fees_created_at ON gas_fees_sponsored(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_gas_fees_transaction_type ON gas_fees_sponsored(transaction_type);
CREATE INDEX IF NOT EXISTS idx_gas_fees_network ON gas_fees_sponsored(blockchain_network);

-- ============================================================================
-- 2. CREATE FUNCTION TO LOG GAS FEE
-- ============================================================================
CREATE OR REPLACE FUNCTION log_gas_fee_sponsored(
  p_user_id UUID,
  p_transaction_signature TEXT,
  p_blockchain_network VARCHAR(20),
  p_fee_amount_native BIGINT,
  p_fee_amount_usd DECIMAL(10, 6),
  p_transaction_type VARCHAR(50),
  p_sponsor_wallet_address TEXT,
  p_related_transaction_id UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_gas_fee_id UUID;
BEGIN
  INSERT INTO gas_fees_sponsored (
    user_id,
    transaction_signature,
    blockchain_network,
    fee_amount_native,
    fee_amount_usd,
    transaction_type,
    sponsor_wallet_address,
    related_transaction_id,
    metadata
  ) VALUES (
    p_user_id,
    p_transaction_signature,
    p_blockchain_network,
    p_fee_amount_native,
    p_fee_amount_usd,
    p_transaction_type,
    p_sponsor_wallet_address,
    p_related_transaction_id,
    p_metadata
  )
  RETURNING id INTO v_gas_fee_id;
  
  RETURN v_gas_fee_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 3. CREATE FUNCTION TO GET GAS FEE STATS
-- ============================================================================
CREATE OR REPLACE FUNCTION get_gas_fee_stats(
  p_start_date TIMESTAMPTZ DEFAULT NOW() - INTERVAL '30 days',
  p_end_date TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TABLE (
  total_fees_sponsored_count BIGINT,
  total_fees_usd DECIMAL(10, 2),
  total_fees_sol DECIMAL(10, 6),
  avg_fee_usd DECIMAL(10, 6),
  fees_by_type JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::BIGINT AS total_fees_sponsored_count,
    COALESCE(SUM(fee_amount_usd), 0)::DECIMAL(10, 2) AS total_fees_usd,
    COALESCE(SUM(fee_amount_native::DECIMAL / 1000000000), 0)::DECIMAL(10, 6) AS total_fees_sol,
    COALESCE(AVG(fee_amount_usd), 0)::DECIMAL(10, 6) AS avg_fee_usd,
    jsonb_object_agg(
      transaction_type,
      jsonb_build_object(
        'count', type_count,
        'total_usd', type_total_usd
      )
    ) AS fees_by_type
  FROM (
    SELECT 
      transaction_type,
      COUNT(*) AS type_count,
      SUM(fee_amount_usd) AS type_total_usd
    FROM gas_fees_sponsored
    WHERE created_at BETWEEN p_start_date AND p_end_date
    GROUP BY transaction_type
  ) type_stats;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 4. CREATE FUNCTION TO GET USER GAS FEE HISTORY
-- ============================================================================
CREATE OR REPLACE FUNCTION get_user_gas_fees(
  p_user_id UUID,
  p_limit INT DEFAULT 50
)
RETURNS TABLE (
  id UUID,
  transaction_signature TEXT,
  blockchain_network VARCHAR(20),
  fee_amount_usd DECIMAL(10, 6),
  transaction_type VARCHAR(50),
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    gfs.id,
    gfs.transaction_signature,
    gfs.blockchain_network,
    gfs.fee_amount_usd,
    gfs.transaction_type,
    gfs.created_at
  FROM gas_fees_sponsored gfs
  WHERE gfs.user_id = p_user_id
  ORDER BY gfs.created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 5. ENABLE RLS
-- ============================================================================
ALTER TABLE gas_fees_sponsored ENABLE ROW LEVEL SECURITY;

-- Users can only view their own gas fees
CREATE POLICY "Users can view their own gas fees"
  ON gas_fees_sponsored
  FOR SELECT
  USING (auth.uid() = user_id);

-- Service role can do everything
CREATE POLICY "Service role can manage all gas fees"
  ON gas_fees_sponsored
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- 6. ADD COMMENTS
-- ============================================================================
COMMENT ON TABLE gas_fees_sponsored IS 'Tracks gas fees sponsored by the platform for user transactions';
COMMENT ON COLUMN gas_fees_sponsored.fee_amount_native IS 'Fee in smallest unit (lamports for Solana, wei for Ethereum)';
COMMENT ON COLUMN gas_fees_sponsored.fee_amount_usd IS 'Approximate USD value of gas fee at time of transaction';
COMMENT ON FUNCTION log_gas_fee_sponsored IS 'Logs a gas fee that was sponsored by the platform';
COMMENT ON FUNCTION get_gas_fee_stats IS 'Gets aggregate statistics on gas fees sponsored';
COMMENT ON FUNCTION get_user_gas_fees IS 'Gets gas fee history for a specific user';

