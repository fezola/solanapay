-- ============================================================================
-- ADD CRYPTO FEE TRACKING TO PLATFORM_FEES TABLE
-- ============================================================================
-- This migration adds columns to track platform fees collected in cryptocurrency
-- before conversion to fiat via Bread Africa.
--
-- Run this in Supabase SQL Editor
-- ============================================================================

-- Add crypto tracking columns to platform_fees table
ALTER TABLE platform_fees 
ADD COLUMN IF NOT EXISTS crypto_amount DECIMAL(20, 8),
ADD COLUMN IF NOT EXISTS crypto_asset TEXT,
ADD COLUMN IF NOT EXISTS treasury_tx_hash TEXT,
ADD COLUMN IF NOT EXISTS exchange_rate DECIMAL(20, 8);

-- Add comments
COMMENT ON COLUMN platform_fees.crypto_amount IS 'Platform fee amount in cryptocurrency (e.g., 0.00344 USDC)';
COMMENT ON COLUMN platform_fees.crypto_asset IS 'Cryptocurrency asset used for fee (e.g., USDC, SOL, ETH)';
COMMENT ON COLUMN platform_fees.treasury_tx_hash IS 'Blockchain transaction hash for fee transfer to treasury';
COMMENT ON COLUMN platform_fees.exchange_rate IS 'Exchange rate used to calculate crypto fee (e.g., 1453 NGN per USDC)';

-- Create index for treasury transaction lookups
CREATE INDEX IF NOT EXISTS idx_platform_fees_treasury_tx ON platform_fees(treasury_tx_hash) WHERE treasury_tx_hash IS NOT NULL;

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to get total fees collected in crypto
CREATE OR REPLACE FUNCTION get_crypto_fees_summary()
RETURNS TABLE (
  asset TEXT,
  total_crypto_amount DECIMAL,
  total_naira_equivalent DECIMAL,
  transaction_count BIGINT,
  avg_exchange_rate DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    crypto_asset as asset,
    SUM(crypto_amount) as total_crypto_amount,
    SUM(amount) / 100.0 as total_naira_equivalent,
    COUNT(*) as transaction_count,
    AVG(exchange_rate) as avg_exchange_rate
  FROM platform_fees
  WHERE crypto_amount IS NOT NULL
  GROUP BY crypto_asset
  ORDER BY total_naira_equivalent DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get fee collection stats
CREATE OR REPLACE FUNCTION get_fee_collection_stats()
RETURNS TABLE (
  total_fees_naira DECIMAL,
  total_fees_crypto DECIMAL,
  total_transactions BIGINT,
  crypto_collected_count BIGINT,
  virtual_fees_count BIGINT,
  collection_rate DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    SUM(amount) / 100.0 as total_fees_naira,
    SUM(crypto_amount) as total_fees_crypto,
    COUNT(*) as total_transactions,
    COUNT(crypto_amount) as crypto_collected_count,
    COUNT(*) - COUNT(crypto_amount) as virtual_fees_count,
    (COUNT(crypto_amount)::DECIMAL / NULLIF(COUNT(*), 0) * 100) as collection_rate
  FROM platform_fees;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check if columns were added successfully
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns
WHERE table_name = 'platform_fees'
  AND column_name IN ('crypto_amount', 'crypto_asset', 'treasury_tx_hash', 'exchange_rate')
ORDER BY column_name;

-- View current fee collection summary
SELECT * FROM get_fee_collection_stats();

-- View crypto fees by asset
SELECT * FROM get_crypto_fees_summary();

-- ============================================================================
-- EXAMPLE QUERIES
-- ============================================================================

-- Get all fees with crypto collection details
-- SELECT 
--   id,
--   user_id,
--   amount / 100.0 as fee_naira,
--   crypto_amount,
--   crypto_asset,
--   exchange_rate,
--   treasury_tx_hash,
--   created_at
-- FROM platform_fees
-- ORDER BY created_at DESC
-- LIMIT 20;

-- Get total USDC fees collected
-- SELECT 
--   SUM(crypto_amount) as total_usdc_fees,
--   COUNT(*) as transaction_count,
--   SUM(crypto_amount) * 1 as usd_value
-- FROM platform_fees
-- WHERE crypto_asset = 'USDC';

-- Get fees by user
-- SELECT 
--   u.email,
--   COUNT(*) as transaction_count,
--   SUM(pf.amount) / 100.0 as total_fees_naira,
--   SUM(pf.crypto_amount) as total_fees_crypto,
--   pf.crypto_asset
-- FROM platform_fees pf
-- JOIN users u ON u.id = pf.user_id
-- WHERE pf.crypto_amount IS NOT NULL
-- GROUP BY u.email, pf.crypto_asset
-- ORDER BY total_fees_naira DESC;

