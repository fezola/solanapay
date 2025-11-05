# Bread Africa Integration

This directory contains the complete integration with Bread Africa's offramp API.

## Architecture

```
bread/
├── client.ts          # HTTP client with auth & error handling
├── types.ts           # TypeScript types for Bread API
├── identity.ts        # KYC/Identity service
├── beneficiary.ts     # Bank account service
├── wallet.ts          # Crypto wallet service
├── offramp.ts         # Offramp transaction service
├── webhooks.ts        # Webhook event handler
├── integration.ts     # Bridge to SolPay data models
└── index.ts           # Main service export
```

## Quick Start

### 1. Configure Environment

```env
BREAD_API_KEY=sk_test_your_api_key
BREAD_API_URL=https://api.bread.africa
BREAD_WEBHOOK_SECRET=your_webhook_secret
BREAD_ENABLED=true
```

### 2. Test Connection

```bash
npm run test:bread
```

### 3. Use in Your Code

```typescript
import { BreadService } from './services/bread';

const bread = new BreadService({
  apiKey: process.env.BREAD_API_KEY!,
});

// Create identity
const identity = await bread.identity.createIdentity({
  firstName: 'John',
  lastName: 'Doe',
  email: 'john@example.com',
  phoneNumber: '+2348012345678',
  address: { country: 'NG' },
});

// Create beneficiary
const beneficiary = await bread.beneficiary.createBeneficiary({
  identityId: identity.id,
  bankCode: '058',
  accountNumber: '0123456789',
});

// Create wallet
const wallet = await bread.wallet.createWallet(
  identity.id,
  'solana',
  'offramp',
  beneficiary.id
);

// Get quote
const quote = await bread.offramp.calculateQuote('USDC', '100', 'NGN');

// Execute offramp
const offramp = await bread.offramp.createOfframp(
  wallet.id,
  beneficiary.id,
  '100'
);
```

## Services

### BreadClient

Low-level HTTP client for Bread API.

**Features:**
- Automatic authentication via `x-service-key` header
- Request/response logging
- Error handling and retry logic
- TypeScript types for all requests

### BreadIdentityService

Manages user identities and KYC verification.

**Methods:**
- `createIdentity(request)` - Create new identity
- `getIdentity(id)` - Get identity by ID
- `updateIdentity(id, updates)` - Update identity
- `getVerificationStatus(id)` - Check KYC status

### BreadBeneficiaryService

Manages bank accounts for payouts.

**Methods:**
- `createBeneficiary(request)` - Add bank account
- `getBeneficiary(id)` - Get beneficiary by ID
- `listBeneficiaries(identityId)` - List all beneficiaries
- `verifyBankAccount(bankCode, accountNumber)` - Verify account
- `deleteBeneficiary(id)` - Remove beneficiary

### BreadWalletService

Manages crypto wallets.

**Methods:**
- `createWallet(identityId, chain, type, beneficiaryId)` - Create wallet
- `getWallet(id)` - Get wallet by ID
- `listWallets(identityId)` - List all wallets
- `getWalletBalance(id)` - Get wallet balance
- `getWalletTransactions(id, options)` - Get transaction history
- `disableWallet(id)` - Disable wallet
- `findOrCreateWallet(identityId, chain, beneficiaryId)` - Get or create

**Wallet Types:**
- `offramp` - Auto-converts crypto to fiat when received
- `basic` - Manual operations required

**Supported Chains:**
- Solana (SVM)
- Base (EVM)
- Ethereum (EVM)

### BreadOfframpService

Manages crypto-to-fiat conversions.

**Methods:**
- `getRate(asset, currency, cryptoAmount?, fiatAmount?)` - Get exchange rate
- `createOfframp(walletId, beneficiaryId, cryptoAmount)` - Execute offramp
- `getOfframp(id)` - Get offramp by ID
- `listOfframps(identityId, options)` - List offramps
- `cancelOfframp(id)` - Cancel offramp
- `getOfframpStatus(id)` - Check status
- `calculateQuote(asset, cryptoAmount, currency)` - Get quote with fees

### BreadWebhookHandler

Processes webhook events from Bread.

**Events:**
- `offramp.created` - Offramp transaction created
- `offramp.processing` - Offramp being processed
- `offramp.completed` - Payout successful
- `offramp.failed` - Payout failed
- `wallet.deposit` - Crypto received
- `identity.verified` - KYC approved
- `identity.rejected` - KYC rejected

**Usage:**
```typescript
const handler = new BreadWebhookHandler(webhookSecret);

await handler.processWebhook(payload, {
  onOfframpCompleted: async (offramp) => {
    console.log('Payout completed:', offramp.id);
  },
  onOfframpFailed: async (offramp) => {
    console.error('Payout failed:', offramp.errorMessage);
  },
});
```

### BreadIntegrationService

Bridges SolPay data models with Bread API.

**Methods:**
- `syncUserIdentity(user)` - Sync user with Bread
- `syncBeneficiary(beneficiary, identityId)` - Sync beneficiary
- `getOrCreateDepositAddress(userId, chain, asset)` - Get deposit address
- `getQuote(asset, cryptoAmount)` - Get quote
- `executePayout(payout)` - Execute payout

## Error Handling

All services throw `BreadAPIError` on failure:

```typescript
try {
  const identity = await bread.identity.createIdentity(data);
} catch (error) {
  if (error instanceof BreadAPIError) {
    console.error('Bread API error:', {
      code: error.code,
      message: error.message,
      statusCode: error.statusCode,
      details: error.details,
    });
  }
}
```

## Common Error Codes

- `INVALID_API_KEY` - API key is invalid or missing
- `IDENTITY_NOT_FOUND` - Identity does not exist
- `BENEFICIARY_NOT_FOUND` - Beneficiary does not exist
- `WALLET_NOT_FOUND` - Wallet does not exist
- `INSUFFICIENT_BALANCE` - Not enough crypto in wallet
- `INVALID_BANK_ACCOUNT` - Bank account verification failed
- `RATE_LIMIT_EXCEEDED` - Too many requests
- `NETWORK_ERROR` - Connection to Bread API failed

## Testing

### Unit Tests

```bash
npm test
```

### Integration Test

```bash
npm run test:bread
```

This will:
1. Check API connectivity
2. Create test identity
3. Create test beneficiary
4. Create test wallets (Solana + Base)
5. Fetch exchange rates
6. Calculate quote

### Manual Testing

```typescript
// In your code
import { BreadService } from './services/bread';

const bread = new BreadService({
  apiKey: 'sk_test_...',
});

// Test health
const isHealthy = await bread.healthCheck();
console.log('Bread API healthy:', isHealthy);
```

## Monitoring

### Logs

All operations are logged with structured data:

```json
{
  "msg": "Bread identity created",
  "identityId": "id_123",
  "status": "pending"
}
```

### Database

Check `bread_api_logs` table for all API calls:

```sql
SELECT * FROM bread_api_logs 
WHERE user_id = 'user_123' 
ORDER BY created_at DESC;
```

## Best Practices

1. **Always sync users before creating wallets**
   ```typescript
   await integration.syncUserIdentity(user);
   ```

2. **Use findOrCreateWallet to avoid duplicates**
   ```typescript
   const wallet = await bread.wallet.findOrCreateWallet(
     identityId,
     'solana',
     beneficiaryId
   );
   ```

3. **Handle webhook events asynchronously**
   ```typescript
   // Store in database first, process later
   await db.insert('bread_webhook_events', payload);
   ```

4. **Cache exchange rates**
   ```typescript
   // Rates don't change every second
   const cachedRate = await redis.get(`bread:rate:USDC:NGN`);
   ```

5. **Validate before creating offramp**
   ```typescript
   // Check balance, limits, KYC status first
   const quote = await bread.offramp.calculateQuote(...);
   if (quote.netAmount < minimumPayout) {
     throw new Error('Amount too small');
   }
   ```

## Troubleshooting

### "API key not configured"

Add `BREAD_API_KEY` to `.env` file.

### "User not synced with Bread"

Call `syncUserIdentity()` before creating wallets.

### "Beneficiary required for offramp wallet"

Offramp wallets need a beneficiary ID. Create beneficiary first.

### "Network error"

Check internet connection and `BREAD_API_URL`.

### Webhook not received

1. Check webhook URL is publicly accessible
2. Verify webhook secret matches
3. Check firewall/security settings

## Support

- **Documentation**: https://docs.bread.africa
- **API Reference**: https://docs.bread.africa/api
- **Support**: Contact your Bread account manager

