# Bread Africa Integration Guide

## Overview

This guide explains how to integrate Bread Africa's offramp API into your SolPay application. The integration has been designed to work alongside your existing system, allowing for a gradual migration or hybrid approach.

## What's Been Implemented

### 1. Core Bread Service Layer (`backend/src/services/bread/`)

- **`client.ts`** - HTTP client with authentication, error handling, and logging
- **`types.ts`** - TypeScript types for all Bread API entities and requests
- **`identity.ts`** - KYC/Identity management service
- **`beneficiary.ts`** - Bank account management service
- **`wallet.ts`** - Crypto wallet creation and management
- **`offramp.ts`** - Crypto-to-fiat conversion service
- **`webhooks.ts`** - Webhook event handler
- **`integration.ts`** - Bridge between SolPay and Bread data models
- **`index.ts`** - Main service that combines all sub-services

### 2. Offramp Provider Abstraction (`backend/src/services/offramp-provider.ts`)

A provider pattern that allows switching between:
- **Legacy Provider** - Your current Solana/Base wallet + Paystack implementation
- **Bread Provider** - Bread Africa API integration

This allows you to:
- Test Bread without breaking existing functionality
- Run both systems in parallel
- Gradually migrate users to Bread
- Fall back to legacy if needed

### 3. Database Schema Updates

**Migration file:** `backend/src/db/migrations/002_add_bread_integration.sql`

Adds Bread-specific fields to existing tables:
- `users.bread_identity_id` - Links user to Bread identity
- `users.bread_identity_status` - KYC verification status
- `payout_beneficiaries.bread_beneficiary_id` - Links to Bread beneficiary
- `deposit_addresses.bread_wallet_id` - Links to Bread wallet
- `payouts.bread_offramp_id` - Links to Bread offramp transaction

New tables:
- `bread_webhook_events` - Stores webhook events from Bread
- `bread_api_logs` - Logs all Bread API calls for debugging

### 4. Webhook Handler (`backend/src/routes/bread-webhooks.ts`)

Processes webhook events from Bread:
- `offramp.created` - Offramp transaction created
- `offramp.processing` - Offramp being processed
- `offramp.completed` - Payout successful
- `offramp.failed` - Payout failed
- `wallet.deposit` - Crypto received in wallet
- `identity.verified` - KYC approved
- `identity.rejected` - KYC rejected

### 5. Environment Configuration

Added to `backend/src/config/env.ts`:
```env
BREAD_API_KEY=your_api_key_here
BREAD_API_URL=https://api.bread.africa
BREAD_WEBHOOK_SECRET=your_webhook_secret
BREAD_ENABLED=false  # Set to true to enable Bread
```

## Setup Instructions

### Step 1: Install Dependencies

No new dependencies needed! The integration uses existing packages:
- `axios` - Already installed
- `zod` - Already installed

### Step 2: Configure Environment Variables

Add to your `.env` file:

```env
# Bread Africa API
BREAD_API_KEY=sk_test_your_api_key_here
BREAD_API_URL=https://api.bread.africa
BREAD_WEBHOOK_SECRET=your_webhook_secret_here
BREAD_ENABLED=false
```

**Note:** Keep `BREAD_ENABLED=false` until you're ready to test.

### Step 3: Run Database Migration

```bash
cd backend
npm run tsx src/db/run-bread-migration.ts
```

This will add Bread-specific fields to your existing tables.

### Step 4: Update Route Registrations

Add the Bread webhook route to your `backend/src/index.ts`:

```typescript
import { breadWebhookRoutes } from './routes/bread-webhooks.js';

// Register routes
await fastify.register(breadWebhookRoutes, { prefix: '/api/webhooks' });
```

### Step 5: Test with Sandbox

1. Get your Bread API sandbox key from Bread Africa
2. Set `BREAD_ENABLED=true` in `.env`
3. Restart your backend server
4. Test the integration:

```bash
# Check if Bread is enabled
curl http://localhost:3001/api/health

# The logs should show "Bread offramp provider enabled"
```

## How It Works

### User Onboarding Flow

**With Bread Enabled:**

1. User signs up → Creates Supabase user
2. User completes KYC → Creates Bread identity
3. User adds bank account → Creates Bread beneficiary
4. User requests deposit address → Creates Bread offramp wallet
5. User deposits crypto → Bread auto-converts to fiat
6. Fiat sent to bank account → Bread handles payout

**Legacy Flow (for comparison):**

1. User signs up → Creates Supabase user
2. User completes KYC → Manual verification
3. User adds bank account → Paystack verification
4. User requests deposit address → Generate from seed
5. User deposits crypto → Monitor blockchain
6. Sweep to treasury → Manual process
7. Calculate quote → Pyth price feed
8. Execute payout → Paystack transfer

### Deposit Address Generation

```typescript
import { offrampProvider } from './services/offramp-provider.js';

// This will use Bread if enabled, otherwise legacy
const address = await offrampProvider.getDepositAddress(
  userId,
  'solana',
  'USDC'
);
```

### Quote Calculation

```typescript
import { offrampProvider } from './services/offramp-provider.js';

// This will use Bread rates if enabled, otherwise Pyth
const quote = await offrampProvider.calculateQuote(
  'USDC',
  'solana',
  100, // 100 USDC
  undefined,
  'NGN'
);
```

### Payout Execution

```typescript
import { offrampProvider } from './services/offramp-provider.js';

// This will use Bread if enabled, otherwise Paystack
const result = await offrampProvider.executePayout(payout, beneficiary);
```

## Migration Strategy

### Option 1: Full Migration (Recommended)

1. Set `BREAD_ENABLED=true`
2. All new users automatically use Bread
3. Existing users continue with legacy until they create new addresses
4. Gradually migrate existing users by regenerating their deposit addresses

### Option 2: Gradual Migration

1. Keep `BREAD_ENABLED=false` for most users
2. Enable for specific test users via feature flag
3. Monitor performance and costs
4. Gradually increase percentage of users on Bread

### Option 3: Hybrid Approach

1. Use Bread for new chains/assets
2. Keep legacy for existing Solana/Base
3. Best for risk mitigation

## Testing Checklist

- [ ] Database migration runs successfully
- [ ] Bread service initializes without errors
- [ ] Can create Bread identity for test user
- [ ] Can create Bread beneficiary with bank account
- [ ] Can generate Bread wallet and get deposit address
- [ ] Can get quote from Bread API
- [ ] Can execute offramp transaction
- [ ] Webhooks are received and processed correctly
- [ ] Payout status updates in database
- [ ] User sees correct transaction history

## API Endpoints

### Existing Endpoints (No Changes Required)

All existing endpoints continue to work. The provider abstraction handles routing to Bread or legacy:

- `GET /api/deposits/addresses` - Returns deposit addresses (Bread or legacy)
- `POST /api/quotes` - Creates quote (Bread rates or Pyth)
- `POST /api/payouts/beneficiaries` - Creates beneficiary (syncs to Bread if enabled)
- `POST /api/payouts/execute` - Executes payout (Bread or Paystack)

### New Endpoints

- `POST /api/webhooks/bread` - Receives Bread webhook events
- `GET /api/webhooks/bread/events` - View webhook history (admin)

## Monitoring

### Logs to Watch

```bash
# Bread service initialization
"Bread integration service initialized"

# User synced with Bread
"User synced with Bread identity"

# Wallet created
"Bread wallet created"

# Offramp executed
"Bread offramp executed"

# Webhook received
"Bread webhook processed successfully"
```

### Database Queries

```sql
-- Check users synced with Bread
SELECT id, email, bread_identity_id, bread_identity_status 
FROM users 
WHERE bread_identity_id IS NOT NULL;

-- Check Bread wallets
SELECT user_id, chain, asset, address, bread_wallet_id 
FROM deposit_addresses 
WHERE bread_wallet_id IS NOT NULL;

-- Check Bread payouts
SELECT id, fiat_amount, status, bread_offramp_id 
FROM payouts 
WHERE bread_offramp_id IS NOT NULL;

-- Check webhook events
SELECT event_type, processed, created_at 
FROM bread_webhook_events 
ORDER BY created_at DESC 
LIMIT 10;
```

## Troubleshooting

### "Bread integration not enabled"

- Check `BREAD_ENABLED=true` in `.env`
- Check `BREAD_API_KEY` is set
- Restart backend server

### "User not synced with Bread"

- User needs to complete KYC first
- Call `syncUserIdentity()` manually if needed

### "No default beneficiary found"

- User needs to add bank account first
- Beneficiary must be marked as default

### Webhook not received

- Check webhook URL is publicly accessible
- Verify `BREAD_WEBHOOK_SECRET` matches Bread dashboard
- Check `bread_webhook_events` table for errors

## Cost Comparison

### Legacy System Costs

- RPC calls (Solana/Base): ~$50-100/month
- Pyth price feeds: Free
- Paystack fees: 0.5% + ₦100 per transfer
- Infrastructure: Server costs for monitoring

### Bread System Costs

- Bread API: Check with Bread for pricing
- No RPC costs
- No monitoring infrastructure needed
- Consolidated fee structure

## Next Steps

1. **Get API Key** - Wait for Bread to provide your API key
2. **Test in Sandbox** - Use test credentials to verify integration
3. **Configure Webhooks** - Set up webhook URL in Bread dashboard
4. **Run Migration** - Execute database migration
5. **Enable for Test User** - Test with a single user first
6. **Monitor** - Watch logs and database for any issues
7. **Gradual Rollout** - Increase percentage of users on Bread
8. **Full Migration** - Switch all users to Bread

## Support

- **Bread Documentation**: https://docs.bread.africa
- **Bread Support**: Contact your Bread account manager
- **SolPay Integration**: Check this guide and code comments

## Files Modified/Created

### Created Files
- `backend/src/services/bread/` (entire directory)
- `backend/src/services/offramp-provider.ts`
- `backend/src/db/migrations/002_add_bread_integration.sql`
- `backend/src/db/run-bread-migration.ts`
- `backend/src/routes/bread-webhooks.ts`
- `BREAD_INTEGRATION_GUIDE.md` (this file)

### Modified Files
- `backend/src/config/env.ts` (added Bread env vars)

### Files to Modify (When Ready)
- `backend/src/index.ts` (register webhook routes)
- `backend/src/routes/deposits.ts` (optional: use offrampProvider)
- `backend/src/routes/quotes.ts` (optional: use offrampProvider)
- `backend/src/routes/payouts.ts` (optional: use offrampProvider)

