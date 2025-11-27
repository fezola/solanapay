-- ============================================================================
-- BONUS SYSTEM MIGRATION
-- ============================================================================
-- Creates tables and functions for admin bonus distribution system

-- Bonus Transactions Table
CREATE TABLE IF NOT EXISTS bonus_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  admin_email VARCHAR(255) NOT NULL,
  
  -- Bonus details
  amount DECIMAL(18, 6) NOT NULL CHECK (amount > 0),
  asset VARCHAR(10) NOT NULL,
  chain VARCHAR(20) NOT NULL,
  reason VARCHAR(255) NOT NULL,
  
  -- Transaction details
  tx_hash VARCHAR(255),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'success', 'failed')),
  error_message TEXT,
  
  -- Notification details
  notification_shown BOOLEAN DEFAULT FALSE,
  notification_shown_at TIMESTAMP WITH TIME ZONE,
  shared_on_twitter BOOLEAN DEFAULT FALSE,
  shared_at TIMESTAMP WITH TIME ZONE,
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  
  -- Indexes
  INDEX idx_bonus_user_id (user_id),
  INDEX idx_bonus_status (status),
  INDEX idx_bonus_created_at (created_at DESC)
);

-- Add comment
COMMENT ON TABLE bonus_transactions IS 'Tracks admin bonus distributions to users';

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_bonus_user_status ON bonus_transactions(user_id, status);
CREATE INDEX IF NOT EXISTS idx_bonus_notification ON bonus_transactions(user_id, notification_shown) WHERE notification_shown = FALSE;

