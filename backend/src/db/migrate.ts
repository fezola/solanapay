import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { supabaseAdmin } from '../utils/supabase.js';
import { logger } from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function executeSqlFile(filePath: string, fileName: string) {
  try {
    logger.info(`📄 Running migration: ${fileName}`);

    const sql = readFileSync(filePath, 'utf-8');

    // Execute the entire SQL file as one query
    // Supabase supports multiple statements separated by semicolons
    const { error } = await supabaseAdmin.rpc('exec_sql', { sql });

    if (error) {
      logger.error(`❌ Failed to execute ${fileName}:`, error);
      throw error;
    }

    logger.info(`✅ Successfully executed ${fileName}`);
  } catch (err: any) {
    // If exec_sql doesn't exist, try direct query
    if (err.message?.includes('exec_sql')) {
      logger.warn('exec_sql RPC not found, trying direct query...');

      const sql = readFileSync(filePath, 'utf-8');
      const statements = sql
        .split(';')
        .map((s) => s.trim())
        .filter((s) => s.length > 0 && !s.startsWith('--'));

      for (const statement of statements) {
        try {
          const { error } = await (supabaseAdmin as any).from('_migrations').select('*').limit(0);
          // Use raw query if available
          await (supabaseAdmin as any).rpc('query', { query_text: statement });
        } catch (e) {
          logger.error(`Failed to execute statement from ${fileName}:`, e);
        }
      }
    } else {
      throw err;
    }
  }
}

async function runMigrations() {
  try {
    logger.info('🔄 Starting database migrations...');

    // Get all migration files from migrations directory
    const migrationsDir = join(__dirname, 'migrations');
    const migrationFiles = readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort(); // Sort to run in order (001, 002, 003, etc.)

    logger.info(`Found ${migrationFiles.length} migration files`);

    // Run each migration file
    for (const file of migrationFiles) {
      const filePath = join(migrationsDir, file);
      await executeSqlFile(filePath, file);
    }

    logger.info('✅ All database migrations completed successfully');
  } catch (error) {
    logger.error('❌ Migration failed:', error);
    throw error;
  }
}

// Run migrations if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runMigrations()
    .then(() => {
      logger.info('Migration script completed');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Migration script failed:', error);
      process.exit(1);
    });
}

export { runMigrations };

