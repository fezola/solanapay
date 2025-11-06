/**
 * Shared TypeScript types for the SolPay application
 */

export interface BankAccount {
  id: string;
  bankName: string;
  bankCode: string;
  accountNumber: string;
  accountName: string;
  isVerified?: boolean;
  logo?: string;
}

export interface Transaction {
  id: string;
  type: 'deposit' | 'offramp';
  crypto?: string;
  amount: number;
  nairaAmount?: number;
  status: 'pending' | 'confirming' | 'quoting' | 'converting' | 'payout_pending' | 'completed' | 'failed';
  date: string;
  bankAccountId?: string;
  network?: string;
  hash?: string;
}

export interface DepositAddress {
  id: string;
  asset: string;
  network: string;
  address: string;
  qrCode?: string;
}

export interface User {
  id: string;
  email: string;
  full_name?: string;
  phone_number?: string;
  kyc_tier: number;
  kyc_status: 'pending' | 'verified' | 'rejected';
  is_active: boolean;
  created_at: string;
}

