/**
 * Bread Africa API Types
 * Based on https://docs.bread.africa
 */

// ============================================================================
// Core Entities
// ============================================================================

export interface BreadIdentity {
  id: string;
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
  status: 'pending' | 'verified' | 'rejected';
  createdAt: string;
  updatedAt: string;
}

export interface BreadBeneficiary {
  id: string;
  identityId: string;
  bankCode: string;
  accountNumber: string;
  accountName: string;
  currency: string;
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
}

export type BreadWalletType = 'offramp' | 'basic';
export type BreadNetwork = 'evm' | 'svm';
export type BreadChain = 'ethereum' | 'base' | 'solana' | 'polygon' | 'arbitrum' | 'optimism';

export interface BreadWallet {
  id: string;
  identityId: string;
  type: BreadWalletType;
  network: BreadNetwork;
  chain: BreadChain;
  address: string;
  beneficiaryId?: string; // For offramp wallets
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
}

export type BreadOfframpStatus = 
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface BreadOfframp {
  id: string;
  identityId: string;
  walletId: string;
  beneficiaryId: string;
  cryptoAsset: string;
  cryptoAmount: string;
  fiatCurrency: string;
  fiatAmount: string;
  exchangeRate: string;
  fee: string;
  status: BreadOfframpStatus;
  txHash?: string;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export interface BreadRate {
  cryptoAsset: string;
  fiatCurrency: string;
  rate: string;
  timestamp: string;
}

// ============================================================================
// API Request/Response Types
// ============================================================================

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

