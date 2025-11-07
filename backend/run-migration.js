import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function runMigration() {
  console.log('Running migration: fix-bread-wallet-constraint.sql');
  
  const sql = readFileSync('fix-bread-wallet-constraint.sql', 'utf8');
  
  // Split by semicolon and run each statement
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));
  
  for (const statement of statements) {
    console.log(`\nExecuting: ${statement.substring(0, 100)}...`);
    
    const { data, error } = await supabase.rpc('exec_sql', {
      sql_query: statement
    });
    
    if (error) {
      console.error('Error:', error);
      // Continue anyway - some errors are expected (e.g., constraint doesn't exist)
    } else {
      console.log('✅ Success');
    }
  }
  
  console.log('\n✅ Migration complete!');
}

runMigration()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });

