/**
 * Run Bread Africa Integration Migration
 * Adds Bread-specific fields to existing tables
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { supabase } from '../utils/supabase.js';
import { logger } from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function runMigration() {
  try {
    logger.info({ msg: 'Starting Bread integration migration' });

    // Read migration file
    const migrationPath = join(__dirname, 'migrations', '002_add_bread_integration.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf-8');

    // Split by semicolon and filter out empty statements
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('COMMENT'));

    logger.info({ msg: `Executing ${statements.length} migration statements` });

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      logger.debug({ msg: `Executing statement ${i + 1}/${statements.length}` });

      const { error } = await supabase.rpc('exec_sql', {
        sql: statement + ';'
      });

      if (error) {
        // Check if it's a "already exists" error, which we can ignore
        if (error.message.includes('already exists')) {
          logger.warn({ msg: 'Object already exists, skipping', error: error.message });
          continue;
        }
        throw error;
      }
    }

    logger.info({ msg: 'Bread integration migration completed successfully' });
    process.exit(0);
  } catch (error) {
    logger.error({ msg: 'Migration failed', error });
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

runMigration();

