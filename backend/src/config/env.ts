import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  // Environment
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('3001').transform(Number),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),

  // Supabase
  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string(),
  SUPABASE_SERVICE_ROLE_KEY: z.string(),

  // Security
  ENCRYPTION_KEY: z.string().min(32),

  // Solana
  SOLANA_RPC_URL: z.string().url(),
  SOLANA_NETWORK: z.enum(['mainnet-beta', 'devnet', 'testnet']).default('mainnet-beta'),
  SOLANA_TREASURY_ADDRESS: z.string().optional(),
  SOLANA_TREASURY_PRIVATE_KEY: z.string().optional(),
  // Mainnet USDC and USDT mint addresses (same for mainnet and devnet)
  USDC_SOL_MINT: z.string().default('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'),
  USDT_SOL_MINT: z.string().default('Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB'),

  // Base (EVM)
  BASE_RPC_URL: z.string().url(),
  BASE_CHAIN_ID: z.string().default('8453').transform(Number),
  BASE_TREASURY_ADDRESS: z.string().optional(),
  BASE_TREASURY_PRIVATE_KEY: z.string().optional(),
  BASE_USDC_CONTRACT: z.string().default('0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'),

  // Polygon (EVM)
  POLYGON_RPC_URL: z.string().url().default('https://polygon-rpc.com'),
  POLYGON_CHAIN_ID: z.string().default('137').transform(Number),
  POLYGON_TREASURY_ADDRESS: z.string().optional(),
  POLYGON_TREASURY_PRIVATE_KEY: z.string().optional(),
  POLYGON_USDC_CONTRACT: z.string().default('0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359'),
  POLYGON_USDT_CONTRACT: z.string().default('0xc2132D05D31c914a87C6611C10748AEb04B58e8F'),

  // Price Feeds
  PYTH_PRICE_SERVICE_URL: z.string().url().default('https://hermes.pyth.network'),
  PYTH_API_KEY: z.string().optional(),
  PRICE_FALLBACK_URL: z.string().url().optional(),

  // Redis (optional)
  REDIS_URL: z.string().url().optional(),

  // Payout Rails (DEPRECATED - We use Bread Africa now)
  PAYSTACK_SECRET_KEY: z.string().optional(),
  PAYSTACK_PUBLIC_KEY: z.string().optional(),
  PAYSTACK_MOCK_MODE: z.string().transform(v => v === 'true').default('false'),

  // Bread Africa API
  BREAD_API_KEY: z.string().optional(),
  BREAD_API_URL: z.string().url().default('https://api.bread.africa'),
  BREAD_WEBHOOK_SECRET: z.string().optional(),
  BREAD_ENABLED: z.string().transform(v => v === 'true').default('false'),

  // KYC/AML - Sumsub
  SUMSUB_APP_TOKEN: z.string().optional(),
  SUMSUB_SECRET_KEY: z.string().optional(),
  SUMSUB_BASE_URL: z.string().url().default('https://api.sumsub.com'),
  SUMSUB_LEVEL_NAME: z.string().default('basic-kyc-level'),
  SUMSUB_WEBHOOK_SECRET: z.string().optional(),
  KYC_AUTO_APPROVE: z.string().transform(v => v === 'true').default('false'),

  // Observability
  SENTRY_DSN: z.string().optional(),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),

  // Admin
  ADMIN_EMAIL: z.string().email().optional(),

  // Limits & Fees
  DEFAULT_SPREAD_BPS: z.string().default('50').transform(Number),
  FLAT_FEE_NGN: z.string().default('100').transform(Number),
  VARIABLE_FEE_BPS: z.string().default('100').transform(Number),
  QUOTE_LOCK_SECONDS: z.string().default('120').transform(Number),
  MIN_CONFIRMATIONS_SOLANA: z.string().default('1').transform(Number),
  MIN_CONFIRMATIONS_BASE: z.string().default('12').transform(Number),
  SWEEP_THRESHOLD_SOL: z.string().default('0.1').transform(Number),
  SWEEP_THRESHOLD_USDC: z.string().default('10').transform(Number),
  SWEEP_THRESHOLD_USDT: z.string().default('10').transform(Number),
});

export const env = envSchema.parse(process.env);

export type Env = z.infer<typeof envSchema>;

