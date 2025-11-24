/**
 * Fix bank_accounts table - Add bread_beneficiary_id column
 */

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fix() {
  console.log('🔧 Fixing bank_accounts table...\n');

  // The SQL we need to run
  const sql = `
    -- Add Bread beneficiary ID to bank_accounts table
    ALTER TABLE bank_accounts
    ADD COLUMN IF NOT EXISTS bread_beneficiary_id TEXT,
    ADD COLUMN IF NOT EXISTS bread_synced_at TIMESTAMPTZ;

    -- Create index for faster lookups
    CREATE INDEX IF NOT EXISTS idx_bank_accounts_bread_beneficiary_id ON bank_accounts(bread_beneficiary_id);
  `;

  console.log('SQL to execute:');
  console.log(sql);
  console.log('\n⚠️  Supabase JS client cannot execute raw SQL.');
  console.log('Please copy the SQL above and run it in Supabase Dashboard SQL Editor.\n');
  console.log('OR run this command:\n');
  console.log(`psql "${process.env.SUPABASE_URL.replace('https://', 'postgresql://postgres:PASSWORD@').replace('.supabase.co', '.supabase.co:5432/postgres')}" -c "${sql.replace(/\n/g, ' ')}"`);
}

fix();

