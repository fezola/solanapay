export type Chain = 'solana' | 'base' | 'ethereum' | 'polygon' | 'arbitrum' | 'optimism' | 'bsc' | 'tron';
export type Asset = 'USDC' | 'SOL' | 'USDT' | 'ETH' | 'MATIC';
export type Network = 'mainnet' | 'testnet' | 'devnet';

export type KYCTier = 0 | 1 | 2;
export type KYCStatus = 'not_started' | 'pending' | 'approved' | 'rejected';

export type TransactionStatus = 
  | 'pending' 
  | 'confirming' 
  | 'quoting' 
  | 'converting' 
  | 'payout_pending' 
  | 'completed' 
  | 'failed';

export type PayoutStatus = 
  | 'pending' 
  | 'processing' 
  | 'success' 
  | 'failed' 
  | 'reversed';

export interface User {
  id: string;
  email: string;
  phone: string | null;
  kyc_tier: KYCTier;
  kyc_status: KYCStatus;
  risk_score: number;
  status: 'active' | 'suspended' | 'banned';
  created_at: string;
  updated_at: string;
}

export interface DepositAddress {
  id: string;
  user_id: string;
  chain: Chain;
  asset: Asset;
  address: string;
  derivation_path: string;
  created_at: string;
  disabled_at: string | null;
}

export interface OnchainDeposit {
  id: string;
  user_id: string;
  deposit_address_id: string;
  chain: Chain;
  asset: Asset;
  address: string;
  tx_hash: string;
  amount: string;
  confirmations: number;
  required_confirmations: number;
  detected_at: string;
  confirmed_at: string | null;
  swept_at: string | null;
  status: 'detected' | 'confirming' | 'confirmed' | 'swept' | 'failed';
  from_address: string | null;
  block_number: number | null;
}

export interface Quote {
  id: string;
  user_id: string;
  asset: Asset;
  chain: Chain;
  crypto_amount: string;
  spot_price: string;
  fx_rate: string;
  spread_bps: number;
  flat_fee: string;
  variable_fee_bps: number;
  total_fee: string;
  fiat_amount: string;
  currency: string;
  lock_expires_at: string;
  status: 'active' | 'locked' | 'expired' | 'executed' | 'cancelled';
  created_at: string;
  executed_at: string | null;
}

export interface PayoutBeneficiary {
  id: string;
  user_id: string;
  bank_code: string;
  bank_name: string;
  account_number: string;
  account_name: string;
  verified_at: string | null;
  is_default: boolean;
  created_at: string;
  bread_beneficiary_id?: string | null;
  bread_synced_at?: string | null;
}

export interface Payout {
  id: string;
  user_id: string;
  quote_id: string;
  beneficiary_id: string;
  fiat_amount: string;
  currency: string;
  provider: 'paystack' | 'flutterwave';
  provider_reference: string | null;
  status: PayoutStatus;
  error_code: string | null;
  error_message: string | null;
  created_at: string;
  completed_at: string | null;
}

export interface Limit {
  id: string;
  user_id: string;
  period: 'daily' | 'weekly' | 'monthly';
  asset: Asset | 'ALL';
  max_amount: string;
  used_amount: string;
  resets_at: string;
  created_at: string;
  updated_at: string;
}

export interface RiskEvent {
  id: string;
  user_id: string;
  type: string;
  weight: number;
  reason_code: string;
  context: Record<string, any>;
  created_at: string;
}

export interface AuditLog {
  id: string;
  actor_id: string | null;
  actor_type: 'user' | 'admin' | 'system';
  action: string;
  entity_type: string;
  entity_id: string;
  payload: Record<string, any>;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export interface KYCVerification {
  id: string;
  user_id: string;
  provider: string;
  level: KYCTier;
  status: KYCStatus;
  bvn: string | null;
  nin: string | null;
  document_type: string | null;
  document_number: string | null;
  document_url: string | null;
  selfie_url: string | null;
  address_proof_url: string | null;
  result_json: Record<string, any> | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
  verified_at: string | null;
}

export interface TreasuryWallet {
  id: string;
  chain: Chain;
  asset: Asset;
  hot_address: string;
  cold_address: string | null;
  balance: string;
  last_sweep_at: string | null;
  created_at: string;
}

// API Request/Response Types
export interface CreateQuoteRequest {
  asset: Asset;
  chain: Chain;
  crypto_amount?: string;
  fiat_target?: string;
}

export interface CreateQuoteResponse {
  quote: Quote;
  expires_in_seconds: number;
}

export interface ConfirmQuoteRequest {
  beneficiary_id: string;
}

export interface CreateBeneficiaryRequest {
  bank_code: string;
  account_number: string;
}

export interface CreateBeneficiaryResponse {
  beneficiary: PayoutBeneficiary;
}

export interface GetDepositAddressesResponse {
  addresses: Array<{
    chain: Chain;
    asset: Asset;
    address: string;
    qr_code?: string;
  }>;
}

export interface TransactionHistoryItem {
  id: string;
  type: 'deposit' | 'offramp';
  asset: Asset;
  chain: Chain;
  amount: string;
  fiat_amount?: string;
  status: TransactionStatus;
  created_at: string;
  tx_hash?: string;
}

