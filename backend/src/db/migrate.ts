import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { supabaseAdmin } from '../utils/supabase.js';
import { logger } from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function runMigration() {
  try {
    logger.info('🔄 Running database migration...');

    // Read schema file
    const schemaPath = join(__dirname, 'schema.sql');
    const schema = readFileSync(schemaPath, 'utf-8');

    // Split into individual statements
    const statements = schema
      .split(';')
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && !s.startsWith('--'));

    // Execute each statement
    for (const statement of statements) {
      try {
        const { error } = await supabaseAdmin.rpc('exec_sql', {
          sql: statement,
        });

        if (error) {
          logger.error(`Failed to execute statement: ${statement.substring(0, 100)}...`);
          logger.error(error);
        }
      } catch (err) {
        logger.error(`Error executing statement: ${err}`);
      }
    }

    logger.info('✅ Database migration completed');
  } catch (error) {
    logger.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration();

