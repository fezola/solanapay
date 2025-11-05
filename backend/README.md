# Crypto Off-Ramp Backend

Production-ready backend for a custodial crypto off-ramp platform that converts crypto → NGN with bank payouts.

## 🏗️ Architecture

- **Framework**: Fastify (Node.js/TypeScript)
- **Database**: PostgreSQL (via Supabase)
- **Auth**: Supabase Auth
- **Blockchain**: Solana + Base (EVM)
- **Payout Rails**: Paystack
- **Price Oracle**: Pyth Network
- **Background Jobs**: BullMQ + Redis

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL database (or Supabase account)
- Redis (optional, for rate limiting)
- Solana RPC endpoint
- Base RPC endpoint
- Paystack account

### Installation

1. **Clone and install dependencies**

```bash
cd backend
npm install
```

2. **Set up environment variables**

```bash
cp .env.example .env
# Edit .env with your actual values
```

3. **Run database migrations**

```bash
# Option 1: Using Supabase CLI
supabase db push

# Option 2: Using psql
psql -h your-db-host -U postgres -d your-db -f src/db/schema.sql

# Option 3: Using the migration script (if you have exec_sql RPC)
npm run migrate
```

4. **Start the server**

```bash
# Development
npm run dev

# Production
npm run build
npm start
```

## 📋 Environment Variables

### Required

| Variable | Description | Example |
|----------|-------------|---------|
| `SUPABASE_URL` | Supabase project URL | `https://xxx.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | `eyJhbGc...` |
| `ENCRYPTION_KEY` | 32-byte hex key for encrypting private keys | `abcdef123...` |
| `SOLANA_RPC_URL` | Solana RPC endpoint | `https://api.mainnet-beta.solana.com` |
| `BASE_RPC_URL` | Base RPC endpoint | `https://mainnet.base.org` |
| `PAYSTACK_SECRET_KEY` | Paystack secret key | `sk_live_...` |

### Optional

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `3001` |
| `REDIS_URL` | Redis connection URL | - |
| `QUOTE_LOCK_SECONDS` | Quote validity duration | `120` |
| `SPREAD_BPS` | Trading spread in basis points | `50` |

See `.env.example` for full list.

## 🔐 Security

### Private Key Management

- All private keys are encrypted with AES-256-GCM before storage
- Encryption uses PBKDF2 key derivation (100,000 iterations)
- Master encryption key must be stored securely (use AWS Secrets Manager, etc.)

### Treasury Wallets

Set up hot wallets for auto-sweep:

**Solana:**
```bash
# Generate a new wallet
solana-keygen new -o treasury-solana.json

# Get the address
solana-keygen pubkey treasury-solana.json

# Get the private key (base58)
cat treasury-solana.json | jq -r '.[0:32] | @base64'
```

**Base:**
```bash
# Use any Ethereum wallet tool or:
node -e "const ethers = require('ethers'); const w = ethers.Wallet.createRandom(); console.log('Address:', w.address); console.log('Private Key:', w.privateKey);"
```

Add to `.env`:
```
SOLANA_TREASURY_ADDRESS=<address>
SOLANA_TREASURY_PRIVATE_KEY=<base58-key>
BASE_TREASURY_ADDRESS=<address>
BASE_TREASURY_PRIVATE_KEY=<hex-key>
```

## 📡 API Endpoints

### Public Routes

- `POST /api/auth/signup` - Create account
- `POST /api/auth/login` - Login
- `POST /api/auth/otp/request` - Request OTP
- `POST /api/auth/otp/verify` - Verify OTP
- `GET /health` - Health check

### Protected Routes (Require Auth)

**Deposits**
- `GET /api/deposits/addresses` - Get deposit addresses
- `GET /api/deposits/history` - Get deposit history
- `GET /api/deposits/balances` - Get current balances

**Quotes**
- `POST /api/quotes` - Create quote
- `GET /api/quotes/:id` - Get quote details
- `POST /api/quotes/:id/validate` - Validate quote

**Payouts**
- `GET /api/payouts/banks` - Get Nigerian banks
- `POST /api/payouts/beneficiaries` - Add bank account
- `GET /api/payouts/beneficiaries` - List beneficiaries
- `POST /api/payouts/confirm` - Execute payout

**KYC**
- `GET /api/kyc/status` - Get KYC status
- `POST /api/kyc/start` - Start KYC
- `POST /api/kyc/bvn` - Submit BVN
- `POST /api/kyc/documents` - Upload documents
- `POST /api/kyc/complete` - Complete KYC

**Transactions**
- `GET /api/transactions` - Get transaction history
- `GET /api/transactions/:id` - Get transaction details

### Admin Routes (Require Admin Auth)

- `GET /api/admin/stats` - Dashboard statistics
- `GET /api/admin/users` - List users
- `GET /api/admin/kyc/pending` - Pending KYC verifications
- `POST /api/admin/kyc/:id/review` - Approve/reject KYC

### Webhooks

- `POST /webhooks/paystack` - Paystack webhook
- `POST /webhooks/solana` - Solana transaction webhook
- `POST /webhooks/base` - Base transaction webhook

## 🔄 Background Services

### Blockchain Monitors

Automatically detect and process deposits:

- **Solana Monitor**: Polls every 10 seconds for SOL, USDC, USDT deposits
- **Base Monitor**: Polls every 12 seconds for ETH, USDC deposits

### Auto-Sweep

When deposits exceed threshold, funds are automatically swept to treasury:

- SOL: 0.1 SOL threshold
- USDC/USDT: 10 tokens threshold
- ETH: 0.01 ETH threshold

## 🧪 Testing

### End-to-End Test Flow

1. **Create account**
```bash
curl -X POST http://localhost:3001/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

2. **Get deposit address**
```bash
curl http://localhost:3001/api/deposits/addresses \
  -H "Authorization: Bearer <token>"
```

3. **Send crypto to address** (use testnet for testing)

4. **Complete KYC**
```bash
# Start KYC
curl -X POST http://localhost:3001/api/kyc/start \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"level":1}'

# Submit BVN
curl -X POST http://localhost:3001/api/kyc/bvn \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"bvn":"12345678901","date_of_birth":"1990-01-01"}'
```

5. **Create quote**
```bash
curl -X POST http://localhost:3001/api/quotes \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"asset":"USDC","chain":"base","crypto_amount":10}'
```

6. **Add beneficiary**
```bash
curl -X POST http://localhost:3001/api/payouts/beneficiaries \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"bank_code":"058","account_number":"0123456789"}'
```

7. **Execute payout**
```bash
curl -X POST http://localhost:3001/api/payouts/confirm \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"quote_id":"<quote-id>","beneficiary_id":"<beneficiary-id>"}'
```

## 📊 Monitoring

### Logs

Structured JSON logs using Pino:

```bash
# View logs
npm run dev | pino-pretty

# Production logs
pm2 logs
```

### Health Checks

```bash
# Basic health
curl http://localhost:3001/health

# Readiness check
curl http://localhost:3001/health/ready
```

## 🚢 Deployment

### Using PM2

```bash
npm run build
pm2 start dist/index.js --name offramp-backend
pm2 save
```

### Using Docker

```bash
docker build -t offramp-backend .
docker run -p 3001:3001 --env-file .env offramp-backend
```

### Environment Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Use production RPC endpoints
- [ ] Enable HTTPS/TLS
- [ ] Set up proper CORS origins
- [ ] Rotate encryption keys regularly
- [ ] Enable Sentry for error tracking
- [ ] Set up database backups
- [ ] Configure rate limiting with Redis
- [ ] Set up monitoring/alerting

## 📝 License

Proprietary - All rights reserved

