/**
 * API Client for Crypto Off-Ramp Backend
 * 
 * This service connects the frontend to the backend API.
 * All API calls go through this centralized client.
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Get auth token from localStorage
 */
function getAuthToken(): string | null {
  return localStorage.getItem('auth_token');
}

/**
 * Set auth token in localStorage
 */
function setAuthToken(token: string) {
  localStorage.setItem('auth_token', token);
}

/**
 * Clear auth token from localStorage
 */
function clearAuthToken() {
  localStorage.removeItem('auth_token');
}

/**
 * Make authenticated API request
 */
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getAuthToken();
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new ApiError(response.status, error.error || error.message || 'Request failed');
  }

  return response.json();
}

// ============================================================================
// AUTH API
// ============================================================================

export const authApi = {
  /**
   * Sign up with email and password
   */
  async signup(email: string, password: string, name?: string) {
    const response = await apiRequest<{ user: any; session: any }>('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    });
    
    if (response.session?.access_token) {
      setAuthToken(response.session.access_token);
    }
    
    return response;
  },

  /**
   * Login with email and password
   */
  async login(email: string, password: string) {
    const response = await apiRequest<{ user: any; session: any }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    
    if (response.session?.access_token) {
      setAuthToken(response.session.access_token);
    }
    
    return response;
  },

  /**
   * Request OTP for passwordless login
   */
  async requestOTP(email: string) {
    return apiRequest<{ message: string }>('/api/auth/otp/request', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  /**
   * Verify OTP
   */
  async verifyOTP(email: string, token: string) {
    const response = await apiRequest<{ user: any; session: any }>('/api/auth/otp/verify', {
      method: 'POST',
      body: JSON.stringify({ email, token }),
    });
    
    if (response.session?.access_token) {
      setAuthToken(response.session.access_token);
    }
    
    return response;
  },

  /**
   * Logout
   */
  async logout() {
    try {
      await apiRequest('/api/auth/logout', { method: 'POST' });
    } finally {
      clearAuthToken();
    }
  },
};

// ============================================================================
// DEPOSITS API
// ============================================================================

export const depositsApi = {
  /**
   * Get user's deposit addresses
   */
  async getAddresses() {
    return apiRequest<{ addresses: Array<{ chain: string; asset: string; address: string }> }>(
      '/api/deposits/addresses'
    );
  },

  /**
   * Get deposit history
   */
  async getHistory() {
    return apiRequest<{ deposits: any[] }>('/api/deposits/history');
  },

  /**
   * Get balances for all assets
   */
  async getBalances() {
    return apiRequest<{ balances: Record<string, number> }>('/api/deposits/balances');
  },

  /**
   * Get specific deposit details
   */
  async getDeposit(id: string) {
    return apiRequest<{ deposit: any }>(`/api/deposits/deposits/${id}`);
  },
};

// ============================================================================
// QUOTES API
// ============================================================================

export const quotesApi = {
  /**
   * Create a new quote
   */
  async createQuote(params: {
    asset: string;
    chain: string;
    crypto_amount?: number;
    fiat_target?: number;
    currency?: string;
  }) {
    return apiRequest<{ quote: any; breakdown: any; expires_in_seconds: number }>(
      '/api/quotes',
      {
        method: 'POST',
        body: JSON.stringify(params),
      }
    );
  },

  /**
   * Get quote by ID
   */
  async getQuote(id: string) {
    return apiRequest<{ quote: any }>(`/api/quotes/${id}`);
  },

  /**
   * Get quote history
   */
  async getHistory(status?: string, limit?: number) {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (limit) params.append('limit', limit.toString());
    
    return apiRequest<{ quotes: any[] }>(`/api/quotes?${params}`);
  },

  /**
   * Cancel a quote
   */
  async cancelQuote(id: string) {
    return apiRequest<{ message: string }>(`/api/quotes/${id}/cancel`, {
      method: 'POST',
    });
  },

  /**
   * Validate quote is still valid
   */
  async validateQuote(id: string) {
    return apiRequest<{ valid: boolean; reason?: string; expires_in_seconds?: number }>(
      `/api/quotes/${id}/validate`,
      { method: 'POST' }
    );
  },
};

// ============================================================================
// PAYOUTS API
// ============================================================================

export const payoutsApi = {
  /**
   * Get list of Nigerian banks
   */
  async getBanks() {
    return apiRequest<{ banks: Array<{ name: string; code: string; slug: string }> }>(
      '/api/payouts/banks'
    );
  },

  /**
   * Add and verify bank account beneficiary
   */
  async addBeneficiary(bankCode: string, accountNumber: string) {
    return apiRequest<{ beneficiary: any }>('/api/payouts/beneficiaries', {
      method: 'POST',
      body: JSON.stringify({ bank_code: bankCode, account_number: accountNumber }),
    });
  },

  /**
   * Get user's beneficiaries
   */
  async getBeneficiaries() {
    return apiRequest<{ beneficiaries: any[] }>('/api/payouts/beneficiaries');
  },

  /**
   * Delete beneficiary
   */
  async deleteBeneficiary(id: string) {
    return apiRequest<{ message: string }>(`/api/payouts/beneficiaries/${id}`, {
      method: 'DELETE',
    });
  },

  /**
   * Confirm quote and execute payout
   */
  async confirmPayout(quoteId: string, beneficiaryId: string) {
    return apiRequest<{ payout: any; transfer: any }>('/api/payouts/confirm', {
      method: 'POST',
      body: JSON.stringify({ quote_id: quoteId, beneficiary_id: beneficiaryId }),
    });
  },

  /**
   * Get payout history
   */
  async getHistory(limit?: number) {
    const params = limit ? `?limit=${limit}` : '';
    return apiRequest<{ payouts: any[] }>(`/api/payouts${params}`);
  },

  /**
   * Get specific payout
   */
  async getPayout(id: string) {
    return apiRequest<{ payout: any }>(`/api/payouts/${id}`);
  },
};

// ============================================================================
// KYC API
// ============================================================================

export const kycApi = {
  /**
   * Get KYC status
   */
  async getStatus() {
    return apiRequest<{ kyc_tier: number; kyc_status: string; verifications: any[] }>(
      '/api/kyc/status'
    );
  },

  /**
   * Start KYC verification
   */
  async startKYC(level: number) {
    return apiRequest<{ verification: any }>('/api/kyc/start', {
      method: 'POST',
      body: JSON.stringify({ level }),
    });
  },

  /**
   * Submit BVN for verification
   */
  async submitBVN(bvn: string, dateOfBirth: string) {
    return apiRequest<{ message: string; verification_id: string }>('/api/kyc/bvn', {
      method: 'POST',
      body: JSON.stringify({ bvn, date_of_birth: dateOfBirth }),
    });
  },

  /**
   * Upload KYC documents
   */
  async uploadDocuments(params: {
    document_type: string;
    document_number: string;
    document_url: string;
    selfie_url?: string;
  }) {
    return apiRequest<{ message: string; verification_id: string }>('/api/kyc/documents', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  },

  /**
   * Complete KYC verification
   */
  async completeKYC() {
    return apiRequest<{ message: string; kyc_tier: number }>('/api/kyc/complete', {
      method: 'POST',
    });
  },

  /**
   * Get KYC limits
   */
  async getLimits() {
    return apiRequest<{ limits: any[] }>('/api/kyc/limits');
  },
};

// ============================================================================
// TRANSACTIONS API
// ============================================================================

export const transactionsApi = {
  /**
   * Get all transactions
   */
  async getAll(type?: 'deposit' | 'offramp', limit?: number) {
    const params = new URLSearchParams();
    if (type) params.append('type', type);
    if (limit) params.append('limit', limit.toString());
    
    return apiRequest<{ transactions: any[] }>(`/api/transactions?${params}`);
  },

  /**
   * Get transaction details
   */
  async getTransaction(id: string) {
    return apiRequest<{ transaction: any }>(`/api/transactions/${id}`);
  },
};

// Export utility functions
export { getAuthToken, setAuthToken, clearAuthToken, ApiError };

