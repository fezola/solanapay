import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const supabase = createClient(
  'https://xojmrgsyshjoddylwxti.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhvam1yZ3N5c2hqb2RkeWx3eHRpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjI2OTQyNCwiZXhwIjoyMDc3ODQ1NDI0fQ.lddgEEvUGNgNAzkLtwzhtlJAyhb76RFOFW9zJNXhDDk'
);

const sql = readFileSync('backend/migrations/add_bonus_system.sql', 'utf8');

console.log('🚀 Running bonus system migration...\n');

// Create the table directly
const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

if (error) {
  console.log('⚠️  RPC method not available, trying direct table creation...\n');

  // Try creating table directly using raw SQL
  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS bonus_transactions (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      admin_email VARCHAR(255) NOT NULL,
      amount DECIMAL(18, 6) NOT NULL CHECK (amount > 0),
      asset VARCHAR(10) NOT NULL,
      chain VARCHAR(20) NOT NULL,
      reason VARCHAR(255) NOT NULL,
      tx_hash VARCHAR(255),
      status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'success', 'failed')),
      error_message TEXT,
      notification_shown BOOLEAN DEFAULT FALSE,
      notification_shown_at TIMESTAMP WITH TIME ZONE,
      shared_on_twitter BOOLEAN DEFAULT FALSE,
      shared_at TIMESTAMP WITH TIME ZONE,
      metadata JSONB DEFAULT '{}',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      completed_at TIMESTAMP WITH TIME ZONE
    );

    CREATE INDEX IF NOT EXISTS idx_bonus_user_id ON bonus_transactions(user_id);
    CREATE INDEX IF NOT EXISTS idx_bonus_status ON bonus_transactions(status);
    CREATE INDEX IF NOT EXISTS idx_bonus_created_at ON bonus_transactions(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_bonus_user_status ON bonus_transactions(user_id, status);
    CREATE INDEX IF NOT EXISTS idx_bonus_notification ON bonus_transactions(user_id, notification_shown) WHERE notification_shown = FALSE;
  `;

  console.log('📝 Please run this SQL in Supabase SQL Editor:\n');
  console.log('─'.repeat(80));
  console.log(createTableSQL);
  console.log('─'.repeat(80));
  console.log('\n✅ Copy the SQL above and run it in: https://supabase.com/dashboard/project/xojmrgsyshjoddylwxti/sql');
  process.exit(0);
}

console.log('✅ Migration completed successfully!');
console.log(data);

