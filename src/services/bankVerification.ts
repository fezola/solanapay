import { supabase } from './supabase';
import { NIGERIAN_BANKS, getBankByCode, type NigerianBank } from '../data/nigerianBanks';
import { toast } from 'sonner';

/**
 * Bank Verification Service
 * Handles bank account verification using Paystack API
 */

export interface BankVerificationResult {
  accountNumber: string;
  accountName: string;
  bankCode: string;
  bankName: string;
}

export interface BankListItem {
  name: string;
  code: string;
  slug: string;
  logo: string;
}

class BankVerificationService {
  private apiBaseUrl: string;

  constructor() {
    // Use environment variable or default to localhost for development
    this.apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
  }

  /**
   * Get list of all Nigerian banks
   * First tries to fetch from backend (Paystack), falls back to local data
   */
  async getBanks(): Promise<BankListItem[]> {
    try {
      // Get current session for auth token
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        // No session, use local data (silent fallback)
        return NIGERIAN_BANKS;
      }

      // Fetch from backend (Paystack API)
      const response = await fetch(`${this.apiBaseUrl}/api/payouts/banks`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        // API not available, use local data (silent fallback)
        return NIGERIAN_BANKS;
      }

      const data = await response.json();

      // Merge with local data to add logos
      const banksWithLogos = data.banks.map((bank: any) => {
        const localBank = getBankByCode(bank.code);
        return {
          name: bank.name,
          code: bank.code,
          slug: bank.slug,
          logo: localBank?.logo || `https://logo.clearbit.com/${bank.slug}.com`,
        };
      });

      // Deduplicate by bank code (in case of duplicates from API)
      const uniqueBanks = Array.from(
        new Map(banksWithLogos.map(bank => [bank.code, bank])).values()
      );

      return uniqueBanks;
    } catch (error) {
      // Silent fallback to local data (no console error)
      return NIGERIAN_BANKS;
    }
  }

  /**
   * Verify bank account using Paystack
   * Returns account name if verification is successful
   */
  async verifyAccount(
    bankCode: string,
    accountNumber: string
  ): Promise<BankVerificationResult> {
    try {
      // Validate inputs
      if (!bankCode || !accountNumber) {
        throw new Error('Bank code and account number are required');
      }

      if (accountNumber.length !== 10) {
        throw new Error('Account number must be 10 digits');
      }

      // Get current session for auth token
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('You must be logged in to verify bank accounts');
      }

      // Call backend API to verify account
      const response = await fetch(`${this.apiBaseUrl}/api/payouts/verify-account`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bank_code: bankCode,
          account_number: accountNumber,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to verify account');
      }

      const data = await response.json();

      // Get bank details
      const bank = getBankByCode(bankCode);

      return {
        accountNumber: data.account_number,
        accountName: data.account_name,
        bankCode: bankCode,
        bankName: bank?.name || data.bank_name || 'Unknown Bank',
      };
    } catch (error: any) {
      console.error('Bank verification error:', error);
      throw new Error(error.message || 'Failed to verify bank account');
    }
  }

  /**
   * Add verified bank account to user's profile
   */
  async addBankAccount(
    userId: string,
    bankCode: string,
    accountNumber: string,
    accountName: string
  ): Promise<any> {
    try {
      const bank = getBankByCode(bankCode);

      const { data, error } = await supabase
        .from('bank_accounts')
        .insert({
          user_id: userId,
          bank_code: bankCode,
          bank_name: bank?.name || 'Unknown Bank',
          account_number: accountNumber,
          account_name: accountName,
          is_verified: true,
          verified_at: new Date().toISOString(),
          is_default: false,
        })
        .select()
        .single();

      if (error) {
        console.error('Error adding bank account:', error);
        throw new Error('Failed to add bank account');
      }

      return data;
    } catch (error: any) {
      console.error('Error adding bank account:', error);
      throw new Error(error.message || 'Failed to add bank account');
    }
  }

  /**
   * Get user's bank accounts
   */
  async getUserBankAccounts(userId: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('bank_accounts')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching bank accounts:', error);
        throw new Error('Failed to fetch bank accounts');
      }

      return data || [];
    } catch (error: any) {
      console.error('Error fetching bank accounts:', error);
      throw new Error(error.message || 'Failed to fetch bank accounts');
    }
  }

  /**
   * Delete bank account
   */
  async deleteBankAccount(accountId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('bank_accounts')
        .delete()
        .eq('id', accountId);

      if (error) {
        console.error('Error deleting bank account:', error);
        throw new Error('Failed to delete bank account');
      }
    } catch (error: any) {
      console.error('Error deleting bank account:', error);
      throw new Error(error.message || 'Failed to delete bank account');
    }
  }

  /**
   * Set default bank account
   */
  async setDefaultBankAccount(userId: string, accountId: string): Promise<void> {
    try {
      // First, unset all default accounts
      await supabase
        .from('bank_accounts')
        .update({ is_default: false })
        .eq('user_id', userId);

      // Then set the selected account as default
      const { error } = await supabase
        .from('bank_accounts')
        .update({ is_default: true })
        .eq('id', accountId);

      if (error) {
        console.error('Error setting default bank account:', error);
        throw new Error('Failed to set default bank account');
      }
    } catch (error: any) {
      console.error('Error setting default bank account:', error);
      throw new Error(error.message || 'Failed to set default bank account');
    }
  }
}

export const bankVerificationService = new BankVerificationService();

