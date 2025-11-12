import { createClient } from '@supabase/supabase-js';
import { toast } from 'sonner';

// Supabase configuration
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ============================================================================
// TYPES
// ============================================================================

export interface User {
  id: string;
  email: string;
  full_name?: string;
  phone_number?: string;
  transaction_pin?: string; // Encrypted PIN for transaction security
  pin_set: boolean; // Whether user has set up PIN
  kyc_tier: number;
  kyc_status: 'not_started' | 'pending' | 'approved' | 'rejected';
  bvn?: string;
  bvn_verified: boolean;
  document_type?: 'nin' | 'passport' | 'drivers_license';
  document_number?: string;
  document_verified: boolean;
  selfie_verified: boolean;
  address_verified: boolean;
  kyc_submitted_at?: string;
  kyc_approved_at?: string;
  last_login_at?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface BankAccount {
  id: string;
  user_id: string;
  bank_name: string;
  bank_code: string;
  account_number: string;
  account_name: string;
  is_verified: boolean;
  verified_at?: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  type: 'deposit' | 'offramp' | 'withdrawal';
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  crypto_asset: string;
  crypto_network: string;
  crypto_amount: number;
  crypto_address?: string;
  blockchain_tx_hash?: string;
  blockchain_confirmations: number;
  required_confirmations: number;
  fiat_currency: string;
  fiat_amount?: number;
  exchange_rate?: number;
  fee_amount: number;
  fee_currency: string;
  spread_bps: number;
  bank_account_id?: string;
  payout_reference?: string;
  payout_status?: 'pending' | 'processing' | 'paid' | 'failed';
  payout_completed_at?: string;
  quote_id?: string;
  quote_locked_until?: string;
  created_at: string;
  updated_at: string;
  completed_at?: string;
  metadata?: Record<string, any>;
  error_message?: string;
}

export interface DepositAddress {
  id: string;
  user_id: string;
  asset_symbol: 'USDC' | 'USDT' | 'SOL' | 'ETH';
  network: 'solana' | 'base' | 'ethereum';
  address: string;
  derivation_path: string;
  created_at: string;
  last_used_at?: string;
}

// ============================================================================
// AUTHENTICATION
// ============================================================================

export const authService = {
  // Sign up new user
  async signUp(email: string, password: string, fullName?: string, referralCode?: string) {
    try {
      // Call backend API instead of Supabase directly
      // This ensures referral codes are created properly
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/auth/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
          name: fullName,
          referralCode: referralCode,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Signup failed');
      }

      const data = await response.json();

      // Set the session in Supabase client
      if (data.session) {
        await supabase.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        });
      }

      toast.success('Account created successfully!');
      return { user: data.user, session: data.session };
    } catch (error: any) {
      toast.error(error.message || 'Failed to create account');
      throw error;
    }
  },

  // Sign in existing user
  async signIn(email: string, password: string) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // Update last login
      await supabase
        .from('users')
        .update({ last_login_at: new Date().toISOString() })
        .eq('id', data.user.id);

      toast.success('Welcome back!');
      return data;
    } catch (error: any) {
      toast.error(error.message || 'Failed to sign in');
      throw error;
    }
  },

  // Sign out
  async signOut() {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      toast.success('Signed out successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to sign out');
      throw error;
    }
  },

  // Get current user
  async getCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  },

  // Get current session
  async getSession() {
    const { data: { session } } = await supabase.auth.getSession();
    return session;
  },
};

// ============================================================================
// USER PROFILE
// ============================================================================

export const userService = {
  // Get user profile
  async getProfile(userId: string): Promise<User | null> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching profile:', error);
      return null;
    }

    return data;
  },

  // Update user profile
  async updateProfile(userId: string, updates: Partial<User>) {
    try {
      const { error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', userId);

      if (error) throw error;
      toast.success('Profile updated successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to update profile');
      throw error;
    }
  },

  // Submit KYC data
  async submitKYC(userId: string, kycData: {
    bvn?: string;
    document_type?: 'nin' | 'passport' | 'drivers_license';
    document_number?: string;
    full_name?: string;
    phone_number?: string;
  }) {
    try {
      const { error } = await supabase
        .from('users')
        .update({
          ...kycData,
          kyc_status: 'pending',
          kyc_submitted_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (error) throw error;
      toast.success('KYC submitted for review');
    } catch (error: any) {
      toast.error(error.message || 'Failed to submit KYC');
      throw error;
    }
  },

  // Set transaction PIN
  async setTransactionPIN(userId: string, pin: string) {
    try {
      // In production, this should be hashed on the backend
      // For now, we'll use a simple encryption (NOT SECURE FOR PRODUCTION)
      const encryptedPin = btoa(pin); // Base64 encoding (replace with proper encryption)

      const { error } = await supabase
        .from('users')
        .update({
          transaction_pin: encryptedPin,
          pin_set: true,
        })
        .eq('id', userId);

      if (error) throw error;
      toast.success('Transaction PIN set successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to set PIN');
      throw error;
    }
  },

  // Verify transaction PIN
  async verifyTransactionPIN(userId: string, pin: string): Promise<boolean> {
    try {
      const profile = await this.getProfile(userId);
      if (!profile || !profile.transaction_pin) {
        return false;
      }

      // Decrypt and compare
      const decryptedPin = atob(profile.transaction_pin);
      return decryptedPin === pin;
    } catch (error: any) {
      console.error('Error verifying PIN:', error);
      return false;
    }
  },

  // Check if user has set PIN
  async hasPIN(userId: string): Promise<boolean> {
    const profile = await this.getProfile(userId);
    return profile?.pin_set || false;
  },
};

// ============================================================================
// BANK ACCOUNTS
// ============================================================================

export const bankAccountService = {
  // Get all bank accounts for user
  async getBankAccounts(userId: string): Promise<BankAccount[]> {
    const { data, error } = await supabase
      .from('bank_accounts')
      .select('*')
      .eq('user_id', userId)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching bank accounts:', error);
      return [];
    }

    return data || [];
  },

  // Add new bank account
  async addBankAccount(userId: string, account: {
    bank_name: string;
    bank_code: string;
    account_number: string;
    account_name: string;
  }) {
    try {
      const { data, error } = await supabase
        .from('bank_accounts')
        .insert({
          user_id: userId,
          ...account,
          is_verified: false,
          is_default: false,
        })
        .select()
        .single();

      if (error) throw error;
      toast.success('Bank account added successfully');
      return data;
    } catch (error: any) {
      toast.error(error.message || 'Failed to add bank account');
      throw error;
    }
  },

  // Delete bank account
  async deleteBankAccount(accountId: string) {
    try {
      const { error } = await supabase
        .from('bank_accounts')
        .delete()
        .eq('id', accountId);

      if (error) throw error;
      toast.success('Bank account deleted');
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete bank account');
      throw error;
    }
  },

  // Set default bank account
  async setDefaultAccount(userId: string, accountId: string) {
    try {
      // First, unset all defaults
      await supabase
        .from('bank_accounts')
        .update({ is_default: false })
        .eq('user_id', userId);

      // Then set the new default
      const { error } = await supabase
        .from('bank_accounts')
        .update({ is_default: true })
        .eq('id', accountId);

      if (error) throw error;
      toast.success('Default account updated');
    } catch (error: any) {
      toast.error(error.message || 'Failed to update default account');
      throw error;
    }
  },
};

// ============================================================================
// TRANSACTIONS
// ============================================================================

export const transactionService = {
  // Get all transactions for user
  async getTransactions(userId: string): Promise<Transaction[]> {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching transactions:', error);
      return [];
    }

    return data || [];
  },

  // Get single transaction
  async getTransaction(transactionId: string): Promise<Transaction | null> {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('id', transactionId)
      .single();

    if (error) {
      console.error('Error fetching transaction:', error);
      return null;
    }

    return data;
  },
};

// ============================================================================
// DEPOSIT ADDRESSES
// ============================================================================

export const depositAddressService = {
  // Get all deposit addresses for user
  async getDepositAddresses(userId: string): Promise<DepositAddress[]> {
    const { data, error } = await supabase
      .from('deposit_addresses')
      .select('id, user_id, asset_symbol, network, address, derivation_path, created_at, last_used_at')
      .eq('user_id', userId);

    if (error) {
      console.error('Error fetching deposit addresses:', error);
      return [];
    }

    return data || [];
  },

  // Get deposit address for specific asset and network
  async getDepositAddress(userId: string, asset: string, network: string): Promise<DepositAddress | null> {
    const { data, error } = await supabase
      .from('deposit_addresses')
      .select('id, user_id, asset_symbol, network, address, derivation_path, created_at, last_used_at')
      .eq('user_id', userId)
      .eq('asset_symbol', asset)
      .eq('network', network)
      .single();

    if (error) {
      console.error('Error fetching deposit address:', error);
      return null;
    }

    return data;
  },
};

// ============================================================================
// REALTIME SUBSCRIPTIONS
// ============================================================================

export const realtimeService = {
  // Subscribe to transaction updates
  subscribeToTransactions(userId: string, callback: (transaction: Transaction) => void) {
    const channel = supabase
      .channel('transactions')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'transactions',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          callback(payload.new as Transaction);
        }
      )
      .subscribe();

    return channel;
  },

  // Subscribe to user profile updates
  subscribeToProfile(userId: string, callback: (user: User) => void) {
    const channel = supabase
      .channel('user_profile')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'users',
          filter: `id=eq.${userId}`,
        },
        (payload) => {
          callback(payload.new as User);
        }
      )
      .subscribe();

    return channel;
  },

  // Unsubscribe from channel
  unsubscribe(channel: any) {
    supabase.removeChannel(channel);
  },
};

