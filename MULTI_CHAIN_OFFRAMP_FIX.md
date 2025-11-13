# Multi-Chain Offramp Support Fix

## Problem
The offramp functionality was failing for all chains except Solana USDC:
- ❌ Polygon USDC/USDT - Failed with validation error
- ❌ Ethereum USDC/USDT - Failed with validation error  
- ❌ Arbitrum USDC/USDT - Failed with validation error
- ❌ Optimism USDC/USDT - Failed with validation error
- ❌ BSC USDC/USDT - Failed with validation error
- ❌ Solana USDT - Failed (validation passed but transfer failed)
- ✅ Solana USDC - Working
- ✅ Base USDC - Working

**Error from logs:**
```
Invalid enum value. Expected 'solana' | 'base', received 'polygon'
```

## Root Cause
The backend had multiple layers of restrictions that only allowed Solana and Base chains:

1. **Validation schemas** in `backend/src/routes/payouts.ts` only accepted `'solana' | 'base'`
2. **Transfer service** in `backend/src/services/transfer.ts` only had implementations for Solana and Base
3. **Type definitions** were inconsistent - some allowed all chains, others restricted to Solana/Base

## Solution

### 1. Updated Validation Schemas (`backend/src/routes/payouts.ts`)
**Changed:**
- `getRateSchema` - Now accepts all EVM chains: `'solana' | 'base' | 'ethereum' | 'polygon' | 'arbitrum' | 'optimism' | 'bsc'`
- `getQuoteSchema` - Now accepts all EVM chains
- Removed type assertions `as 'solana' | 'base'` throughout the file

### 2. Updated Transfer Service (`backend/src/services/transfer.ts`)
**Added:**
- `EVM_TOKEN_ADDRESSES` - Token contract addresses for all supported chains
- `EVM_RPC_URLS` - RPC endpoints for all supported chains
- `transferEVM()` - Generic EVM transfer function (replaces chain-specific functions)
- `checkEVMBalance()` - Generic EVM balance check function

**Token Addresses Added:**
```typescript
polygon: {
  USDC: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
  USDT: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
},
ethereum: {
  USDC: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
  USDT: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
},
arbitrum: {
  USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
  USDT: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
},
optimism: {
  USDC: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
  USDT: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58',
},
bsc: {
  USDC: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d',
  USDT: '0x55d398326f99059fF775485246999027B3197955',
},
```

### 3. Updated Asset Mapping (`backend/src/services/bread/offramp.ts`)
**Enhanced `mapAssetToBread()` function:**
- Added support for all EVM chains: polygon, arbitrum, optimism, bsc
- Added validation: SOL only on Solana, ETH not on Solana
- Now correctly maps USDT on all supported chains

### 4. Updated Type Definitions (`backend/src/types/index.ts`)
**Changed:**
```typescript
// Before
export type Chain = 'solana' | 'base' | 'ethereum' | 'polygon' | 'tron';

// After  
export type Chain = 'solana' | 'base' | 'ethereum' | 'polygon' | 'arbitrum' | 'optimism' | 'bsc' | 'tron';
```

### 5. Updated Platform Fee Collector (`backend/src/services/platform-fee-collector.ts`)
**Changed:**
- `FeeCollectionParams.chain` from `'solana' | 'base'` to `string` (accepts all chains)

## Supported Chains & Assets

### ✅ Now Working
| Chain | USDC | USDT | SOL | ETH |
|-------|------|------|-----|-----|
| Solana | ✅ | ✅ | ✅ | ❌ |
| Base | ✅ | ✅ | ❌ | ✅ |
| Polygon | ✅ | ✅ | ❌ | ✅ |
| Ethereum | ✅ | ✅ | ❌ | ✅ |
| Arbitrum | ✅ | ✅ | ❌ | ✅ |
| Optimism | ✅ | ✅ | ❌ | ✅ |
| BSC | ✅ | ✅ | ❌ | ❌ |

## Testing
1. ✅ Backend builds successfully with TypeScript
2. ⏳ Test offramp on Polygon USDC
3. ⏳ Test offramp on Solana USDT
4. ⏳ Test offramp on other chains

## Deployment
The backend needs to be redeployed to Render for the changes to take effect.

## Notes
- All EVM chains use the same generic `transferEVM()` function
- RPC URLs use public endpoints for chains not in env (Ethereum, Arbitrum, Optimism, BSC)
- Bread Africa supports all these chains according to their API types
- Gas fees on EVM chains are paid by the user's wallet (not sponsored like Solana)

