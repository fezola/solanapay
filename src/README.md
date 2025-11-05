# Crypto Off-Ramp Platform - Frontend Demo

A production-ready mobile-first crypto off-ramp application that converts cryptocurrency to Nigerian Naira with bank payouts.

## Features Implemented

### ✅ Multi-Asset Support
- **USDC (Solana)** - SPL token on Solana network
- **USDC (Base)** - ERC-20 token on Base L2
- **SOL** - Native Solana token
- **USDT (Solana)** - SPL token on Solana network

### ✅ Core User Flows

#### 1. Authentication
- Email/phone OTP passwordless auth
- Clean onboarding flow
- Session management

#### 2. KYC Verification (Multi-Tier)
- **Tier 0 (Preview)**: View app, no transactions
- **Tier 1 (Basic)**: 
  - BVN verification
  - Government ID (NIN/Passport)
  - Selfie liveness check
  - ₦100K daily / ₦2M monthly limits
- **Tier 2 (Advanced)**:
  - Address proof
  - Source of funds
  - ₦500K daily / ₦10M monthly limits
  - Lower fees (0.8% vs 1%)

#### 3. Deposit Flow
- Per-asset deposit addresses
- QR code generation
- Network confirmation tracking
- Minimum deposit amounts
- Clear network warnings

#### 4. Off-Ramp Flow
- Multi-asset selection
- Live exchange rate quotes
- Quote lock timer (120 seconds)
- Fee breakdown (1% standard, 0.8% tier 2)
- Daily/weekly/monthly limit checks
- Bank account selection
- Real-time status tracking

#### 5. Bank Account Management
- Nigerian bank support (19 major banks)
- NUBAN validation (10 digits)
- Account name verification simulation
- Multiple beneficiary management
- Delete with confirmation

#### 6. Transaction Tracking
- Detailed transaction history
- Status progression:
  - Pending → Confirming → Converting → Payout Pending → Completed
- Transaction details:
  - Blockchain explorer links
  - Confirmation progress
  - Rate and fee breakdown
  - Bank payout reference
  - Receipt generation
- Filter by type (deposits/offramps)

#### 7. Limits & Tier Management
- Visual limit usage tracking
- Daily/weekly/monthly breakdown
- Reset countdown timers
- Tier upgrade path
- Feature comparison
- Progress bars

### ✅ UI/UX Features
- Clean, minimal design (OroboPay-inspired)
- White background with subtle borders
- Smooth Motion animations
- Toast notifications
- Loading states
- Empty states
- Error handling
- Mobile-first responsive design
- Bottom navigation
- Contextual help

## Technical Stack

- **React** (TypeScript)
- **Tailwind CSS v4**
- **Motion** (Framer Motion) for animations
- **ShadCN UI** components
- **Sonner** for toast notifications
- **Lucide React** for icons

## Project Structure

```
/components
  ├── AuthScreen.tsx           # Login/signup
  ├── Dashboard.tsx            # Home screen
  ├── KYCScreen.tsx           # Multi-step KYC flow
  ├── DepositScreen.tsx       # Crypto deposits
  ├── OfframpScreen.tsx       # Convert crypto to NGN
  ├── BankAccountScreen.tsx   # Bank management
  ├── TransactionsScreen.tsx  # Transaction list
  ├── TransactionDetailScreen.tsx  # Detailed view
  ├── LimitsScreen.tsx        # Limits and tiers
  ├── SettingsScreen.tsx      # User settings
  ├── WalletScreen.tsx        # Quick wallet view
  └── BottomNavigation.tsx    # Tab navigation
```

## Asset Configuration

### Exchange Rates (Mock)
- USDC: ₦1,600 / USDC
- SOL: ₦250,000 / SOL
- USDT: ₦1,600 / USDT

### Network Configurations
- **Solana**: 1 confirmation (~30 seconds)
- **Base**: 12 confirmations (~2 minutes)

### Minimum Deposits
- USDC: 1 USDC
- SOL: 0.01 SOL
- USDT: 1 USDT

## Next Steps for Production

### 1. Backend Implementation
- **Supabase Setup**:
  - User authentication (OTP, magic links)
  - Postgres database with RLS
  - Row-level security policies
  - File storage for KYC documents

- **Blockchain Integration**:
  - Solana RPC monitoring (Helius/QuickNode)
  - Base RPC monitoring (Alchemy/Infura)
  - Custodial wallet generation (HD derivation)
  - HSM integration for key management
  - Auto-sweep to treasury

- **KYC/AML**:
  - BVN verification API (Mono, Stitch, or Youverify)
  - Document verification (Smile ID, Identitypass)
  - Liveness detection
  - Sanctions screening (ComplyAdvantage, Chainalysis)
  - PEP checks

- **Payout Rails**:
  - Paystack Transfer API
  - Flutterwave Payouts
  - Bank account verification
  - Webhook handling
  - Reconciliation

- **Rate Engine**:
  - Pyth oracle integration
  - Fallback to centralized sources
  - Spread management
  - Slippage protection

- **Risk Engine**:
  - Transaction velocity limits
  - Device fingerprinting
  - IP geolocation
  - Chain analysis
  - Manual review queue

### 2. Observability
- OpenTelemetry instrumentation
- Sentry error tracking
- Log aggregation
- Metrics dashboards
- Alerting

### 3. Security
- KMS for secrets
- API key rotation
- Rate limiting
- CSRF protection
- Input validation
- SQL injection prevention

### 4. Compliance
- Terms of Service
- Privacy Policy
- AML/KYC policies
- Data retention
- Audit trails
- Regulatory reporting

### 5. Admin Console
- User management
- KYC review queue
- Risk case management
- Transaction monitoring
- Rate overrides
- Treasury management
- Feature flags
- Analytics

### 6. Testing
- Unit tests
- Integration tests
- E2E tests (Playwright/Cypress)
- Load testing
- Penetration testing

## Environment Variables Needed

```env
# App
APP_ENV=production
APP_URL=https://yourapp.com

# Supabase
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE=

# Blockchain - Solana
SOLANA_RPC_URL=
SOLANA_TREASURY_HOT=
USDC_SOL_MINT=
USDT_SOL_MINT=

# Blockchain - Base
BASE_RPC_URL=
BASE_USDC_CONTRACT=
BASE_TREASURY_HOT=

# KMS
KMS_KEY_ID=

# Price Feeds
PYTH_API_KEY=
PRICE_FALLBACK_URL=

# Payouts
PAYSTACK_SECRET_KEY=
FLUTTERWAVE_SECRET_KEY=

# KYC/AML
KYC_PROVIDER_API_KEY=
SANCTIONS_API_KEY=

# Observability
SENTRY_DSN=
OTEL_ENDPOINT=
```

## Supported Banks

- Access Bank
- GTBank (Guaranty Trust Bank)
- Zenith Bank
- First Bank of Nigeria
- UBA (United Bank for Africa)
- Fidelity Bank
- FCMB
- Stanbic IBTC
- Union Bank
- Sterling Bank
- Wema Bank
- Polaris Bank
- Keystone Bank
- Ecobank
- Heritage Bank
- Unity Bank
- Providus Bank
- Citibank
- Standard Chartered

## Legal Disclaimers

⚠️ **Important**: This is a demo/prototype built on Figma Make. For production:

1. **Licensing**: Ensure proper MSB/MTL licensing for crypto-fiat exchange
2. **Compliance**: Work with legal counsel for Nigerian CBN regulations
3. **Security**: Implement proper HSM custody, not software keys
4. **Insurance**: Get proper insurance for custodial assets
5. **PII Protection**: This platform is NOT designed for production PII storage
6. **Audit**: Complete security and financial audits before launch

## License

MIT License - See LICENSE file for details

---

**Built with Figma Make** - For production deployment, migrate to proper React Native (Expo) with backend infrastructure.
