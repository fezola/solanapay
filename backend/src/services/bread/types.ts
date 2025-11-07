/**
 * Bread Africa API Types
 * Based on actual API at https://processor-prod.up.railway.app
 */

// ============================================================================
// Asset Types
// ============================================================================

export type BreadAsset =
  | 'base:usdc'
  | 'solana:usdc'
  | 'ethereum:usdc'
  | 'arbitrum:usdc'
  | 'polygon:usdc'
  | 'optimism:usdc'
  | 'bsc:usdc'
  | 'base:usdt'
  | 'solana:usdt'
  | 'ethereum:usdt'
  | 'arbitrum:usdt'
  | 'polygon:usdt'
  | 'optimism:usdt'
  | 'bsc:usdt'
  | 'base:cngn'
  | 'bsc:cngn';

export interface BreadAssetInfo {
  id: BreadAsset;
  name: string;
  code: string;
  address: string;
  icon: string;
  blockchain: {
    id: number;
    name: string;
    icon: string;
  };
}

export interface BreadBank {
  name: string;
  code: string;
  icon: string;
}

// ============================================================================
// API Response Wrapper
// ============================================================================

export interface BreadAPIResponse<T> {
  success: boolean;
  status: number;
  message: string;
  timestamp: string;
  data: T;
}

// ============================================================================
// Offramp Quote Types
// ============================================================================

export interface OfframpQuoteRequest {
  amount: number; // Amount in crypto or fiat depending on is_exact_output
  currency: 'NGN'; // Target fiat currency
  asset: BreadAsset; // Crypto asset to convert from
  is_exact_output: boolean; // If true, amount is in fiat; if false, amount is in crypto
}

export interface OfframpQuoteData {
  type: 'offramp';
  fee: number; // Fee in fiat currency
  expiry: string; // ISO timestamp when quote expires
  currency: 'NGN';
  rate: number; // Exchange rate (fiat per crypto)
  input_amount: number; // Input amount (crypto if is_exact_output=false, fiat if true)
  output_amount: number; // Output amount in fiat currency
}

export type OfframpQuoteResponse = BreadAPIResponse<OfframpQuoteData>;

// ============================================================================
// Offramp Rate Types
// ============================================================================

export interface OfframpRateRequest {
  currency: 'NGN';
  asset: BreadAsset;
}

export interface OfframpRateData {
  rate: number; // Exchange rate (fiat per crypto)
}

export type OfframpRateResponse = BreadAPIResponse<OfframpRateData>;

// ============================================================================
// Assets List Types
// ============================================================================

export type AssetsListResponse = BreadAPIResponse<BreadAssetInfo[]>;

// ============================================================================
// Banks List Types
// ============================================================================

export interface BanksListRequest {
  currency: 'NGN';
}

export type BanksListResponse = BreadAPIResponse<BreadBank[]>;

// ============================================================================
// Offramp Execution Types (TODO: Update when we get actual API docs)
// ============================================================================

export interface ExecuteOfframpRequest {
  asset: BreadAsset;
  amount: number;
  currency: 'NGN';
  bank_code: string;
  account_number: string;
  // Add more fields as needed based on actual API
}

export interface ExecuteOfframpData {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  amount: number;
  currency: string;
  asset: BreadAsset;
  tx_hash?: string;
  created_at: string;
  // Add more fields as needed based on actual API
}

export type ExecuteOfframpResponse = BreadAPIResponse<ExecuteOfframpData>;

// ============================================================================
// Offramp Status Types
// ============================================================================

export interface OfframpStatusData {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  amount: number;
  currency: string;
  asset: BreadAsset;
  tx_hash?: string;
  created_at: string;
  updated_at: string;
  completed_at?: string;
  // Add more fields as needed based on actual API
}

export type OfframpStatusResponse = BreadAPIResponse<OfframpStatusData>;

// ============================================================================
// Legacy Types (kept for backward compatibility, will be removed)
// ============================================================================

export type BreadWalletType = 'onramp' | 'offramp' | 'basic';
export type BreadNetwork = 'svm' | 'evm' | 'solana' | 'base' | 'ethereum' | 'polygon';
export type BreadChain = 'mainnet' | 'testnet' | 'devnet' | 'solana' | 'base' | 'ethereum';

export interface BreadIdentity {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  status: 'pending' | 'verified' | 'rejected';
  createdAt: string;
}

export interface BreadBeneficiary {
  id: string;
  identityId: string;
  bankCode: string;
  accountNumber: string;
  accountName?: string;
  currency: string;
  createdAt: string;
}

export interface BreadWallet {
  id: string;
  identityId: string;
  type: BreadWalletType;
  network: BreadNetwork;
  chain: BreadChain;
  address: string;
  beneficiaryId?: string;
  status?: 'active' | 'disabled';
  createdAt: string;
}

export interface BreadRate {
  cryptoAsset: string;
  fiatCurrency: string;
  rate: number;
  timestamp: string;
}

export interface BreadOfframp {
  id: string;
  walletId: string;
  beneficiaryId: string;
  cryptoAmount: string;
  fiatAmount: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  txHash?: string;
  errorMessage?: string;
  createdAt: string;
  completedAt?: string;
}

export interface CreateIdentityRequest {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  dateOfBirth?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    country: string;
    postalCode?: string;
  };
}

export interface CreateIdentityResponse {
  identity: BreadIdentity;
}

export interface CreateBeneficiaryRequest {
  identityId: string;
  bankCode: string;
  accountNumber: string;
  currency?: string; // Defaults to NGN
}

export interface CreateBeneficiaryResponse {
  beneficiary: BreadBeneficiary;
}

export interface CreateWalletRequest {
  identityId: string;
  type: BreadWalletType;
  network: BreadNetwork;
  chain: BreadChain;
  beneficiaryId?: string; // Required for offramp wallets
}

export interface CreateWalletResponse {
  wallet: BreadWallet;
}

export interface GetRateRequest {
  cryptoAsset: string;
  fiatCurrency: string;
  cryptoAmount?: string;
  fiatAmount?: string;
}

export interface GetRateResponse {
  rate: BreadRate;
  cryptoAmount?: string;
  fiatAmount?: string;
  fee?: string;
}

export interface CreateOfframpRequest {
  walletId: string;
  beneficiaryId: string;
  cryptoAmount: string;
}

export interface CreateOfframpResponse {
  offramp: BreadOfframp;
}

export interface ListWalletsResponse {
  wallets: BreadWallet[];
}

export interface ListBeneficiariesResponse {
  beneficiaries: BreadBeneficiary[];
}

export interface ListOfframpsResponse {
  offramps: BreadOfframp[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
  };
}

// ============================================================================
// Webhook Types
// ============================================================================

export type BreadWebhookEvent = 
  | 'offramp.created'
  | 'offramp.processing'
  | 'offramp.completed'
  | 'offramp.failed'
  | 'wallet.deposit'
  | 'identity.verified'
  | 'identity.rejected';

export interface BreadWebhookPayload {
  event: BreadWebhookEvent;
  data: BreadOfframp | BreadWallet | BreadIdentity;
  timestamp: string;
  signature?: string;
}

// ============================================================================
// Error Types
// ============================================================================

export interface BreadErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Record<string, any>;
  };
}

export class BreadAPIError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number,
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = 'BreadAPIError';
  }
}

// ============================================================================
// Configuration
// ============================================================================

export interface BreadConfig {
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
  retries?: number;
}

