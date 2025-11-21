# KYC Removal Summary - Offramp Open for All

## Overview
Updated the SolPay offramp system to remove KYC requirements. Users can now create beneficiaries and execute offramps without identity verification, as per Bread Africa's updated API that no longer requires KYC.

## Changes Made

### 1. Type Definitions (`backend/src/services/bread/types.ts`)

#### `CreateBeneficiaryRequest` Interface
- **Changed**: Made `identityId` optional
- **Before**: `identityId: string;`
- **After**: `identityId?: string; // Optional - KYC no longer required`

#### `BreadBeneficiary` Interface
- **Changed**: Made `identityId` optional
- **Before**: `identityId: string;`
- **After**: `identityId?: string; // Optional - KYC no longer required`

### 2. Beneficiary Service (`backend/src/services/bread/beneficiary.ts`)

#### `createBeneficiary` Method
- **Removed**: Requirement to send `identity_id` to Bread API
- **Added**: Conditional logic to only include `identity_id` if provided (backward compatibility)
- **Updated**: Logging to indicate KYC-free beneficiary creation

**Key Changes**:
```typescript
// Only include identity_id if provided
const breadRequest: any = {
  currency: (request.currency || 'NGN').toUpperCase(),
  details: {
    account_number: request.accountNumber,
    bank_code: request.bankCode,
  },
};

// Only add identity_id if provided (for backward compatibility)
if (request.identityId) {
  breadRequest.identity_id = request.identityId;
}
```

### 3. Payouts Routes (`backend/src/routes/payouts.ts`)

#### `/beneficiaries` Endpoint
- **Removed**: Entire identity creation flow (lines 593-644)
  - No longer fetches user details
  - No longer creates or retrieves Bread identity
  - No longer saves `bread_identity_id` to user record
  - No longer creates Bread wallets (wallet creation removed)

- **Simplified**: Beneficiary creation now only requires:
  1. Bank account lookup (verification)
  2. Beneficiary creation without identity
  3. Saving to database

**Flow Before**:
1. Get user details
2. Create/get Bread identity
3. Save identity to user record
4. Lookup bank account
5. Create beneficiary with identity
6. Create Bread wallets for Solana and Base
7. Update deposit addresses with wallet IDs
8. Save to database

**Flow After**:
1. Lookup bank account
2. Create beneficiary (no identity)
3. Save to database

### 4. Quotes Routes (`backend/src/routes/quotes.ts`)

#### `POST /` (Create Quote) Endpoint
- **Removed**: KYC verification check (lines 40-52)
- **Before**: Required `kyc_tier >= 1` and `kyc_status === 'approved'`
- **After**: No KYC check - all authenticated users can create quotes

## Impact

### What Still Works
✅ Bank account verification via Bread's lookup endpoint
✅ Beneficiary creation and management
✅ Offramp execution
✅ Quote generation
✅ Transaction history
✅ All existing beneficiaries (backward compatible)

### What Was Removed
❌ Identity creation during beneficiary setup
❌ Bread wallet creation (no longer needed)
❌ KYC checks before creating quotes
❌ `bread_identity_id` population in user records

### Database Fields (Unchanged)
The following fields remain in the database but will no longer be populated for new users:
- `users.bread_identity_id`
- `users.bread_identity_status`
- `deposit_addresses.bread_wallet_id`
- `deposit_addresses.bread_wallet_address`
- `deposit_addresses.bread_wallet_type`

## Testing Recommendations

1. **Create New Beneficiary**: Test adding a bank account without KYC
2. **Execute Offramp**: Test offramp with newly created beneficiary
3. **Create Quote**: Verify quotes work without KYC verification
4. **Existing Users**: Verify existing beneficiaries still work

## API Endpoints Affected

### Modified Endpoints
- `POST /api/payouts/beneficiaries` - No longer requires/creates identity
- `POST /api/quotes` - No longer checks KYC status

### Unchanged Endpoints
- `GET /api/payouts/banks` - Still works
- `POST /api/payouts/verify-account` - Still works
- `POST /api/payouts/execute` - Still works
- `GET /api/payouts/beneficiaries` - Still works

## Notes

- The changes maintain backward compatibility - existing beneficiaries with `identity_id` will continue to work
- The Bread API now accepts beneficiary creation without `identity_id`
- Wallet creation was removed as it's no longer needed without identity/KYC
- KYC routes (`/api/kyc/*`) remain available but are no longer required for offramp functionality

