/**
 * Copy EJS view templates to dist folder after TypeScript build
 * This ensures the templates are available in production
 */

import { cpSync, existsSync, mkdirSync } from 'fs';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const srcViews = './src/views';
const distViews = './dist/views';

try {
  console.log('📁 Copying EJS templates...');
  
  // Ensure dist directory exists
  if (!existsSync('./dist')) {
    mkdirSync('./dist', { recursive: true });
  }
  
  // Copy views folder
  if (existsSync(srcViews)) {
    cpSync(srcViews, distViews, { recursive: true });
    console.log('✅ EJS templates copied successfully!');
  } else {
    console.warn('⚠️  Warning: src/views directory not found');
  }
} catch (error) {
  console.error('❌ Error copying views:', error);
  process.exit(1);
}

